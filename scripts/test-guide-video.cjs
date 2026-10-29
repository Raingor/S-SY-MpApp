// 独立视频讲解：内容适配 + access 鉴权 + 组件（登录/购买/过期/断点）+ 两页入口；全部离线 fixture。
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
let entitlementsReply = [];
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
  createVideoContext: () => ({ stop() { wx._videoStopped = (wx._videoStopped || 0) + 1; } }),
  request(options) {
    requests.push(options.url);
    if (options.url.includes('/api/content')) return options.success({ statusCode: 200, data: metadata });
    if (options.url.includes('/auth/wx-login')) return options.success({ statusCode: 200, data: { accessToken: 'fixture-token-2', user: { id: 'fixture-user', phoneBound: true } } });
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
      return options.success({ statusCode: 200, data: { order: { id: 'order-1', status: options.url.endsWith('simulate-paid') ? 'paid' : 'failed' } } });
    }
    if (/\/api\/miniprogram\/orders\//.test(options.url)) {
      return options.success({ statusCode: 200, data: { order: { id: 'order-1', status: 'paid' } } });
    }
    if (options.url.includes('/entitlements')) return options.success({ statusCode: 200, data: { member: false, unlockedVideos: entitlementsReply } });
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

const VIDEO = {
  id: 'guide-video-acropolis', attractionId: 'acropolis', status: 'published',
  title: '雅典卫城：山顶上的古希腊文明密码', titleTw: '雅典衛城：山頂上的古希臘文明密碼', titleEn: 'Acropolis: the ancient Greek code on the hill',
  description: '从帕特农神庙到山门，看懂卫城建筑的黄金比例。', descriptionEn: 'From the Parthenon to the Propylaea.',
  cover: './images/guide-video-acropolis.webp', durationSeconds: 2375, accessUrl: '/api/miniprogram/video/guide-video-acropolis/access'
};
const draft = { ...VIDEO, id: 'guide-video-draft', status: 'draft' };
const other = { ...VIDEO, id: 'guide-video-other', attractionId: 'delphi', accessUrl: 'relative/bad' };

const PAGE_COPY = {
  sections: {
    overview: { label: { zh: '概况' }, subtitle: { zh: 'OVERVIEW' } }, visitor: { label: { zh: '参观指南' }, subtitle: { zh: 'VISITOR' } },
    highlights: { label: { zh: '必看亮点' }, subtitle: { zh: 'HIGHLIGHTS' } }, audioHow: { label: { zh: '如何使用语音导览' }, subtitle: { zh: 'AUDIO' } },
    route: { label: { zh: '路线导览' }, subtitle: { zh: 'ROUTE' } }, online: { label: { zh: '线上游览' }, subtitle: { zh: 'ONLINE' } }, expert: { label: { zh: '游览攻略' }, subtitle: { zh: 'EXPERT' } }
  },
  audioHow: { steps: [{ zh: '点按节目试听' }], note: { zh: '以现场公告为准' } }
};
const SPOT = {
  id: 'acropolis', name: '雅典卫城', en: 'Acropolis of Athens', city: 'athens', status: 'published', image: './images/spot.webp',
  summary: '概览', category: '古迹', hiddenSections: ['route'],
  highlights: [], exhibits: [{ id: 'point-1', name: '山门', description: '入口', status: 'published' }], routes: [],
  audioGuides: [{ id: 'audioTrack-mv9nwthe-255fb5', category: 'expert', attractionId: 'acropolis', albumId: '', title: '游览攻略', previewUrl: '/api/miniprogram/audio/x/preview', previewSeconds: 28, unlockMode: 'membership', status: 'published' }],
  visitorInfo: {}, visitorInfoSections: [], customSections: [], guide: {}
};
const metadata = {
  countries: [], cities: [/* empty */], attractions: [SPOT], sampleItineraries: [], routes: [], destinations: [],
  audioAlbums: [], guideVideos: [VIDEO, draft, other], settings: {},
  attractionDetailPage: PAGE_COPY, heritageGuideBanners: [], miniprogramServiceEntries: [], vehicleService: null, home: { banners: [] }
};
content.invalidate();

const full = { statusCode: 200, data: { access: 'full', playUrl: 'https://oss.fixture/signed/video.mp4?sig=1', expiresIn: 600, unlockedVia: 'purchase', reason: '' } };
const loginLocked = { statusCode: 200, data: { access: 'locked', reason: 'MINIPROGRAM_LOGIN_REQUIRED' } };
const purchaseLocked = { statusCode: 200, data: { access: 'locked', reason: 'VIDEO_PURCHASE_REQUIRED', product: { productType: 'guideVideo', price: 168, currency: 'CNY', enabled: true } } };

const pageRequire = (id) => id.endsWith('data/content') ? content : id.endsWith('utils/i18n') ? i18n : id.endsWith('audio-access') ? loadModule('utils/audio-access.js') : id.endsWith('paid-content') ? paid : id.endsWith('guide-video') ? guideVideo : id.endsWith('utils/auth') ? loadModule('utils/auth.js') : id.endsWith('utils/navigation') ? { goBack() {} } : id.endsWith('utils/share') ? loadModule('utils/share.js') : {};

async function flush(times = 6) { for (let i = 0; i < times; i++) await Promise.resolve(); }

async function main() {
  // ===== 适配层 =====
  const data = await new Promise((resolve) => content.loadContent(resolve, true)).then((result) => result.data || result);
  assert.deepEqual(content.getGuideVideos(data, 'acropolis').map((v) => v.id), [VIDEO.id], 'only published entries for the matching attraction');
  assert.equal(content.getGuideVideos(data, 'delphi').length, 0, 'bad relative accessUrl is dropped');
  const adapted = content.getGuideVideos(data, 'acropolis')[0];
  assert.equal(adapted.cover, 'https://fixture.invalid/images/guide-video-acropolis.webp');
  assert.equal(adapted.accessUrl, '/api/miniprogram/video/guide-video-acropolis/access');
  assert.ok(!JSON.stringify(content.getGuideVideos(data, 'acropolis')).includes('draft'));

  // ===== 工具：价格校验 + access 归一 =====
  assert.equal(guideVideo.productValid({ productType: 'guideVideo', price: 168, currency: 'CNY' }), true);
  assert.equal(guideVideo.productValid({ productType: 'guideVideo', price: 99, currency: 'CNY' }), false, 'price mismatch rejects purchase entry');
  assert.equal(guideVideo.priceDisplay(purchaseLocked.data.product), '¥168.00');
  accessResponse = { data: { access: 'full', playUrl: 'http://insecure/video.mp4', expiresIn: 600 } };
  await new Promise((resolve) => guideVideo.fetchAccess(VIDEO, (ok, result) => { assert.equal(result.playUrl, '', 'non-HTTPS playUrl is rejected'); resolve(); }));
  accessResponse = { data: { access: 'full', playUrl: 'https://oss.fixture/signed/x.mp4', expiresIn: -5 } };
  await new Promise((resolve) => guideVideo.fetchAccess(VIDEO, (ok, result) => { assert.equal(result.validUntil, -1, 'invalid expiresIn is treated as expired'); resolve(); }));
  accessResponse = { data: { access: 'locked', reason: 'VIDEO_PURCHASE_REQUIRED' } };
  await new Promise((resolve) => guideVideo.fetchAccess(VIDEO, (ok, result) => {
    assert.equal(result.playUrl, '', 'locked responses never keep a playable URL');
    assert.equal(result.product, null, 'product without valid price is not exposed');
    resolve();
  }));

  // ===== 组件：完整门禁/支付/续播生命周期 =====
  let component;
  vm.runInNewContext(read('components/guide-video-sheet/guide-video-sheet.js'), {
    wx, Component(value) { component = value; },
    getApp: () => ({ globalData: { apiBase: 'https://fixture.invalid', auth: { accessToken: '', user: null } } }),
    require: (id) => id.endsWith('utils/auth') ? loadModule('utils/auth.js') : id.endsWith('paid-content') ? paid : id.endsWith('guide-video') ? guideVideo : id.endsWith('utils/i18n') ? i18n : {}
  }, { filename: 'components/guide-video-sheet/guide-video-sheet.js' });
  const createSheet = () => {
    const instance = {
      ...component.methods, properties: { video: null },
      data: { ...structuredClone(component.data) },
      setData(next) { Object.assign(this.data, next); },
      _events: [], triggerEvent(name) { this._events.push(name); }
    };
    return instance;
  };
  let sheet = createSheet();
  storage.delete('sy_mp_access_token');
  accessResponse = loginLocked;
  component.properties.video.observer.call(sheet, { ...adapted });
  await flush();
  assert.equal(sheet.data.state, 'login', 'anonymous access lands on the login gate');
  sheet.onLogin();
  await flush();
  assert.equal(storage.get('sy_mp_access_token'), 'fixture-token-2', 'login stores a fresh session');
  accessResponse = purchaseLocked;
  component.properties.video.observer.call(sheet, { ...adapted });
  await flush();
  assert.equal(sheet.data.state, 'purchase', 'after login the access result drives the purchase gate');
  assert.equal(sheet.data.price, '¥168.00');
  orderResponses.push({ order: { id: 'order-1', status: 'pending' }, payment: { timeStamp: '1', nonceStr: 'n', package: 'p', signType: 'RSA', paySign: 's' } });
  accessResponse = full;
  sheet.onBuy();
  await flush();
  assert.equal(orderCalls, 1);
  assert.equal(payments.length, 1, 'payment sheet opened once');
  assert.equal(sheet.data.state, 'ready');
  assert.equal(sheet.data.playUrl, full.data.playUrl);
  sheet.onTimeUpdate({ detail: { currentTime: 327 } });
  accessResponse = full;
  sheet.onError();
  await flush();
  assert.equal(sheet.data.state, 'ready');
  assert.equal(sheet.data.position, 327, 'resume position survives re-signing');
  assert.equal(accessCalls >= 4, true, 'every re-entry re-authorizes');
  accessResponse = { statusCode: 200, data: { access: 'full', playUrl: 'https://oss.fixture/signed/old.mp4', expiresIn: -5 } };
  sheet.onError();
  await flush();
  assert.equal(sheet.data.state, 'error', 'expired full access becomes the retry state, never a stale playUrl');
  sheet.reload();
  await flush();
  assert.equal(sheet.data.state, 'error');
  orderResponses.push({ order: { id: 'order-1', status: 'pending' }, simulation: true });
  accessResponse = purchaseLocked;
  sheet.onBuy();
  await flush();
  assert.equal(sheet.data.state, 'simulation');
  assert.equal(payments.length, 1, 'simulation orders never open WeChat payment');
  accessResponse = full;
  sheet.onSimulation({ currentTarget: { dataset: { outcome: 'paid' } } });
  await flush();
  assert.equal(sheet.data.state, 'ready');
  sheet.close();
  assert.deepEqual(sheet._events, ['close']);
  component.lifetimes.detached.call(sheet);
  orderResponses.push({ error: 'backend down' });
  accessResponse = purchaseLocked;
  component.properties.video.observer.call(sheet, { ...adapted });
  await flush();
  sheet.onBuy();
  await flush();
  assert.equal(sheet.data.state, 'purchase', 'failed order returns to purchase state with a modal');
  assert.equal(modals.length, 1);
  assert.equal(JSON.stringify(component.data).includes('SECRET'), false);

  // 已购标记：unlockedVideos 命中 → purchased；年会员不含视频。
  entitlementsReply = [VIDEO.id];
  const guideVideoPage = loadModule('utils/guide-video.js');
  assert.equal(guideVideoPage.isPurchased({ unlockedVideos: [VIDEO.id] }, VIDEO.id), true);
  assert.equal(guideVideoPage.isPurchased({ unlockedVideos: [{ videoId: VIDEO.id }] }, VIDEO.id), true);
  assert.equal(guideVideoPage.isPurchased({ member: true, unlockedVideos: [] }, VIDEO.id), false, 'membership alone never marks a video purchased');
  assert.equal(guideVideoPage.isPurchased(null, VIDEO.id), false);

  // ===== 节目页（audio/detail）：入口 + 组件挂载 =====
  let audioDefinition;
  vm.runInNewContext(read('pages/audio/detail.js'), {
    wx, Page(value) { audioDefinition = value; },
    getApp: () => ({ globalData: { apiBase: 'https://fixture.invalid' } }),
    require: pageRequire
  }, { filename: 'pages/audio/detail.js' });
  const audioPage = { ...audioDefinition, data: structuredClone(audioDefinition.data), params: { attractionId: 'acropolis', category: 'expert' }, setData(next) { Object.assign(this.data, next); } };
  audioPage.onLoad({ attractionId: 'acropolis', category: 'expert' });
  await flush();
  assert.deepEqual(audioPage.data.guideVideos.map((v) => v.id), [VIDEO.id]);
  assert.equal(audioPage.data.guideVideos[0].displayTitle, VIDEO.title);
  i18n.setLocale('en'); audioPage.data.locale = 'en'; audioPage.localize();
  assert.equal(audioPage.data.guideVideos[0].displayTitle, VIDEO.titleEn);
  i18n.setLocale('zh-CN'); audioPage.data.locale = 'zh-CN'; audioPage.localize();
  await flush();
  assert.equal(audioPage.data.guideVideos[0].purchased, true, 'unlockedVideos marks the entry as purchased');
  entitlementsReply = [];
  audioPage.markGuideVideoPurchases();
  await flush();
  assert.equal(audioPage.data.guideVideos[0].purchased, false, 'without unlockedVideos the entry shows locked');
  audioPage.onGuideVideoTap({ currentTarget: { dataset: { id: VIDEO.id } } });
  assert.equal(audioPage.data.videoOpen.id, VIDEO.id, 'audio detail passes the video object into the shared sheet component');
  audioPage.onGuideVideoClose();
  assert.equal(audioPage.data.videoOpen, null);
  const audioMarkup = read('pages/audio/detail.wxml');
  assert.match(audioMarkup, /<guide-video-sheet video="\{\{videoOpen\}\}" bind:close="onGuideVideoClose"/);
  assert.match(audioMarkup, /guide-video-section/);
  assert.match(audioMarkup, /guide-video-lock/);
  assert.doesNotMatch(audioMarkup, /videoSheet/, 'legacy inline sheet must be fully removed');

  // ===== 景点详情页：独立视频入口，不依赖已移除的测试攻略栏目 =====
  let spotDefinition;
  vm.runInNewContext(read('pages/attraction/detail.js'), {
    wx, Page(value) { spotDefinition = value; },
    getApp: () => ({ globalData: { apiBase: 'https://fixture.invalid', auth: { accessToken: '', user: null } } }),
    require: (id) => id.endsWith('utils/lead-api') ? { isSuccessfulLeadResponse: () => false, leadErrorMessage: () => 'x' } : pageRequire(id)
  }, { filename: 'pages/attraction/detail.js' });
  const spotPage = { ...spotDefinition, data: structuredClone(spotDefinition.data), setData(next) { Object.assign(this.data, next); } };
  entitlementsReply = [VIDEO.id];
  spotPage.onLoad({ id: 'acropolis' });
  spotPage.loadSpot();
  await flush();
  assert.equal(spotPage.data.loading, false);
  assert.equal(spotPage.data.spot.id, 'acropolis');
  assert.deepEqual(spotPage.data.guideVideos.map((v) => v.id), [VIDEO.id]);
  await flush();
  assert.equal(spotPage.data.guideVideos[0].purchased, true, 'attraction detail also consumes unlockedVideos');
  assert.equal(spotPage.data.pageCopy.sections.expert.hidden, false, 'legacy section config is retained for compatibility');
  assert.equal(spotPage.data.pageCopy.sections.route.hidden, true);
  spotPage.onGuideVideoTap({ currentTarget: { dataset: { id: VIDEO.id } } });
  assert.equal(spotPage.data.videoOpen.id, VIDEO.id, 'independent video entry opens the shared video sheet');
  spotPage.onGuideVideoClose();
  assert.equal(spotPage.data.videoOpen, null);
  const spotMarkup = read('pages/attraction/detail.wxml');
  assert.ok(!spotMarkup.includes('id="section-expert"'), 'test expert section is removed');
  assert.ok(!spotMarkup.includes('data-category="expert"'), 'test audio collection entry is removed');
  const videoTag = spotMarkup.match(/<view\b[^>]*\bid="section-guide-videos"[^>]*>/);
  assert.ok(videoTag, 'videos have an independent section');
  const visibility = videoTag[0].match(/wx:if="\{\{([\s\S]*?)\}\}"/)[1];
  const videoBlock = spotMarkup.slice(spotMarkup.indexOf('id="section-guide-videos"'), spotMarkup.indexOf('class="detail-section related-section"'));
  for (const binding of ['onGuideVideoTap', 'guide-video-poster', 'guide-video-lock']) {
    assert.ok(videoBlock.includes(binding), 'independent video entry: ' + binding);
  }
  assert.ok(spotMarkup.includes('<guide-video-sheet video="{{videoOpen}}" bind:close="onGuideVideoClose"'));
  // Real loadSpot regressions: hidden/missing legacy expert config cannot remove paid videos.
  const originalAttractions = metadata.attractions;
  const originalPageCopy = metadata.attractionDetailPage;
  for (const missingExpert of [false, true]) {
    const pageCopy = structuredClone(PAGE_COPY);
    if (missingExpert) delete pageCopy.sections.expert;
    metadata.attractions = [{ ...SPOT, hiddenSections: ['route', 'expert'] }];
    metadata.attractionDetailPage = pageCopy;
    content.invalidate();
    const independentPage = { ...spotDefinition, data: structuredClone(spotDefinition.data), setData(next) { Object.assign(this.data, next); } };
    independentPage.onLoad({ id: 'acropolis' });
    independentPage.loadSpot();
    await flush();
    assert.equal(independentPage.data.loading, false);
    assert.equal(independentPage.data.contentError, false, 'missing expert copy does not fail the whole detail page');
    assert.equal(independentPage.data.spot.id, 'acropolis');
    assert.deepEqual(independentPage.data.guideVideos.map((v) => v.id), [VIDEO.id]);
    assert.ok(vm.runInNewContext(visibility, independentPage.data), 'paid video section remains visible when expert config is hidden or absent');
    independentPage.onGuideVideoTap({ currentTarget: { dataset: { id: VIDEO.id } } });
    assert.equal(independentPage.data.videoOpen.id, VIDEO.id, 'loaded paid video can still open its authorization sheet');
    independentPage.onGuideVideoClose();
    assert.equal(independentPage.data.videoOpen, null);
  }
  metadata.attractions = originalAttractions;
  metadata.attractionDetailPage = originalPageCopy;
  content.invalidate();
  const posterBlock = videoBlock;
  for (const banned of ['item.displayTitle', 'item.displayDescription', 'item.durationSeconds', 'guide-video-bg']) assert.ok(!posterBlock.includes(banned), 'locked poster leaks no media or backdrop: ' + banned);
  assert.match(posterBlock, /\{\{item\.purchased && item\.cover\}\}/, 'cover image renders only after purchase');
  assert.match(posterBlock, /guide-video-lock/);
  const posterCss = read('pages/attraction/detail.wxss');
  assert.doesNotMatch(posterCss, /filter: blur/, 'no blurred media backdrop for locked state');
  assert.match(posterCss, /\.guide-video-poster \{[^}]*background: #10141B/, 'locked poster is a plain dark tile, not a media preview');
  assert.doesNotMatch(read('pages/audio/detail.wxml'), /durationSeconds \/ 60/, 'audio list minutes are computed in JS, not raw WXML math');
  assert.equal(JSON.parse(read('app.json')).usingComponents['guide-video-sheet'], '/components/guide-video-sheet/guide-video-sheet');
  const sheetMarkup = read('components/guide-video-sheet/guide-video-sheet.wxml');
  assert.match(sheetMarkup, /mode="aspectFill"/);
  assert.doesNotMatch(sheetMarkup, /show-menu-by-longpress="\{\{true\}\}"/);
  // 三语文案齐全。
  for (const locale of ['zh-CN', 'zh-TW', 'en']) {
    const heritage = i18n.getMessages(locale).heritage;
    for (const key of ['guideVideos', 'guideVideoUnlockTitle', 'guideVideoLogin', 'guideVideoLoginCta', 'guideVideoPurchase', 'guideVideoBuyCta', 'guideVideoUnavailable']) assert.ok(heritage[key], locale + ':' + key);
  }
  // 分享隔离：视频 sheet/签名 URL 不入分享预览。
  const { pagePreview } = loadModule('utils/share-preview.js');
  const spec = pagePreview('/pages/audio/detail', { data: { i18n: i18n.getMessages(), locale: 'zh-CN', title: '游览攻略', description: '本集介绍', cover: '/cover.jpg', guideVideos: [{ playUrl: 'https://oss.fixture/signed/video.mp4?sig=1' }], videoOpen: { playUrl: 'SECRET' } } });
  assert.ok(!JSON.stringify(spec).includes('SECRET') && !JSON.stringify(spec).includes('sig=1'), 'video sheet/signed URLs never leak into share previews');
  console.log('PASS: guide videos adapter + shared purchase/authorization sheet + independent video section (hidden/missing expert config) + legacy compatibility + i18n + share isolation');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
