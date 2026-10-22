// Mock-only contract regression: no production HTTP, orders, payments or entitlement writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const plain = (value) => JSON.parse(JSON.stringify(value));
function load(relative, dependencies, globals) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  vm.runInNewContext(`(function(require, module, exports) {\n${source}\n})`, globals, { filename: relative })((name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}
const requests = [];
let payments = 0;
let loggedIn = true;
let orderStatus = 'paid';
let withPayment = true;
let configOk = true;
const products = {
  attraction: { enabled: true, price: 9.9, currency: 'CNY' },
  city: { enabled: true, price: 69.9, currency: 'CNY' },
  // Arbitrary fixture price, not the proposed/production expert price.
  expertTrack: { enabled: true, name: '名导单篇讲解', price: 12.34, currency: 'CNY' },
  annualMembership: { enabled: true, name: '年会员', price: 199, currency: 'CNY' }
};
let rawAccess = {
  id: 'expert-track-1', access: 'preview', unlockMode: 'expert', previewSeconds: 59,
  previewUrl: '/api/miniprogram/audio/expert-track-1/preview', fullUrl: null,
  expiresIn: null, reason: 'AUDIO_ENTITLEMENT_REQUIRED'
};
const wx = {
  getStorageSync: () => 'zh-CN', showToast() {},
  requestPayment(options) { payments++; options.success(); },
  request(options) {
    requests.push(options);
    assert.ok(options.url.startsWith('https://fixture.invalid/api/miniprogram/'), 'all HTTP is mocked');
    let data;
    let statusCode = 200;
    if (options.url.endsWith('/knowledge/config')) {
      statusCode = configOk ? 200 : 503;
      data = { trialSeconds: 60, simulation: false, products };
    } else if (options.url.endsWith('/entitlements')) {
      data = { member: false, unlockedAttractions: ['sight-1'], unlockedCities: ['athens'], unlockedExpertTracks: ['expert-track-1'] };
    } else if (options.url.endsWith('/orders') && options.method === 'POST') {
      data = { simulation: false, order: { id: 'fixture-order', status: 'pending' }, ...(withPayment ? { payment: { timeStamp: '1' } } : {}) };
    } else if (options.url.endsWith('/orders/fixture-order')) {
      data = { order: { id: 'fixture-order', status: orderStatus } };
    } else if (options.url.endsWith('/expert-track-1/access')) {
      data = rawAccess;
    } else {
      throw new Error(`Unexpected mock request: ${options.url}`);
    }
    options.success({ statusCode, data });
  }
};
const auth = {
  getAccessToken: () => loggedIn ? 'fixture-token' : '', isSimulationToken: () => false,
  getUserState(callback) { callback(loggedIn, loggedIn ? { phoneBound: true } : null); }
};
const globals = {
  wx, getApp: () => ({ globalData: { apiBase: 'https://fixture.invalid', contentSettings: {} } }),
  setTimeout(fn) { fn(); return 1; }, clearTimeout() {}
};
const paid = load('utils/paid-content.js', { './auth': auth }, globals);
const access = load('utils/audio-access.js', { './auth': auth, './paid-content': paid }, globals);
const i18n = load('utils/i18n.js', {}, globals);
let pageConfig;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/audio/detail.js'), 'utf8'), {
  ...globals, Page(config) { pageConfig = config; },
  require(name) {
    return {
      '../../data/content': {}, '../../utils/i18n': i18n, '../../utils/audio-access': access,
      '../../utils/paid-content': paid, '../../utils/auth': auth, '../../utils/navigation': { goBack() {} }
    }[name];
  }
});
function makePage(mode = 'expert') {
  return {
    ...pageConfig, data: { ...structuredClone(pageConfig.data), track: { id: 'expert-track-1', unlockMode: mode, previewUrl: '/expert-preview' }, access: { mode, access: 'preview' } },
    params: { attractionId: 'sight-1' }, setData(next) { Object.assign(this.data, next); }
  };
}
const orderPosts = () => requests.filter((item) => item.method === 'POST' && item.url.endsWith('/orders'));
const page = makePage();
page.refreshAccess();
assert.equal(page.data.access.mode, 'expert');
assert.equal(page.data.access.access, 'preview');
assert.equal(page.data.access.fullUrl, '');
page.openUnlockPaywall();
assert.deepEqual(Array.from(page.data.unlockOptions, (item) => item.product), ['expertTrack', 'annualMembership']);
assert.equal(page.data.unlockOptions[0].priceDisplay, '¥12.34', 'expert price comes from config, not 39.8');
assert.match(page.data.unlockOptions[1].description, /真人老师/);
page.onUnlockOptionTap({ currentTarget: { dataset: { product: 'expertTrack' } } });
assert.deepEqual(plain(orderPosts().at(-1).data), { productType: 'expertTrack', trackId: 'expert-track-1' }, 'HTTP body is flat, not target-nested or attraction-based');
assert.equal(payments, 1);
assert.equal(page.data.access.access, 'preview', 'paid result alone never grants local full access');
assert.equal(page.data.purchaseLoading, false);

// Full access is consumed only when explicitly returned by the access API (e.g. annual member).
rawAccess = { ...rawAccess, access: 'full', fullUrl: '/api/miniprogram/audio/expert-track-1/full?token=fixture-signed', expiresIn: 300, reason: null };
page.refreshAccess();
assert.equal(page.data.access.access, 'full');
assert.match(page.data.access.fullUrl, /^https:\/\/fixture\.invalid\/.*token=fixture-signed$/);
assert.ok(page.data.access.fullUrlValidUntil > Date.now());
rawAccess = { ...rawAccess, access: 'preview' }; // Even an accidentally attached fullUrl is ignored.
page.refreshAccess();
assert.equal(page.data.access.fullUrl, '');

// Expired signed URLs must be rechecked; revoked access must not play the stale full source.
const played = [];
page._playSource = (url, full) => played.push({ url, full });
page.data.access = { mode: 'expert', access: 'full', previewUrl: 'https://fixture.invalid/preview', fullUrl: 'https://fixture.invalid/expired', fullUrlValidUntil: Date.now() - 1 };
page.playFull();
assert.equal(played.length, 0, 'revoked access never plays the expired signed source');
assert.equal(page.data.access.access, 'preview');
rawAccess = { ...rawAccess, access: 'full', fullUrl: '/fresh-full?token=renewed', expiresIn: 300 };
page.data.access = { ...page.data.access, fullUrl: 'https://fixture.invalid/expired', fullUrlValidUntil: Date.now() - 1 };
page.playFull();
assert.deepEqual(played, [{ url: 'https://fixture.invalid/fresh-full?token=renewed', full: true }]);
rawAccess = { ...rawAccess, access: 'preview', fullUrl: null };
page.refreshAccess();

// Ordinary attraction/city purchases cannot be submitted from the expert paywall.
const beforeWrongPlan = orderPosts().length;
page.onUnlock('attraction');
page.onUnlock('city');
assert.equal(orderPosts().length, beforeWrongPlan);
page.onUnlock('annualMembership');
assert.deepEqual(plain(orderPosts().at(-1).data), { productType: 'annualMembership' });

// Recheck configuration on tap, even when an old expert option was previously shown.
for (const price of [0, '0', -1, '', null, undefined, 'not-a-number']) {
  products.expertTrack.price = price;
  const before = orderPosts().length;
  page.openUnlockPaywall();
  assert.deepEqual(Array.from(page.data.unlockOptions, (item) => item.product), ['annualMembership']);
  page.onUnlock('expertTrack');
  assert.equal(orderPosts().length, before, `invalid expert price ${price} cannot create an order`);
}
products.expertTrack.price = 12.34;
for (const enabled of [false, undefined]) {
  products.expertTrack.enabled = enabled;
  const before = orderPosts().length;
  page.openUnlockPaywall();
  assert.deepEqual(Array.from(page.data.unlockOptions, (item) => item.product), ['annualMembership']);
  page.onUnlock('expertTrack');
  assert.equal(orderPosts().length, before, 'expert product requires explicit enablement');
}
products.expertTrack.enabled = true;
configOk = false;
page.openUnlockPaywall();
const beforeConfigFailure = orderPosts().length;
page.onUnlock('expertTrack');
assert.equal(orderPosts().length, beforeConfigFailure);
configOk = true;
const beforeLogin = orderPosts().length;
loggedIn = false;
page.onUnlock('expertTrack');
assert.equal(orderPosts().length, beforeLogin);
loggedIn = true;

let entitlements;
paid.fetchEntitlements((ok, value) => { assert.equal(ok, true); entitlements = value; });
assert.deepEqual(Array.from(entitlements.unlockedExpertTracks), ['expert-track-1']);
assert.deepEqual(Array.from(entitlements.unlockedAttractions), ['sight-1']);
// A payment-less response cannot invoke native payment or confer access.
withPayment = false;
const paymentsBefore = payments;
page.onUnlock('expertTrack');
assert.equal(payments, paymentsBefore);
assert.equal(page.data.access.access, 'preview');
for (const locale of ['zh-CN', 'zh-TW', 'en']) {
  const copy = i18n.getMessages(locale).paidContent;
  assert.ok(copy.buyExpert && copy.buyExpertDesc && copy.memberDesc && copy.vipShopBenefits);
}
const lockedPage = makePage('locked');
const beforeLocked = orderPosts().length;
lockedPage.openUnlockPaywall();
lockedPage.onUnlock('annualMembership');
assert.deepEqual(Array.from(lockedPage.data.unlockOptions), []);
assert.equal(orderPosts().length, beforeLocked, 'explicit preview-only content has no unlock purchase');
console.log('PASS: expert contract fixtures, flat order body, configured price, disabled/zero/invalid guards, annual option, server-only playback, entitlement isolation and payment boundary (mock-only)');
