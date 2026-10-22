// Annual-only policy. Every HTTP/audio/payment operation is intercepted by the fixture harness.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness, plain } = require('./helpers/audio-commerce-harness.cjs');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/expert-http-responses.json'), 'utf8'));
const cases = new Map(fixture.cases.map((c) => [c.name, c]));
const config = cases.get('expert_product_default_disabled').response.data;
const metadata = cases.get('public_track_metadata').response.data;
const spot = metadata.attractions[0];
const expert = spot.audioGuides.find((t) => t.category === 'expert');
const ordinary = spot.audioGuides.find((t) => t.category === 'online');
const heritage = metadata.audioAlbums[0].episodes[0];
const products = (p) => Array.from(p.data.unlockOptions, (o) => o.product);

(async () => {
  const h = createHarness(config);
  const commerce = h.load('utils/city-commerce.js', { './paid-content': h.paid });
  const options = commerce.buildPurchaseOptions(config.products, '雅典', h.i18n.getMessages().contentPage);
  assert.deepEqual(Array.from(options, (o) => o.product), ['annualMembership']);
  assert.equal(options[0].priceDisplay, '¥199.00');
  assert.equal(commerce.hasCityAccess({ member: false, unlockedCities: [spot.city] }, spot.city), false);
  assert.equal(commerce.hasCityAccess({ member: true }, 'any-city'), true);
  let shop;
  require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/membership/shop.js'), 'utf8'), {
    Page(value) { shop = value; },
    require(id) { return { '../../utils/i18n': h.i18n, '../../utils/paid-content': h.paid, '../../utils/auth': h.auth, '../../utils/navigation': {} }[id]; }
  });
  shop = { ...shop, data: structuredClone(shop.data), setData(value) { Object.assign(this.data, value); } };
  shop.loadPlans();
  assert.deepEqual(Array.from(shop.data.plans, (p) => p.productType), ['annualMembership']);
  assert.match(shop.data.plans[0].displayPrice, /199/);

  const retired = ['city', 'attraction', 'expertTrack', 'album', 'membership'];
  for (const mode of ['attraction', 'expert', 'membership', 'album', 'free', 'locked']) {
    const p = h.page({ ...ordinary, unlockMode: mode }, spot);
    p.openUnlockPaywall();
    assert.deepEqual(products(p), ['annualMembership'], mode + ': only annual membership');
    assert.equal(p.data.unlockOptions[0].priceDisplay, '¥199.00');
    assert.match(p.data.unlockExplanation, /199.*全平台/);
    const before = h.orderCount();
    for (const product of retired) { p.onUnlock(product); p.createOrder(product); }
    assert.equal(h.orderCount(), before, 'old page actions cannot create retired orders');
  }
  for (const product of retired) h.paid.createOrder(product, { cityId: spot.city }, (ok, result) => {
    assert.equal(ok, false); assert.equal(result.code, 'PAYMENT_PRODUCT_UNAVAILABLE');
  });
  assert.equal(h.orderCount(), 0, 'shared order adapter blocks retired products before HTTP');
  const p = h.page(expert, spot);
  p.openUnlockPaywall();
  await h.replay(cases.get('annual_order_created'), () => p.onUnlockOptionTap({ currentTarget: { dataset: { product: 'annualMembership' } } }));
  assert.deepEqual(plain(h.requests.filter((r) => r.path === '/api/miniprogram/orders').at(-1).body), { productType: 'annualMembership' });
  assert.equal(p.data.access.access, 'preview', 'pending payment grants no local access');
  let rechecks = 0;
  p.refreshAccess = () => { rechecks++; };
  await h.replay(cases.get('annual_payment_confirmed'), () => p.onSimulationPay({ currentTarget: { dataset: { outcome: 'paid' } } }));
  assert.equal(rechecks, 1, 'payment success only rechecks server access');
  assert.equal(p.data.access.access, 'preview');

  // Config changes between render and tap must never cause a different price/product to be sold.
  for (const product of [undefined, { enabled: false, price: 199 }, ...[0, -1, '', null, 'bad', Infinity, 99, 299].map((price) => ({ enabled: true, price })), { enabled: true, price: 199, currency: 'USD' }]) {
    h.config.products.annualMembership = product;
    p.openUnlockPaywall(); assert.deepEqual(products(p), []);
    const before = h.orderCount();
    p.onUnlock('annualMembership');
    h.paid.createOrder('annualMembership', '', (ok) => assert.equal(ok, false));
    assert.equal(h.orderCount(), before);
  }
  h.config = plain(config); h.configOk = false;
  p.openUnlockPaywall(); assert.deepEqual(products(p), []);
  h.configOk = true;
  h.setLoggedIn(false); p.onUnlock('annualMembership');
  assert.equal(p.data.paywallAuthState, 'login'); h.setLoggedIn(true);

  const fullCase = cases.get('annual_purchase_expert_a_full');
  for (const entitlements of [{ member: false }, { member: false, purchases: [spot.id], unlockedCities: [spot.city] }, { member: true, memberExpiresAt: '2000-01-01T00:00:00Z' }]) {
    h.entitlements = entitlements;
    const page = h.page(expert, spot);
    await h.replay(fullCase, () => page.refreshAccess());
    assert.equal(page.data.access.access, 'preview');
    assert.equal(page.data.access.fullUrl, '', 'non-member/expired/legacy purchase cannot use an old full grant');
    page.playPreview(); assert.equal(page.data.fullPlayback, false); page.stop();
  }
  h.entitlementsOk = false; h.entitlements = { member: true };
  await h.replay(fullCase, () => h.access.getAccess(expert.id, (ok, access) => assert.equal(access.fullUrl, '')));
  h.entitlementsOk = true;
  for (const track of [expert, ordinary, heritage]) {
    const c = plain(fullCase); c.request.path = '/api/miniprogram/audio/' + track.id + '/access'; c.response.data.unlockMode = track.unlockMode;
    const page = h.page(track, spot);
    await h.replay(c, () => page.refreshAccess());
    assert.equal(page.data.access.access, 'full');
    page.playPreview(); assert.equal(page.data.fullPlayback, true); page.stop();
  }
  // Being a member alone never manufactures a full grant when access denies it.
  await h.replay(cases.get('after_revocation_expert_preview'), () => h.access.getAccess(expert.id, (ok, access) => {
    assert.equal(access.access, 'preview'); assert.equal(access.fullUrl, '');
  }));
  for (const expiresIn of [undefined, null, 0, -1, 'bad', Infinity]) {
    const c = plain(fullCase); c.response.data.expiresIn = expiresIn;
    const page = h.page(expert, spot);
    await h.replay(c, () => page.refreshAccess());
    assert.equal(page._fullUrlIsFresh(page.data.access), false);
    const before = h.played.length;
    await h.replay(c, () => page.playFull());
    assert.equal(h.played.length, before, 'invalid signature lifetime fails closed');
  }
  for (const locale of ['zh-CN', 'zh-TW', 'en']) {
    const copy = h.i18n.getMessages(locale);
    assert.match(copy.paidContent.memberDesc, /199/);
    assert.match(copy.contentPage.annualPlanDesc, /199/);
    assert.doesNotMatch(copy.contentPage.cityPaywallSubtitle, /本城|this city/);
  }
  assert.equal(h.payments, 0);
  console.log('PASS: annual-only ¥199 sales, retired products blocked, pending payment recheck, preview for nonmembers/expired/old city rights, member signed full access across content, config and TTL fail-safe; no network/payment');
})().catch((error) => { console.error(error); process.exitCode = 1; });
