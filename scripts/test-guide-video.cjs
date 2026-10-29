// 游览攻略视频：内容适配 + access 鉴权 + 购买/登录/过期/断点重鉴权；全部离线 fixture。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const requests = [];
const payments = [];
const toasts = [];
const modals = [];
let accessResponse = null;
let accessCalls = 0;
const orderResponses = [];
let orderCalls = 0;
const storage = new Map([['sy_mp_access_token', 'fixture-token']]);
const wx = {
  getStorageSync: (key) => storage.get(key) || '',
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key),
  getWindowInfo: () => ({ statusBarHeight: 20 }),
  showToast: (o) => toasts.push(o),
  showModal: (o) => modals.push(o),
  requestPayment: (o) => { payments.push(o); o.success(); },
  login: (o) => o.success({ code: 'fixture-code' }),
  request(options) {
    requests.push(options.url);
    if (options.url.includes('/api/content')) return options.success({ statusCode: 200, data: metadata });
    if (options.url.includes('/access')) {
      accessCalls++;
      const respond = accessResponse;
      accessResponse = null;
      if (!respond) return options.success({ statusCode: 500, data: {} });
      if (respond.networkFail) return options.fail({ errMsg: 'fixture offline' });
      return options.success({ statusCode: respond.statusCode || 200, data: respond.data });
    }
    if (options.url.endsWith('/api/miniprogram/orders')) {
      const respond = orderResponses.shift();
      orderCalls++;
      if (!respond) return options.success({ statusCode: 500, data: {} });
      return options.success({ statusCode: 200, data: respond });
    }
    if (/\/api\/miniprogram\/orders\/.+\/simulate-(paid|failed)$/.test(options.url)) {
      const outcome = options.url.endsWith('simulate-paid') ? 'paid' : 'failed';
      return options.success({ statusCode: 200, data: { order: { id: 'order-1', status: outcome } } });
    }
    if (/\/api\/miniprogram\/orders\//.test(options.url)) {
      return options.success({ statusCode: 200, data: { order: { id: 'order-1', status: 'paid' } } });
    }
    if (options.url.includes('/auth/wx-login')) return options.success({ statusCode: 200, data: { accessToken: 'fixture-token-2', user: { id: 'fixture-user', phoneBound: true } } });
    if (options.url.includes('/entitlements')) return options.success({ statusCode: 200, data: { member: false } });
    throw new Error('Unexpected request: ' + options.url);
  }
};
const cache = new Map();
function loadModule(rel, overrides = {}) {
  const file = path.resolve(ROOT, rel.endsWith('.js') ? rel : rel + '.js');
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    module, exports: module.exports, wx, console,
    getApp: () => ({ globalData: { apiBase: 'https://fixture.invalid', contentSettings: {}, auth: { accessToken: '', user: null } } }),
    require: (id) => overrides[id] || loadModule(path.resolve(path.dirname(file), id))
  }, { filename: file });
  return module.exports;
}
const content = loadModule('data/content.js', { './mirror-content': { getContent: () => ({}) } });
const paid = loadModule('utils/paid-content.js');
const guideVideo = loadModule('utils/guide-video.js');
const i18n = loadModule('utils/i18n.js');
loadModule('utils/share-preview.js');

const VIDEO = {
  id: 'guideVideo-mvabc123-0001', attractionId: 'acropolis', status: 'published',
  title: '雅典卫城：山顶上的古希腊文明密码', titleTw: '雅典衛城：山頂上的古希臘文明密碼', titleEn: 'Acropolis: the ancient Greek code on the hill',
  description: '从帕特农神庙到山门，看懂卫城建筑的黄金比例。', descriptionEn: 'From the Parthenon to the Propylaea.',
  cover: './images/guide-video-acropolis.webp', durationSeconds: 2375, accessUrl: '/api/miniprogram/guide-video/guideVideo-mvabc123-0001/access'
};
const draft = { ...VIDEO, id: 'guideVideo-draft', status: 'draft' };
const other = { ...VIDEO, id: 'guideVideo-other', attractionId: 'delphi', accessUrl: 'relative/bad' };

let definition;
vm.runInNewContext(read('pages/audio/detail.js'), {
  wx, Page(value) { definition = value; },
  getApp: () => ({ globalData: { apiBase: 'https://fixture.invalid' } }),
  require: (id) => id.endsWith('data/content') ? content : id.endsWith('utils/i18n') ? i18n : id.endsWith('audio-access') ? loadModule('utils/audio-access.js') : id.endsWith('paid-content') ? paid : id.endsWith('guide-video') ? guideVideo : id.endsWith('utils/auth') ? loadModule('utils/auth.js') : id.endsWith('utils/navigation') ? { goBack() {} } : id.endsWith('utils/share') ? loadModule('utils/share.js') : {}
}, { filename: 'pages/audio/detail.js' });

const metadata = {
  countries: [], cities: [], attractions: [], sampleItineraries: [], routes: [], destinations: [],
  audioAlbums: [], guideVideos: [VIDEO, draft, other], settings: {}
};
content.invalidate();

const createPage = () => {
  const page = { ...definition, data: structuredClone(definition.data), params: { attractionId: 'acropolis', category: 'expert' }, setData(next) { Object.assign(this.data, next); } };
  return page;
};

const full = { statusCode: 200, data: { access: 'full', playUrl: 'https://oss.fixture/signed/video.mp4?sig=1', expiresIn: 600, unlockedVia: 'purchase', reason: '' } };
const loginLocked = { statusCode: 200, data: { access: 'locked', reason: 'MINIPROGRAM_LOGIN_REQUIRED' } };
const purchaseLocked = { statusCode: 200, data: { access: 'locked', reason: 'VIDEO_PURCHASE_REQUIRED', product: { productType: 'guideVideo', price: 168, currency: 'CNY', enabled: true } } };

async function flush(times = 6) { for (let i = 0; i < times; i++) await Promise.resolve(); }

async function main() {
  // ===== 适配层 =====
  const data = await new Promise((resolve) => content.loadContent(resolve, true)).then((result) => result.data || result);
  assert.deepEqual(content.getGuideVideos(data, 'acropolis').map((v) => v.id), [VIDEO.id], 'only published entries for the matching attraction');
  assert.equal(content.getGuideVideos(data, 'delphi').length, 0, 'bad relative accessUrl is dropped');
  assert.equal(content.getGuideVideos(data, '')[0], undefined);
  const adapted = content.getGuideVideos(data, 'acropolis')[0];
  assert.equal(adapted.cover, 'https://fixture.invalid/images/guide-video-acropolis.webp');
  assert.equal(adapted.durationSeconds, 2375);
  assert.equal(adapted.accessUrl, '/api/miniprogram/guide-video/guideVideo-mvabc123-0001/access');
  assert.ok(!JSON.stringify(content.getGuideVideos(data, 'acropolis')).includes('draft'));

  // ===== 工具：价格校验 + access 归一 =====
  assert.equal(guideVideo.productValid({ productType: 'guideVideo', price: 168, currency: 'CNY' }), true);
  assert.equal(guideVideo.productValid({ productType: 'guideVideo', price: 99, currency: 'CNY' }), false, 'price mismatch rejects purchase entry');
  assert.equal(guideVideo.priceDisplay(purchaseLocked.data.product), '¥168.00');
  accessResponse = { networkFail: true };
  await new Promise((resolve) => guideVideo.fetchAccess(VIDEO, (ok) => { assert.equal(ok, false); resolve(); }));
  accessResponse = { data: { access: 'locked', reason: 'VIDEO_PURCHASE_REQUIRED' } };
  await new Promise((resolve) => guideVideo.fetchAccess(VIDEO, (ok, result) => {
    assert.equal(result.playUrl, '', 'locked responses never keep a playable URL');
    assert.equal(result.product, null, 'product without valid price is not exposed');
    resolve();
  }));
  accessResponse = { data: { access: 'full', playUrl: 'http://insecure/video.mp4', expiresIn: 600 } };
  await new Promise((resolve) => guideVideo.fetchAccess(VIDEO, (ok, result) => {
    assert.equal(result.playUrl, '', 'non-HTTPS playUrl is rejected');
    resolve();
  }));
  accessResponse = { data: { access: 'full', playUrl: 'https://oss.fixture/signed/x.mp4', expiresIn: -5 } };
  await new Promise((resolve) => guideVideo.fetchAccess(VIDEO, (ok, result) => {
    assert.equal(result.validUntil, -1, 'full access without valid expiresIn is treated as expired');
    resolve();
  }));

  // ===== 页面 =====
  const page = createPage();
  page.onLoad({ attractionId: 'acropolis', category: 'expert' });
  await flush();
  assert.equal(page.data.loading, false);
  assert.deepEqual(page.data.guideVideos.map((v) => v.id), [VIDEO.id]);
  assert.equal(page.data.guideVideos[0].displayTitle, VIDEO.title);
  i18n.setLocale('en'); page.data.locale = 'en'; page.localize();
  assert.equal(page.data.guideVideos[0].displayTitle, VIDEO.titleEn);
  i18n.setLocale('zh-CN'); page.data.locale = 'zh-CN'; page.localize();

  // 未登录 → 登录态；登录成功后自动重新鉴权。
  storage.delete('sy_mp_access_token');
  accessResponse = loginLocked;
  page.onGuideVideoTap({ currentTarget: { dataset: { id: VIDEO.id } } });
  await flush();
  assert.equal(page.data.videoSheet.state, 'login');
  assert.equal(page.data.videoSheet.video.id, VIDEO.id);
  page.onGuideVideoLogin();
  await flush();
  storage.set('sy_mp_access_token', 'fixture-token');
  accessResponse = purchaseLocked;
  page.onGuideVideoLogin();
  await flush();
  assert.equal(page.data.videoSheet.state, 'purchase', 'after login the access result drives the next state');
  assert.equal(page.data.videoSheet.price, '¥168.00');

  // 购买：下单带 videoId，支付成功后重新鉴权拿到签名 URL。
  orderResponses.push({ order: { id: 'order-1', status: 'pending' }, payment: { timeStamp: '1', nonceStr: 'n', package: 'p', signType: 'RSA', paySign: 's' } });
  accessResponse = full;
  page.onGuideVideoBuy();
  await flush();
  assert.equal(orderCalls, 1);
  assert.match(requests.find((url) => url.endsWith('/api/miniprogram/orders')), /orders$/);
  assert.equal(payments.length, 1, 'payment sheet opened once');
  assert.equal(page.data.videoSheet.state, 'ready');
  assert.equal(page.data.videoSheet.playUrl, full.data.playUrl);

  // 播放中断点记录 → 播放失败重新鉴权换新 URL 并续播。
  page.onGuideVideoTimeUpdate({ detail: { currentTime: 327 } });
  accessResponse = full;
  page.onGuideVideoError();
  await flush();
  assert.equal(page.data.videoSheet.state, 'ready');
  assert.equal(page.data.videoSheet.position, 327, 'resume position survives re-signing');
  assert.equal(accessCalls >= 4, true, 'every re-entry re-authorizes');

  // 签名过期：过期 access 不得直接播放。
  accessResponse = { statusCode: 200, data: { access: 'full', playUrl: 'https://oss.fixture/signed/old.mp4', expiresIn: -5 } };
  page.onGuideVideoError();
  await flush();
  assert.equal(page.data.videoSheet.state, 'error', 'expired full access becomes the retry state, never a stale playUrl');

  // 请求失败 → 错误态 + 重试入口。
  page.reloadGuideVideoAccess();
  await flush();
  assert.equal(page.data.videoSheet.state, 'error');

  // 模拟支付环境：不出真实支付，模拟成功后重新鉴权。
  orderResponses.push({ order: { id: 'order-1', status: 'pending' }, simulation: true });
  accessResponse = purchaseLocked;
  page.onGuideVideoBuy();
  await flush();
  assert.equal(page.data.videoSheet.state, 'simulation');
  assert.equal(payments.length, 1, 'simulation orders never open WeChat payment');
  accessResponse = full;
  page.onGuideVideoSimulation({ currentTarget: { dataset: { outcome: 'paid' } } });
  await flush();
  assert.equal(page.data.videoSheet.state, 'ready');

  // 关闭与复入：清空 sheet；重新点按重置状态。
  page.closeVideoSheet();
  assert.equal(page.data.videoSheet, null);
  accessResponse = full;
  page.onGuideVideoTap({ currentTarget: { dataset: { id: VIDEO.id } } });
  await flush();
  assert.equal(page.data.videoSheet.state, 'ready');
  page.closeVideoSheet();
  page.onBack();
  assert.equal(page.data.videoSheet, null, 'back navigation closes the video sheet');

  // 支付失败/取消分支。
  accessResponse = purchaseLocked;
  page.onGuideVideoTap({ currentTarget: { dataset: { id: VIDEO.id } } });
  await flush();
  orderResponses.push({ error: 'backend down' });
  page.onGuideVideoBuy();
  await flush();
  assert.equal(page.data.videoSheet.state, 'purchase', 'failed order returns to purchase state with a modal');
  assert.equal(modals.length, 1);
  page.closeVideoSheet();

  // 无关页面数据零污染：分享预览不含视频签名 URL；guideVideos 不进分享卡。
  const { pagePreview } = loadModule('utils/share-preview.js');
  const spec = pagePreview('/pages/audio/detail', { data: { i18n: i18n.getMessages(), locale: 'zh-CN', title: '游览攻略', description: '本集介绍', cover: '/cover.jpg', guideVideos: [{ playUrl: 'https://oss.fixture/signed/video.mp4?sig=1' }], videoSheet: { playUrl: 'SECRET' } } });
  assert.ok(!JSON.stringify(spec).includes('SECRET') && !JSON.stringify(spec).includes('sig=1'), 'video sheet/signed URLs never leak into share previews');
  // 三语文案齐全。
  for (const locale of ['zh-CN', 'zh-TW', 'en']) {
    const heritage = i18n.getMessages(locale).heritage;
    for (const key of ['guideVideos', 'guideVideoLogin', 'guideVideoLoginCta', 'guideVideoPurchase', 'guideVideoBuyCta', 'guideVideoUnavailable']) assert.ok(heritage[key], locale + ':' + key);
  }
  // WXML/注册契约。
  const markup = read('pages/audio/detail.wxml');
  for (const binding of ['guide-video-section', 'onGuideVideoTap', 'videoSheet.state', 'onGuideVideoBuy', 'onGuideVideoLogin', 'onGuideVideoError', 'closeVideoSheet', 'initial-time']) assert.ok(markup.includes(binding));
  assert.match(read('pages/audio/detail.wxss'), /\.guide-video-mask/);
  console.log('PASS: guide videos adapter + access gating (login/purchase/price check) + payment with videoId + simulation + resume re-signing + expiry fail-safe + i18n + share isolation');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
