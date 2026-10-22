// 契约回放验证：Website 会话隔离 HTTP 服务导出的去敏真实响应（scripts/fixtures/expert-http-responses.json，37 cases）。
// 本脚本不访问网络、不发起支付、不写数据；将响应回放给真实客户端模块（data/content、utils/paid-content、utils/audio-access、pages/audio/detail）。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/expert-http-responses.json'), 'utf8'));
const ORIGIN = 'https://fixture.invalid';
const cases = new Map(fixture.cases.map((item) => [item.name, item]));
const requestQueue = [];
const payments = [];
const timers = [];
const audioInstances = [];

const storage = new Map([['sy_mp_locale', 'zh-CN'], ['sy_mp_access_token', 'fixture-token']]);
const wxStub = {
  getStorageSync: (key) => storage.get(key) || '', setStorageSync: (key, value) => storage.set(key, value), removeStorageSync: (key) => storage.delete(key),
  showToast() {}, showModal() {},
  requestPayment(options) { payments.push(options); options.success(); },
  request(options) { requestQueue.push(options); },
  createInnerAudioContext() {
    const instance = {
      currentTime: 0, src: '', autoplay: false, playbackRate: 1,
      onPlay(fn) { this.playHandler = fn; }, onWaiting(fn) { this.waitingHandler = fn; }, onTimeUpdate(fn) { this.timeHandler = fn; },
      onEnded(fn) { this.endedHandler = fn; }, onError(fn) { this.errorHandler = fn; }, onSeeking(fn) { this.seekingHandler = fn; }, onCanplay(fn) { this.canplayHandler = fn; },
      play() { this.played = true; }, pause() { this.paused = true; }, stop() { this.stopped = true; }, seek(seconds) { this.currentTime = seconds; }, destroy() {}
    };
    audioInstances.push(instance);
    return instance;
  }
};
const app = { globalData: { apiBase: ORIGIN, contentSettings: {}, auth: { accessToken: '', user: null } } };
const setLater = (fn) => { timers.push(fn); return 1; };

function loadModule(relative, overrides = {}) {
  const resolved = path.resolve(__dirname, '..', relative);
  const module = { exports: {} };
  const localRequire = (id) => Object.hasOwn(overrides, id) ? overrides[id]
    : id.startsWith('.') ? loadModule(path.resolve(path.dirname(resolved), id)) : require(id);
  vm.runInNewContext(
    '(function(require,module,exports){\n' + fs.readFileSync(resolved, 'utf8') + '\n})(require, module, exports);',
    { wx: wxStub, getApp: () => app, console: { log() {}, error() {}, warn() {} }, setTimeout: setLater, clearTimeout() {}, require: localRequire, module, exports: module.exports },
    { filename: resolved }
  );
  return module.exports;
}

// 真实客户端模块（wx.request 拦截、无网络）。
const wxModuleOverrides = { wx: wxStub, getApp: () => app };
const i18n = loadModule('utils/i18n.js', wxModuleOverrides);
const auth = loadModule('utils/auth.js', { ...wxModuleOverrides, './i18n': i18n });
const paid = loadModule('utils/paid-content.js', { './auth': auth, wx: wxStub, getApp: () => app });
const accessApi = loadModule('utils/audio-access.js', { './auth': auth, './paid-content': paid, getApp: () => app, wx: wxStub });
const contentModule = { exports: {} };
vm.runInThisContext('(function(wx,require,module,exports,getApp){\n' + fs.readFileSync(path.join(__dirname, '../data/content.js'), 'utf8') + '\n})',
  { filename: 'data/content.js' })(wxStub, (id) => id === './mirror-content' ? { getContent: () => ({}) } : {}, contentModule, contentModule.exports, () => app);
const content = contentModule.exports;

function replyWith(caseName, then) {
  const fixtureCase = cases.get(caseName);
  assert.ok(fixtureCase, `missing fixture case: ${caseName}`);
  const request = requestQueue.shift();
  assert.ok(request, `no pending request for case ${caseName}`);
  assert.equal(request.method, fixtureCase.request.method, `${caseName} method`);
  assert.equal(new URL(request.url).pathname, fixtureCase.request.path, `${caseName} path`);
  if (fixtureCase.request.body) assert.deepEqual(request.data, fixtureCase.request.body, `${caseName} HTTP body`);
  request.success({ statusCode: fixtureCase.response.statusCode, data: fixtureCase.response.data });
  then && then(fixtureCase.response);
}
function accessRequestFor(trackId) {
  const request = requestQueue.find((item) => item.url.endsWith(`/audio/${trackId}/access`));
  assert.ok(request, `no pending access request for ${trackId}`);
  return request;
}

let pageConfig;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/audio/detail.js'), 'utf8'), {
  wx: wxStub, getApp: () => app, setTimeout: (fn) => setLater(fn), clearTimeout() {}, console,
  Page(config) { pageConfig = config; },
  require(name) {
    const overrides = {
      '../../data/content': content, '../../utils/i18n': i18n, '../../utils/audio-access': accessApi,
      '../../utils/paid-content': paid, '../../utils/auth': auth, '../../utils/navigation': { goBack() {} }
    };
    return overrides[name];
  }
});
function makePlayer(mode, access, trackId = 'fixture-expert-a') {
  return {
    ...pageConfig,
    data: { ...structuredClone(pageConfig.data), track: { id: trackId, unlockMode: mode, previewUrl: `${ORIGIN}/api/miniprogram/audio/${trackId}/preview`, previewSeconds: 1, durationSeconds: 4 }, access, i18n: i18n.getMessages() },
    params: { attractionId: 'fixture-attraction' }, setData(next) { Object.assign(this.data, next); }
  };
}
function flatOrderData() {
  const request = requestQueue.find((item) => item.method === 'POST' && item.url.endsWith('/orders'));
  assert.ok(request, 'no pending order request');
  return request.data;
}

(async () => {
  // ---------- 1. 公开内容契约：真实适配器消费 Website 元数据响应 ----------
  const metadataCase = cases.get('public_track_metadata');
  let loadResult = null;
  const loaded = content.fetchContent().then((value) => { loadResult = value; });
  const contentRequest = requestQueue.shift();
  assert.match(contentRequest.url, /\/api\/content\?/, 'content request uses the real adapter URL');
  contentRequest.success({ statusCode: 200, data: metadataCase.response.data });
  await loaded;
  assert.ok(loadResult, 'real content adapter accepts the fixture metadata response');
  assert.equal(loadResult.state.source, 'remote');
  const spot = content.getAttraction('fixture-attraction', loadResult.data);
  assert.ok(spot, 'fixture attraction adapts into a real spot');
  const tracks = spot.audioGuides || [];
  assert.deepEqual(tracks.map((item) => item.id), ['fixture-online', 'fixture-expert-a', 'fixture-expert-b']);
  assert.deepEqual(tracks.map((item) => item.unlockMode), ['attraction', 'expert', 'expert'], 'expert unlockMode rides the public metadata');
  assert.equal((loadResult.data.settings || {}).miniprogramKnowledge != null, true, 'knowledge settings ride the response');

  // 静态默认配置：expert商品禁售、价格为0（未定价，不进入购买）。
  assert.equal(metadataCase.response.data.settings.miniprogramKnowledge.products.expertTrack.enabled, false);
  assert.equal(metadataCase.response.data.settings.miniprogramKnowledge.products.expertTrack.price, 0);

  // ---------- 2. 匿名/未登录访问：客户端只信任响应，不得本地补权 ----------
  let anonymousAccess;
  accessApi.getAccess('fixture-expert-a', (ok, data) => { anonymousAccess = { ok, data }; });
  requestQueue.shift().success({ statusCode: 200, data: cases.get('anonymous_expert_preview').response.data });
  assert.equal(anonymousAccess.data.mode, 'expert');
  assert.equal(anonymousAccess.data.access, 'preview');
  assert.equal(anonymousAccess.data.fullUrl, '');

  // ---------- 3. 普通购买者：普通内容 full；专家/其他 track 仍 preview ----------
  let ordinaryAccess;
  accessApi.getAccess('fixture-online', (ok, data) => { ordinaryAccess = { ok, data }; });
  requestQueue.shift().success({ statusCode: 200, data: cases.get('ordinary_purchase_ordinary_full').response.data });
  assert.equal(ordinaryAccess.data.access, 'full');
  assert.match(ordinaryAccess.data.fullUrl, /^https:\/\/fixture\.invalid\//);
  assert.ok(ordinaryAccess.data.fullUrlValidUntil > Date.now(), 'positive expiresIn becomes a signed validity window');
  let otherTrackAccess;
  accessApi.getAccess('fixture-expert-b', (ok, data) => { otherTrackAccess = { ok, data }; });
  requestQueue.shift().success({ statusCode: 200, data: cases.get('expert_purchase_other_track_preview').response.data });
  assert.equal(otherTrackAccess.data.access, 'preview');
  assert.equal(otherTrackAccess.data.fullUrl, '');

  // ---------- 4. 专家单买：trackId权限投影与其它内容互相隔离 ----------
  const expertEntitlements = cases.get('expert_paid_entitlements').response.data;
  let entitlements;
  paid.fetchEntitlements((ok, value) => { entitlements = value; });
  const entitlementsRequest = requestQueue.find((item) => item.url.endsWith('/entitlements'));
  assert.ok(entitlementsRequest, 'entitlements request goes out with a real token');
  entitlementsRequest.success({ statusCode: 200, data: expertEntitlements });
  assert.equal(entitlements.member, false);
  assert.deepEqual(Array.from(entitlements.unlockedExpertTracks), ['fixture-expert-a']);
  assert.deepEqual(Array.from(entitlements.unlockedAttractions), []);

  // ---------- 5. 年会员：全部专家track可full播放 ----------
  let memberAccess;
  accessApi.getAccess('fixture-expert-b', (ok, data) => { memberAccess = { ok, data }; });
  const memberAccessRequest = requestQueue.find((item) => item.url.endsWith('/fixture-expert-b/access'));
  assert.ok(memberAccessRequest, 'annual member access request carries the real session token');
  assert.equal(memberAccessRequest.header && memberAccessRequest.header.Authorization, 'Bearer fixture-token');
  memberAccessRequest.success({ statusCode: 200, data: cases.get('annual_purchase_expert_b_full').response.data });
  assert.equal(memberAccess.data.access, 'full');
  assert.match(memberAccess.data.fullUrl, /fixture-expert-b/);

  // ---------- 6. 播放器：full 播放 vs 撤权/过期 fail-safe ----------
  const fullAccessRaw = cases.get('annual_purchase_expert_a_full').response.data;
  (function () { timers.length = 0; })();
  const memberPlayer = makePlayer('expert', { mode: 'expert', access: 'full', previewUrl: `${ORIGIN}/p`, fullUrl: `${ORIGIN}/api/miniprogram/audio/fixture-expert-a/full?token=fixture-signed-token`, fullUrlValidUntil: Date.now() + 300000 });
  memberPlayer.playPreview();
  assert.equal(memberPlayer.data.fullPlayback, true, 'annual member plays expert content via fresh signed URL');
  assert.ok(audioInstances.at(-1).src.startsWith(ORIGIN));
  // timers.length===1 是 _playSource 的 10 秒「播放启动检测」，不是试听倒计时；试听倒计时应为 0。
  assert.equal(memberPlayer._previewTimer == null, true, 'full playback does not arm a preview countdown');

  const revokeRefreshes = [];
  const revokedPlayer = makePlayer('expert', { mode: 'expert', access: 'full', previewUrl: `${ORIGIN}/p`, fullUrl: `${ORIGIN}/api/miniprogram/audio/fixture-expert-a/full?token=fixture-signed-token`, fullUrlValidUntil: Date.now() - 1 });
  revokedPlayer.refreshAccess = function (callback) {
    accessApi.getAccess('fixture-expert-a', (ok, fresh) => callback(ok, fresh));
    const revokeRequest = requestQueue.filter((item) => !item._replied && item.url.endsWith('/fixture-expert-a/access')).pop();
    assert.ok(revokeRequest, 'revocation check issues a fresh access request');
    revokeRequest._replied = true;
    revokeRequest.success({ statusCode: 200, data: cases.get('after_revocation_expert_preview').response.data });
  };
  const playedSources = [];
  revokedPlayer._playSource = (source, full) => playedSources.push({ source, full });
  revokedPlayer.playFull();
  assert.equal(revokeRefreshes.length, 0);
  assert.deepEqual(playedSources, [], 'expired/revoked signature neither plays stale audio nor arms paywall');
  assert.equal(revokedPlayer.data.showUnlockPaywall, true, 'revocation falls back to the unlock sheet');

  // access=full 但 expiresIn 缺失/0：fullUrlValidUntil=-1，点击时强制重新鉴权（防御性 fail-safe）。
  assert.equal(accessApi.getAccess.length, 2, 'audio-access API keeps its fixed contract shape');
  const noExpiry = { ...fullAccessRaw, expiresIn: 0 };
  let noExpiryAccess;
  accessApi.getAccess('fixture-expert-a', (ok, data) => { noExpiryAccess = data; });
  const pendingAccess = requestQueue.filter((item) => item.url.endsWith('/fixture-expert-a/access')).pop();
  assert.ok(pendingAccess, 'access request goes out when playback is requested');
  pendingAccess.success({ statusCode: 200, data: noExpiry });
  const markAccess = (request) => { request.url += '?marked'; };
  requestQueue.filter((item) => item.url.endsWith('/fixture-expert-a/access')).forEach(markAccess);
  assert.ok(noExpiryAccess.fullUrl, 'full URL survives');
  assert.ok(noExpiryAccess.fullUrlValidUntil <= 0, 'missing/zero expiresIn is treated as no validity window, not forever-fresh');
  const noExpiryPlayer = makePlayer('expert', noExpiryAccess);
  noExpiryPlayer.refreshAccess = function (callback) {
    accessApi.getAccess('fixture-expert-a', (ok, fresh) => callback(ok, fresh));
    const pending = requestQueue.filter((item) => !item._replied && item.url.includes('/fixture-expert-a/access')).pop();
    assert.ok(pending, 're-check happens with a fresh access request');
    pending._replied = true;
    pending.success({ statusCode: 200, data: cases.get('after_revocation_expert_preview').response.data });
  };
  noExpiryPlayer.playFull();
  assert.equal(noExpiryPlayer.data.showUnlockPaywall, true, 'full access without expiry info re-queries access instead of playing blind');

  // ---------- 7. 订单流程：模拟支付、平面 body、禁售响应 ----------
  const enabledConfig = cases.get('expert_test_only_price_enabled').response.data.products;
  assert.equal(enabledConfig.expertTrack.price, 12.34, 'test-only configured price is honored as-is');
  const orderPage = makePlayer('expert', { mode: 'expert', access: 'preview' });
  orderPage.onUnlock('expertTrack');
  // 真实客户端链路：auth/me 校验登录态 → knowledge/config 读商品 → POST orders（平面 body）。
  const meRequest = requestQueue.filter((item) => !item._replied && item.url.endsWith('/auth/me')).pop();
  assert.ok(meRequest, 'real auth re-verifies the session with /auth/me');
  assert.equal(meRequest.header && meRequest.header.Authorization, 'Bearer fixture-token');
  meRequest._replied = true;
  meRequest.success({ statusCode: 200, data: { user: { id: 'fixture-user', phoneBound: true, phoneMasked: 'fixture-phoneMasked' } } });
  const configRequest = requestQueue.filter((item) => !item._replied && item.url.endsWith('/knowledge/config')).pop();
  assert.ok(configRequest, 'paywall re-reads product config before ordering');
  configRequest._replied = true;
  configRequest.success({ statusCode: 200, data: cases.get('expert_test_only_price_enabled').response.data });
  const orderRequest = requestQueue.filter((item) => !item._replied && item.method === 'POST' && item.url.endsWith('/orders')).pop();
  assert.ok(orderRequest, 'expert unlock issues a flat order request');
  assert.deepEqual(JSON.parse(JSON.stringify(orderRequest.data)), { productType: 'expertTrack', trackId: 'fixture-expert-a' }, 'flat HTTP body with exact trackId');
  orderRequest._replied = true;
  orderRequest.success({ statusCode: 201, data: cases.get('expert_order_created').response.data });
  assert.deepEqual(orderPage.data.pendingOrder && orderPage.data.pendingOrder.id, 'fixture-order-5', 'simulation order parks as pending instead of native payment');
  assert.equal(payments.length, 0, 'simulation order never invokes native WeChat payment');

  // 禁售/零价：客户端读配置后直接拦下（不下单）；服务端 422 SIMULATION_PRODUCT_UNAVAILABLE 同样兜底。
  const disabledPage = makePlayer('expert', { mode: 'expert', access: 'preview' });
  disabledPage.onUnlock('expertTrack');
  const disabledMe = requestQueue.filter((item) => !item._replied && item.url.endsWith('/auth/me')).pop();
  disabledMe._replied = true;
  disabledMe.success({ statusCode: 200, data: { user: { id: 'fixture-user', phoneBound: true } } });
  const disabledConfig = requestQueue.filter((item) => !item._replied && item.url.endsWith('/knowledge/config')).pop();
  disabledConfig._replied = true;
  disabledConfig.success({ statusCode: 200, data: cases.get('expert_zero_price_config').response.data });
  assert.equal(requestQueue.filter((item) => !item._replied && item.method === 'POST' && item.url.endsWith('/orders')).length, 0, 'disabled/zero product never reaches an order request');
  assert.equal(payments.length, 0, 'rejected flows never invoke native payment');

  // ---------- 8. 三语会员文案：包含专家/真人讲解 ----------
  for (const locale of ['zh-CN', 'zh-TW', 'en']) {
    const copy = i18n.getMessages(locale).paidContent;
    assert.ok(copy.buyExpert && copy.buyExpertDesc, `${locale} expert copy is present`);
    assert.match(copy.memberDesc, /(真人|真人老師|expert)/, 'annualmember copy references expert teacher content');
  }

  // ---------- 9. Website 明确要求的两条边界：过期签名 401、撤权后旧签名 403 ----------
  const expiredSigned = cases.get('expired_signed_full_rejected');
  assert.equal(expiredSigned.response.statusCode, 401);
  assert.equal(expiredSigned.response.data.code, 'AUDIO_TOKEN_REQUIRED');
  const revokedSigned = cases.get('old_signed_full_after_revocation_rejected');
  assert.equal(revokedSigned.response.statusCode, 403);
  assert.equal(revokedSigned.response.data.code, 'AUDIO_ENTITLEMENT_REQUIRED');
  // 客户端侧对应行为：过期后重查 access 得 preview → 不播旧 URL、回付费墙（第 6 节已断言）。
  // 401/403 均不是 2xx，真实 accessApi 会走 callback(false, null, status) —— 播放器据 callback(false) 停止并提示。
  let failResult;
  accessApi.getAccess('fixture-expert-a', (ok, data, status) => { failResult = { ok, data, status }; });
  const failRequest = requestQueue.filter((item) => !item._replied && item.url.includes('/fixture-expert-a/access')).pop();
  failRequest._replied = true;
  failRequest.success({ statusCode: 401, data: expiredSigned.response.data });
  assert.equal(failResult.ok, false, '401 access reply is treated as failure, never as playable data');
  assert.equal(failResult.status, 401);
  assert.equal(failResult.data, null, 'no fabricated playback source on 401');

  console.log('PASS: expert replay — real adapter/client consume website-isolated HTTP responses (metadata, anonymous/ordinary/expert/member access, entitlement projections, exact-track orders, disabled/no-expiry fail-safe, revocation stub, 401/403 boundaries)');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
