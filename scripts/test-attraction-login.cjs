// Offline regression: guest footer, invalid sessions, and late responses after re-login.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function harness(token = '') {
  const storage = new Map();
  const pending = [];
  const app = { globalData: { apiBase: 'https://fixture.invalid', auth: { accessToken: '', user: null } } };
  const wx = {
    getStorageSync: (key) => storage.get(key) || '',
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
    request: (options) => pending.push(options),
    getWindowInfo: () => ({ statusBarHeight: 20 }),
    switchTab: ({ url }) => { wx.destination = url; }
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    vm.runInNewContext(read(file), { module, exports: module.exports, wx, getApp: () => app,
      require: (id) => load(path.posix.join(path.posix.dirname(file), id + '.js'))
    }, { filename: file });
    return module.exports;
  }
  const auth = load('utils/auth.js');
  const paid = load('utils/paid-content.js');
  const i18n = load('utils/i18n.js');
  if (token) auth.saveSession(token, { id: token, nickname: 'Tester' });
  let definition;
  vm.runInNewContext(read('pages/attraction/detail.js'), { wx, getApp: () => app, Page: (p) => { definition = p; },
    require: (id) => id.endsWith('/auth') ? auth : id.endsWith('/paid-content') ? paid : id.endsWith('/i18n') ? i18n :
      id.endsWith('/guide-video') ? load('utils/guide-video.js') : {}
  });
  const page = { ...definition, data: structuredClone(definition.data), setData(next) { Object.assign(this.data, next); } };
  page.onLoad({ id: 'acropolis' });
  return { auth, paid, i18n, page, pending, storage, app, wx };
}

// Current-token 401 clears storage and memory; subsequent reload does not repeat the request.
let h = harness('expired');
h.page.data.spot = { id: 'acropolis', videoUrl: 'legacy-fixture' };
h.page.data.guideVideos = [{ id: 'video', cover: 'public-cover' }];
h.page.loadPaidState();
assert.equal(h.pending.filter((r) => r.url.endsWith('/entitlements')).length, 1, 'one entitlement request for both video kinds');
h.pending.find((r) => r.url.endsWith('/entitlements')).success({ statusCode: 401, data: {} });
assert.equal(h.auth.getAccessToken(), '');
assert.equal(h.auth.getCachedUser(), null);
assert.equal(h.app.globalData.auth.accessToken, '');
assert.equal(h.page.data.isLoggedIn, false);
const before = h.pending.length;
h.paid.fetchEntitlements((ok) => assert.equal(ok, false));
assert.equal(h.pending.length, before, 'anonymous reload skips protected request');

// A valid account without purchases, server failures, and transport errors never mean logout.
for (const status of [200, 403, 500, 'network']) {
  h = harness('valid');
  h.page.data.spot = { id: 'acropolis' };
  h.page.data.guideVideos = [{ id: 'video' }];
  h.page.loadPaidState();
  const request = h.pending[0];
  if (status === 'network') request.fail({ errMsg: 'offline' });
  else request.success({ statusCode: status, data: { member: false, unlockedVideos: [] } });
  assert.equal(h.auth.getAccessToken(), 'valid', String(status));
  assert.equal(h.page.data.isLoggedIn, true, String(status));
  assert.equal(h.page.data.guideVideos[0].purchased, false);
}

// Neither a late 401 nor a late successful response may affect a new login/account.
for (const status of [401, 200]) {
  h = harness('old');
  let result;
  h.paid.fetchEntitlements((ok, data) => { result = { ok, data }; });
  h.auth.saveSession('new', { id: 'new', nickname: 'New user' });
  h.pending[0].success({ statusCode: status, data: { member: true, unlockedVideos: ['old-account-video'] } });
  assert.equal(h.auth.getAccessToken(), 'new');
  assert.equal(h.auth.getCachedUser().id, 'new');
  assert.equal(result.ok, false);
  assert.equal(result.data.member, false, 'discard old account entitlements');
}

// /auth/me follows the same rule: only current-token 401 invalidates a session.
for (const status of [401, 500, 'network']) {
  h = harness('valid');
  h.auth.fetchMe(() => {});
  if (status === 'network') h.pending[0].fail({ errMsg: 'offline' });
  else h.pending[0].success({ statusCode: status, data: {} });
  assert.equal(h.auth.getAccessToken(), status === 401 ? '' : 'valid');
}
for (const status of [401, 200]) {
  h = harness('old'); h.auth.fetchMe(() => {});
  h.auth.saveSession('new', { id: 'new', nickname: 'New user' });
  h.pending[0].success({ statusCode: status, data: { user: { id: 'old' } } });
  assert.equal(h.auth.getAccessToken(), 'new');
  assert.equal(h.auth.getCachedUser().id, 'new');
}

// Simulation config failures keep the session, and old config responses cannot erase a new login.
for (const outcome of ['network', 'disabled', 'changed']) {
  h = harness('sim-old'); h.paid.fetchEntitlements(() => {});
  if (outcome === 'changed') h.auth.saveSession('new', { id: 'new' });
  if (outcome === 'network') h.pending[0].fail({ errMsg: 'offline' });
  else h.pending[0].success({ statusCode: 200, data: { simulation: false } });
  assert.equal(h.auth.getAccessToken(), outcome === 'network' ? 'sim-old' : outcome === 'changed' ? 'new' : '');
}

// Footer lifecycle and CTA, independent of membership/purchase status.
h = harness();
h.page.data.spot = { id: 'acropolis' };
h.page.loadSpot = () => {};
h.page.data.spot = null; // avoid content refresh in this lifecycle-only check
h.auth.saveSession('signed-in', { id: 'member' });
h.page.onShow(); assert.equal(h.page.data.isLoggedIn, true, 'returning from login hides notice');
h.auth.clearSession(); h.page.onShow(); assert.equal(h.page.data.isLoggedIn, false);
h.page.onLoginTap(); assert.equal(h.wx.destination, '/pages/profile/profile');
const markup = read('pages/attraction/detail.wxml');
const visible = markup.match(/<view wx:if="\{\{([^}]+)\}\}" class="spot-login-bar"/)[1];
const guest = { spot: {}, isLoggedIn: false, showPurchaseModal: false, highlightPreview: null, mapZoomOpen: false, videoOpen: null };
assert.equal(Boolean(vm.runInNewContext(visible, guest)), true);
for (const key of ['isLoggedIn', 'showPurchaseModal', 'highlightPreview', 'mapZoomOpen', 'videoOpen']) {
  assert.equal(Boolean(vm.runInNewContext(visible, { ...guest, [key]: true })), false, 'footer hidden for ' + key);
}
assert.equal(Boolean(vm.runInNewContext(visible, { ...guest, spot: null })), false);
for (const [locale, text] of [['zh-CN', '尚未登录'], ['zh-TW', '尚未登入'], ['en', 'Not logged in']]) {
  assert.equal(h.i18n.getMessages(locale).heritage.notLoggedIn, text);
  assert.ok(h.i18n.getMessages(locale).heritage.loginAction);
}
const css = read('pages/attraction/detail.wxss');
assert.match(css, /\.spot-login-bar \{[^}]*position: fixed[^}]*safe-area-inset-bottom/);
assert.match(css, /\.spot-page-guest \{[^}]*padding-bottom:[^}]*safe-area-inset-bottom/);
console.log('PASS: guest footer + login return + modal suppression + 401 invalidation + no-token skip + network preservation + stale-response isolation + 3 locales');
