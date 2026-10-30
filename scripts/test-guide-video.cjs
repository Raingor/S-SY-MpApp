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
const navigation = [];
let accessResponse = null;
let accessCalls = 0;
const orderResponses = [];
let orderCalls = 0;
let entitlementsReply = [];
let contentFailure = false;
const storage = new Map([['sy_mp_access_token', 'fixture-token']]);
const wx = {
  getStorageSync: (key) => storage.get(key) || '',
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key),
  getWindowInfo: () => ({ statusBarHeight: 20 }),
  navigateTo: (options) => navigation.push(options.url),
  showToast: (o) => toasts.push(o),
  showModal: (o) => modals.push(o),
  requestPayment: (o) => { payments.push(o); o.success(); },
  login: (o) => o.success({ code: 'fixture-code' }),
  createVideoContext: () => ({ stop() { wx._videoStopped = (wx._videoStopped || 0) + 1; }, play() { wx._videoPlayed = (wx._videoPlayed || 0) + 1; }, pause() { wx._videoPaused = (wx._videoPaused || 0) + 1; } }),
  request(options) {
    requests.push(options.url);
    if (options.url.includes('/api/content')) return contentFailure ? options.fail({ errMsg: 'offline' }) : options.success({ statusCode: 200, data: metadata });
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
      _events: [], triggerEvent(name, detail) { this._events.push(name); if (this._onEvent) this._onEvent(name, detail); }
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
  assert.equal(sheet.data.i18n.heritage.guideVideoBuyCta, '购买观看', 'component explicitly injects i18n so the CTA is not blank');
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
  assert.deepEqual(sheet._events.filter((name) => name === 'close'), ['close']);
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
  const videoRoute = '/pages/video/detail?id=' + encodeURIComponent(VIDEO.id) + '&attractionId=acropolis';
  assert.equal(navigation.at(-1), videoRoute, 'audio detail navigates to video introduction before playback');
  assert.equal(audioPage.data.videoOpen, null, 'source page never opens playback directly');
  const audioMarkup = read('pages/audio/detail.wxml');
  assert.ok(!audioMarkup.includes('<guide-video-sheet'), 'playback sheet belongs only to the video detail page');
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
  assert.equal(navigation.at(-1), videoRoute, 'attraction entry navigates to video introduction');
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
  assert.ok(!spotMarkup.includes('<guide-video-sheet'), 'attraction entry does not open a sheet directly');
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
    assert.equal(navigation.at(-1), videoRoute, 'paid video navigates even when expert config is missing');
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
  assert.ok(!sheetMarkup.includes('<image'), 'locked purchase sheet renders no cover/frame, respecting the no-image requirement');
  assert.match(sheetMarkup, /poster="\{\{cover\}\}"/, 'only authorized video can show its poster');
  assert.doesNotMatch(sheetMarkup, /show-menu-by-longpress="\{\{true\}\}"/);
  assert.match(sheetMarkup, /class="gvm-inline"/, 'player and purchase gate are in normal document flow');
  assert.doesNotMatch(sheetMarkup, /gvm-mask|gvm-sheet|catchtouchmove|bindtap="close"/, 'no floating sheet, mask or scroll lock');
  assert.doesNotMatch(read('components/guide-video-sheet/guide-video-sheet.wxss'), /position:\s*fixed|z-index:/, 'component cannot overlay the introduction');
  // ===== 视频介绍/节目页：先展示介绍，第二次点击才鉴权播放 =====
  let videoDefinition;
  vm.runInNewContext(read('pages/video/detail.js'), {
    wx, Page(value) { videoDefinition = value; }, require: pageRequire
  }, { filename: 'pages/video/detail.js' });
  const makeVideoPage = () => ({ ...videoDefinition, data: structuredClone(videoDefinition.data), setData(next) { Object.assign(this.data, next); } });
  const videoPage = makeVideoPage();
  entitlementsReply = [];
  const callsBeforeIntro = accessCalls;
  videoPage.onLoad({ id: VIDEO.id, attractionId: 'acropolis' });
  videoPage.onShow();
  await flush();
  assert.equal(videoPage.data.loading, false);
  assert.equal(videoPage.data.video.displayTitle, VIDEO.title);
  assert.equal(videoPage.data.video.displaySubject, SPOT.name, 'course topic uses the actual attraction, not invented copy');
  assert.equal(videoPage.data.video.displayDuration, '39:35', 'exact mm:ss, no floating point minutes');
  assert.equal(videoPage.data.video.purchased, false, 'annual membership alone does not unlock cover/playback');
  assert.equal(videoPage.data.videoOpen, null);
  assert.equal(accessCalls, callsBeforeIntro, 'entering introduction never requests playback access');
  const introMarkup = read('pages/video/detail.wxml');
  assert.ok(JSON.parse(read('app.json')).pages.includes('pages/video/detail'));
  for (const value of ['video.displayTitle', 'video.displaySubject', 'video.displayDescription', 'video.displayDuration', 'id="video-program"', 'bindtap="onPlay"', '<guide-video-sheet']) assert.ok(introMarkup.includes(value), 'album-style video page: ' + value);
  assert.ok(introMarkup.indexOf('<guide-video-sheet') > introMarkup.indexOf('id="video-program"') && introMarkup.indexOf('<guide-video-sheet') < introMarkup.indexOf('audio-album-scroll-end'), 'player is embedded under the program row, inside the scroll view');
  const actionCopy = introMarkup.match(/class="audio-album-play-button"[^>]*>\{\{([\s\S]*?)\}\}/)[1];
  assert.equal(vm.runInNewContext(actionCopy, videoPage.data), '购买观看', 'bottom action invites a purchase, not a misleading free play');
  const coverVisibility = introMarkup.match(/<image wx:if="\{\{([^}]+)\}\}"/)[1];
  assert.equal(Boolean(vm.runInNewContext(coverVisibility, videoPage.data)), false, 'no image on unpurchased introduction');
  videoPage.onPlay();
  assert.equal(videoPage.data.videoOpen.id, VIDEO.id, 'second tap expands the inline authorization region');
  accessResponse = purchaseLocked;
  const introSheet = createSheet();
  videoPage.selectComponent = () => introSheet;
  introSheet._onEvent = (name, detail) => { if (name === 'accesschange') videoPage.onVideoAccessChange({ detail }); };
  component.properties.video.observer.call(introSheet, videoPage.data.videoOpen);
  await flush();
  assert.equal(introSheet.data.state, 'purchase', 'program tap still requires server access, not local flag');
  assert.equal(introSheet.data.i18n.heritage.guideVideoBuyCta, '购买观看');
  assert.equal(videoPage.data.video.purchased, false, 'locked result never unlocks artwork');
  assert.equal(vm.runInNewContext(actionCopy, videoPage.data), '购买观看');
  const ordersBeforePurchase = orderCalls;
  orderResponses.push({ order: { id: 'order-inline', status: 'pending' }, payment: { timeStamp: '1', nonceStr: 'n', package: 'p', signType: 'RSA', paySign: 's' } });
  accessResponse = full;
  videoPage.onPlay();
  await flush();
  assert.equal(orderCalls, ordersBeforePurchase + 1, 'bottom button calls the embedded purchase action');
  assert.equal(introSheet.data.state, 'ready');
  assert.equal(videoPage.data.videoState, 'ready');
  assert.equal(videoPage.data.video.purchased, true, 'only the full access event refreshes purchase artwork and CTA');
  assert.equal(vm.runInNewContext(actionCopy, videoPage.data), '播放视频');
  assert.equal(Boolean(vm.runInNewContext(coverVisibility, videoPage.data)), true, 'purchased introduction can render the cover');
  introSheet.onTimeUpdate({ detail: { currentTime: 77 } });
  introSheet.data.access.validUntil = Date.now() - 1;
  accessResponse = full;
  videoPage.onPlay(); await flush();
  assert.equal(introSheet.data.position, 77, 'bottom play reauthorizes an expired paused video at its previous position');
  component.pageLifetimes.hide.call(introSheet);
  assert.equal(wx._videoPaused, 1, 'page backgrounding pauses the embedded video');
  entitlementsReply = [VIDEO.id];
  videoPage.onTabTap({ currentTarget: { dataset: { section: 'intro' } } });
  assert.equal(videoPage.data.scrollIntoView, 'video-intro');
  videoPage.onTabTap({ currentTarget: { dataset: { section: 'episodes' } } });
  assert.equal(videoPage.data.scrollIntoView, 'video-program');
  for (const [locale, title] of [['zh-TW', VIDEO.titleTw], ['en', VIDEO.titleEn], ['zh-CN', VIDEO.title]]) {
    i18n.setLocale(locale); videoPage.onShow(); await flush();
    assert.equal(videoPage.data.video.displayTitle, title);
    assert.ok(videoPage.data.i18n.heritage.guideVideoPlay);
  }
  contentFailure = true;
  videoPage.refresh(); await flush();
  assert.equal(videoPage.data.failed, true);
  assert.equal(videoPage.data.video.id, VIDEO.id, 'offline refresh keeps this page last successful public metadata only');
  contentFailure = false;
  const originalVideos = metadata.guideVideos;
  metadata.guideVideos = [];
  videoPage.refresh(); await flush();
  assert.equal(videoPage.data.video, null, 'remote deletion removes the program and playback entry');
  videoPage.onPlay();
  assert.equal(videoPage.data.videoOpen, null);
  metadata.guideVideos = originalVideos;
  const invalidPage = makeVideoPage();
  invalidPage.onLoad({ id: VIDEO.id, attractionId: 'delphi' });
  invalidPage.onShow(); await flush();
  assert.equal(invalidPage.data.video, null, 'wrong sight cannot resolve another sight video');
  const unloadedPage = makeVideoPage();
  unloadedPage.onLoad({ id: VIDEO.id, attractionId: 'acropolis' });
  unloadedPage.onShow(); unloadedPage.onUnload(); await flush();
  assert.equal(unloadedPage.data.video, null, 'unloaded page ignores pending metadata callbacks');
  // 关闭播放中的鉴权请求不能复活浮层，重开不被旧 reloading 锁死。
  const realFetchAccess = guideVideo.fetchAccess;
  let finishAccess;
  guideVideo.fetchAccess = (_video, done) => { finishAccess = done; };
  const closingSheet = createSheet();
  component.properties.video.observer.call(closingSheet, adapted);
  const lateCallback = finishAccess;
  component.properties.video.observer.call(closingSheet, null);
  lateCallback(true, { access: 'full', playUrl: 'https://oss.fixture/stale.mp4', validUntil: Date.now() + 600000 });
  assert.equal(closingSheet.data.state, 'idle');
  assert.equal(closingSheet.data.playUrl, '');
  component.properties.video.observer.call(closingSheet, adapted);
  assert.equal(closingSheet.data.state, 'loading');
  finishAccess(true, { access: 'locked', reason: 'MINIPROGRAM_LOGIN_REQUIRED' });
  assert.equal(closingSheet.data.state, 'login', 'reopen starts a fresh access request');
  guideVideo.fetchAccess = realFetchAccess;
  // 三语文案齐全。
  for (const locale of ['zh-CN', 'zh-TW', 'en']) {
    const heritage = i18n.getMessages(locale).heritage;
    for (const key of ['guideVideos', 'guideVideoIntro', 'guideVideoSubject', 'guideVideoPlay', 'guideVideoUnlockTitle', 'guideVideoLogin', 'guideVideoLoginCta', 'guideVideoPurchase', 'guideVideoBuyCta', 'guideVideoUnavailable']) assert.ok(heritage[key], locale + ':' + key);
  }
  // 攻略课程单独用词，不能把文史音频页的节目/集数一起改掉。
  const courseLabels = {
    'zh-CN': ['景点攻略', '课程', '课程简介', '门课程'],
    'zh-TW': ['景點攻略', '課程', '課程簡介', '門課程'],
    en: ['Sight guides', 'Courses', 'About this course', 'course']
  };
  for (const [locale, labels] of Object.entries(courseLabels)) {
    const h = i18n.getMessages(locale).heritage;
    assert.deepEqual([h.guideVideos, h.guideVideoCourses, h.guideVideoIntro, h.guideVideoCourseUnit], labels);
  }
  for (const [locale, label] of [['zh-CN', '游览攻略'], ['zh-TW', '遊覽攻略'], ['en', 'Tour guides']]) {
    assert.equal(i18n.getMessages(locale).heritage.guideVideoSectionTitle, label);
  }
  assert.match(videoBlock, /detail-heading serif">\{\{i18n\.heritage\.guideVideoSectionTitle\}\}/, 'attraction section has its own tour-guide heading');
  assert.doesNotMatch(videoBlock, />VIDEO</, 'no leftover English VIDEO eyebrow');
  assert.equal((videoBlock.match(/detail-heading serif/g) || []).length, 1, 'one tour-guide heading, not two repeated labels');
  assert.match(introMarkup, /class="sy-back-button video-back"[^>]*hover-class="sy-back-button-hover"/, 'video page keeps the shared back-button color and interaction');
  const videoStyles = read('pages/video/detail.wxss');
  assert.match(videoStyles, /\.video-back \{[^}]*width: 72rpx;[^}]*height: 72rpx;/, 'restore shared back-button size after album import');
  assert.match(videoStyles, /\.video-back \.sy-back-chevron \{[^}]*margin-left: 0;[^}]*border-left: 4rpx solid #FFFFFF;[^}]*border-bottom: 4rpx solid #FFFFFF;/, 'restore shared white arrow instead of album black override');
  assert.doesNotMatch(videoStyles, /\.video-back \{[^}]*background:/, 'button inherits the shared app gradient, not a new local palette');
  assert.match(introMarkup, /audio-album-kicker">\{\{i18n\.heritage\.guideVideos\}\}/, 'course intro keeps sight-guide naming');
  assert.doesNotMatch(introMarkup, /i18n\.heritage\.(program|episodes)\b/, 'video page uses course-specific labels');
  assert.equal(i18n.getMessages('zh-CN').heritage.program, '节目', 'audio episode copy stays unchanged');
  assert.match(read('pages/audio/album.wxml'), /i18n\.heritage\.program/, 'literature audio still uses episode labels');
  // 分享隔离：视频 sheet/签名 URL 不入分享预览。
  const { pagePreview } = loadModule('utils/share-preview.js');
  const spec = pagePreview('/pages/audio/detail', { data: { i18n: i18n.getMessages(), locale: 'zh-CN', title: '游览攻略', description: '本集介绍', cover: '/cover.jpg', guideVideos: [{ playUrl: 'https://oss.fixture/signed/video.mp4?sig=1' }], videoOpen: { playUrl: 'SECRET' } } });
  assert.ok(!JSON.stringify(spec).includes('SECRET') && !JSON.stringify(spec).includes('sig=1'), 'video sheet/signed URLs never leak into share previews');
  const videoSpec = pagePreview('/pages/video/detail', { data: { locale: 'en', i18n: i18n.getMessages('en'), video: { ...VIDEO, purchased: false }, videoOpen: { playUrl: 'SECRET' } } });
  assert.equal(videoSpec.title, VIDEO.titleEn);
  assert.equal(videoSpec.image, '', 'locked video share card reveals no cover');
  assert.ok(!JSON.stringify(videoSpec).includes('SECRET'));
  console.log('PASS: course introduction/topic/program + inline purchase/player (no overlay) + buy/play CTA + server-only payment/access + i18n + locked-image isolation + offline/deletion/unload/reauthorization');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
