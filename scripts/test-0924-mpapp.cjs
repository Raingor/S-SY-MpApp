const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
for (const route of ['pages/audio/album', 'pages/audio/route', 'pages/audio/detail', 'pages/attraction/visitor-section']) {
  assert(app.pages.includes(route));
  for (const ext of ['js', 'json', 'wxml', 'wxss']) assert(fs.existsSync(route + '.' + ext));
}
const knowledge = fs.readFileSync('pages/knowledge/knowledge.wxml', 'utf8');
const detail = fs.readFileSync('pages/attraction/detail.wxml', 'utf8');
const guide = fs.readFileSync('pages/guide/guide.wxml', 'utf8');
assert(!knowledge.includes('knowledge-product-banner') && !knowledge.includes('knowledge-track-tabs'));
assert(knowledge.includes('visibleAlbums') && knowledge.includes('noAlbums'));
assert(detail.indexOf('pageCopy.sections.visitor.title') < detail.indexOf('pageCopy.sections.highlights.title'));
assert(detail.indexOf('pageCopy.sections.highlights.title') < detail.indexOf('pageCopy.sections.audioHow.title'));
assert(detail.includes('id="section-overview" class="detail-intro-block"><view class="detail-heading serif">{{pageCopy.sections.overview.title}}'));
assert(!detail.includes('VISIT THE MUSEUM') && !detail.includes('MUST-SEE') && !detail.includes('AUDIO GUIDE'));
assert(detail.includes('wx:for="{{visitorSections}}"') && !detail.includes('wx:for="{{customSections}}"'));
const visitorCardMarkup = detail.split('\n').find((line) => line.includes('class="visitor-section-grid"')) || '';
assert(visitorCardMarkup.includes('item.icon') && visitorCardMarkup.includes('item.displayTitle'));
assert(!visitorCardMarkup.includes('rich-text') && !visitorCardMarkup.includes('visitor-section-empty') && !visitorCardMarkup.includes('visit-card-arrow'));
assert(fs.readFileSync('pages/attraction/visitor-section.wxml', 'utf8').includes('nodes="{{item.richNodes}}"'));
for (const kind of ['hours', 'tickets', 'transport', 'map']) assert(fs.readFileSync('pages/attraction/detail.js', 'utf8').includes(`'${kind}'`));
assert(!detail.includes('video-empty'));
assert(!guide.includes('guide-avatar') && !guide.includes('story-section') && !guide.includes('credentials-section'));
assert(guide.includes('id="booking"') && guide.includes('onSubmit'));
const i18nModule = { exports: {} };
vm.runInNewContext(fs.readFileSync('utils/i18n.js', 'utf8'), { module: i18nModule, wx: { getStorageSync: () => 'zh-CN' }, getApp: () => ({ globalData: {} }) });
const translations = i18nModule.exports;
for (const locale of ['zh-CN', 'zh-TW', 'en']) {
  const h = translations.getMessages(locale).heritage;
  for (const key of ['sights', 'history', 'noAlbums', 'previewEnded', 'networkFailed', 'unlockRequired', 'requestDateNotice']) assert(h[key], `${locale}: ${key}`);
  const p = translations.getMessages(locale).paidContent;
  for (const key of ['paywallTitle', 'paywallSubtitle', 'paywallFeature', 'paywallLater']) assert(p[key], `${locale}: paidContent.${key}`);
  for (const key of ['member', 'memberAnnual', 'memberLifetime', 'memberUnlocked', 'renewMembership']) assert(p[key], `${locale}: annual membership copy ${key}`);
  assert(!/lifetime|终身|終身/i.test(`${p.member} ${p.memberAnnual} ${p.memberLifetime} ${p.memberUnlocked} ${p.renewMembership}`), `${locale}: mini program membership copy must use annual wording`);
}
const profileSource = fs.readFileSync('pages/profile/profile.js', 'utf8');
assert.match(profileSource, /const memberStatus = entitlements\.member \? `\$\{copy\.memberAnnual\}/, 'profile membership title always uses annual membership wording');
const profileMarkup = fs.readFileSync('pages/profile/profile.wxml', 'utf8');
assert(profileMarkup.includes('{{memberStatus ? i18n.paidContent.renewMembership : item.displayName}}'), 'profile switches the membership CTA to renew after access is active');
assert(profileMarkup.includes('wx:if="{{loggedIn && !phoneBound}}" class="phone-bind-card card"'), 'profile hides the phone binding card when the phone is already bound');
let detailConfig;
const detailNavigation = [];
const paidStateCalls = { config: 0, entitlements: 0 };
const detailContent = { getAttractions: () => [] };
vm.runInNewContext(fs.readFileSync('pages/attraction/detail.js', 'utf8'), {
  Page: (config) => { detailConfig = config; },
  getApp: () => ({ globalData: {} }),
  wx: { navigateTo: (options) => detailNavigation.push(options) },
  require: (name) => {
    if (name.includes('data/content')) return detailContent;
    if (name.includes('utils/i18n')) return { getMessages: (locale) => translations.getMessages(locale || 'zh-CN'), apply() {} };
    if (name.includes('paid-content')) return {
      fetchConfig(callback) { paidStateCalls.config++; callback(true, { configured: false, simulation: false, trialSeconds: 0, products: {} }); },
      fetchEntitlements(callback) { paidStateCalls.entitlements++; callback(true, { member: false, purchases: [] }); },
      isUnlocked: () => false
    };
    return {};
  }
});
const visitorFixture = {
  id: 'fixture', name: '测试景点', summary: '', highlights: [], exhibits: [], routes: [], audioGuides: [],
  visitorInfo: { tickets: '简体门票回退', ticketsTw: '', ticketsEn: '' },
  visitorInfoSections: [
    { id: 'hours', kind: 'hours', title: '开放时间', titleTw: '開放時間', titleEn: 'Opening hours', nodes: [{ type: 'text', text: '简体开放内容' }], nodesTw: [{ type: 'text', text: '繁體開放內容' }], nodesEn: [{ type: 'text', text: 'English hours' }], bodyHtml: '简体开放内容', bodyHtmlTw: '繁體開放內容', bodyHtmlEn: 'English hours', sort: 1, status: 'published' },
    { id: 'tickets', kind: 'tickets', title: '门票信息', titleTw: '門票資訊', titleEn: 'Tickets', nodes: [], nodesTw: [], nodesEn: [], bodyHtml: '', bodyHtmlTw: '', bodyHtmlEn: '', sort: 2, status: 'published' },
    { id: 'transport', kind: 'transport', title: '交通信息', titleTw: '交通資訊', titleEn: 'Transport', nodes: [], nodesTw: [], nodesEn: [], bodyHtml: '', bodyHtmlTw: '', bodyHtmlEn: '', sort: 3, status: 'published' },
    { id: 'map', kind: 'map', title: '景点地图', titleTw: '景點地圖', titleEn: 'Map', nodes: [], nodesTw: [], nodesEn: [], bodyHtml: '', bodyHtmlTw: '', bodyHtmlEn: '', map: {}, sort: 4, status: 'published' }
  ],
  customSections: [
    { id: 'custom-late', status: 'published', sort: 2, title: '后置', titleTw: '後置', titleEn: 'Later', nodes: [{ type: 'text', text: 'custom rich content' }], bodyHtml: 'custom rich content' },
    { id: 'custom-draft', status: 'draft', sort: 0, title: '草稿', nodes: [{ type: 'text', text: 'hidden' }] },
    { id: 'custom-first', status: 'published', sort: 1, title: '前置', titleTw: '前置', titleEn: 'First', nodes: [{ type: 'text', text: 'first content' }], bodyHtml: 'first content' }
  ]
};
const pageCopyFixture = {
  sections: {
    overview: { label: { zh: '景点概览', tw: '景點概覽', en: 'Overview' }, subtitle: { zh: '认识景点', tw: '認識景點', en: 'Attraction summary' } },
    visitor: { label: { zh: '参观指南', tw: '參觀指南', en: 'Visitor guide' }, subtitle: { zh: '实用信息', tw: '實用資訊', en: 'Practical information' }, notice: { zh: '以官方公告为准', tw: '以官方公告為準', en: 'Check official notices' } }
  },
  audioHow: { steps: [{ zh: '步骤一', tw: '步驟一', en: 'Step one' }], note: { zh: '演示不可播放', tw: '演示不可播放', en: 'Demo cannot play' } }
};
const pageCopyInstance = { ...detailConfig, data: { ...structuredClone(detailConfig.data), locale: 'en' }, setData(next) { Object.assign(this.data, next); } };
pageCopyInstance.applyPageCopy(pageCopyFixture);
assert.equal(pageCopyInstance.data.pageCopy.sections.overview.title, 'Overview');
assert.equal(pageCopyInstance.data.pageCopy.sections.visitor.notice, 'Check official notices');
assert.equal(pageCopyInstance.data.pageCopy.audioHow.steps[0].number, '01');
assert.equal(pageCopyInstance.data.pageCopy.audioHow.steps[0].text, 'Step one');
assert.equal(pageCopyInstance.data.pageCopy.audioHow.note, 'Demo cannot play');
function visitorSectionsFor(locale) {
  const instance = { ...detailConfig, data: { ...structuredClone(detailConfig.data), locale, i18n: translations.getMessages(locale) }, setData(next) { Object.assign(this.data, next); } };
  instance.applySpot(visitorFixture);
  return instance.data;
}
for (const locale of ['zh-CN', 'zh-TW', 'en']) {
  const rendered = visitorSectionsFor(locale);
  assert.deepEqual(Array.from(rendered.visitorSections, (section) => section.kind), ['hours', 'tickets', 'transport', 'map']);
  assert(rendered.visitorSections.every((section) => section.displayTitle && section.hasContent !== undefined));
}
assert.equal(visitorSectionsFor('zh-TW').visitorSections[0].richNodes[0].text, '繁體開放內容');
assert.equal(visitorSectionsFor('en').visitorSections[0].richNodes[0].text, 'English hours');
assert.equal(visitorSectionsFor('en').visitorSections[1].richNodes, '简体门票回退');
const faqFixture = structuredClone(visitorFixture);
faqFixture.visitorInfo.faq = '演示问题？演示回答';
faqFixture.visitorInfoSections.push({ id: 'faq', kind: 'faq', title: '常见问题', titleEn: 'FAQ', isDemo: true });
const faqCardInstance = { ...detailConfig, data: { ...structuredClone(detailConfig.data), locale: 'zh-CN', i18n: translations.getMessages('zh-CN') }, setData(next) { Object.assign(this.data, next); } };
faqCardInstance.applySpot(faqFixture);
assert.deepEqual(Array.from(faqCardInstance.data.visitorSections, (section) => section.kind), ['hours', 'tickets', 'transport', 'map']);
const tapInstance = { ...detailConfig, data: { ...structuredClone(detailConfig.data), visitorSections: visitorSectionsFor('zh-CN').visitorSections }, spotId: 'fixture-id' };
tapInstance.onVisitorSectionTap({ currentTarget: { dataset: { kind: 'tickets' } } });
assert.equal(detailNavigation[0].url, '/pages/attraction/visitor-section?id=fixture-id&kind=tickets');
const visitorDetailWxml = fs.readFileSync('pages/attraction/visitor-section.wxml', 'utf8');
assert(visitorDetailWxml.includes('wx:for="{{sections}}"') && visitorDetailWxml.includes('bindtap="onTabTap"'));
assert(visitorDetailWxml.includes('nodes="{{activeSection.richNodes}}"'));
assert(visitorDetailWxml.includes('visitor-detail-hours') && !visitorDetailWxml.includes('visitor-faq-list'));
let visitorDetailConfig;
vm.runInNewContext(fs.readFileSync('pages/attraction/visitor-section.js', 'utf8'), {
  Page: (config) => { visitorDetailConfig = config; },
  wx: {},
  require: (name) => {
    if (name.includes('data/content')) return detailContent;
    if (name.includes('utils/i18n')) return { getMessages: (locale) => translations.getMessages(locale || 'zh-CN'), apply() {} };
    return {};
  }
});
const visitorDetailInstance = { ...visitorDetailConfig, data: { ...structuredClone(visitorDetailConfig.data), locale: 'zh-TW', i18n: translations.getMessages('zh-TW') }, requestedKind: 'transport', setData(next) { Object.assign(this.data, next); } };
visitorDetailInstance.applySpot(visitorFixture);
assert.equal(visitorDetailInstance.data.activeKind, 'transport');
assert.equal(visitorDetailInstance.data.activeSection.kind, 'transport');
visitorDetailInstance.onTabTap({ currentTarget: { dataset: { kind: 'map' } } });
assert.equal(visitorDetailInstance.data.activeKind, 'map');
assert.equal(visitorDetailInstance.data.activeSection.displayTitle, '景點地圖');
assert.equal(visitorDetailInstance.data.activeSection.hasContent, false);
assert.equal(visitorDetailInstance.data.sections.find((section) => section.kind === 'transport').hasContent, false);
assert.deepEqual(Array.from(visitorDetailInstance.data.customSections, (section) => section.id), ['custom-first', 'custom-late']);
assert.equal(visitorDetailInstance.data.customSections[0].displayTitle, '前置');
assert(!visitorDetailInstance.data.customSections.some((section) => section.id === 'custom-draft'));
const faqCustomFixture = structuredClone(visitorFixture);
faqCustomFixture.visitorInfo.faq = '保留在数据源中但不在小程序展示';
faqCustomFixture.customSections.push({ id: 'custom-faq', status: 'published', sort: 3, title: '常见问题', nodes: [{ type: 'text', text: 'FAQ 内容' }] });
faqCustomFixture.customSections.push({ id: 'faq-extra', status: 'published', sort: 4, title: 'Q&A', nodes: [{ type: 'text', text: '更多 FAQ' }] });
visitorDetailInstance.requestedKind = 'faq';
visitorDetailInstance.applySpot(faqCustomFixture);
assert.equal(visitorDetailInstance.data.activeSection.kind, 'hours', 'FAQ deep links fall back to the first supported visitor section');
assert(!visitorDetailInstance.data.sections.some((section) => section.kind === 'faq'));
assert(!visitorDetailInstance.data.customSections.some((section) => section.id === 'custom-faq'));
assert(!visitorDetailInstance.data.customSections.some((section) => section.id === 'faq-extra'));
assert.equal(faqCustomFixture.visitorInfo.faq, '保留在数据源中但不在小程序展示');
const multilineFixture = structuredClone(visitorFixture);
multilineFixture.visitorInfo.hours = '周一至周五 09:00-12:00\r\n周末及节假日 10:00-16:00';
multilineFixture.visitorInfoSections[0].nodes = [];
multilineFixture.visitorInfoSections[0].bodyHtml = '';
const multilineInstance = { ...visitorDetailConfig, data: { ...structuredClone(visitorDetailConfig.data), locale: 'zh-CN', i18n: translations.getMessages('zh-CN') }, requestedKind: 'hours', setData(next) { Object.assign(this.data, next); } };
multilineInstance.applySpot(multilineFixture);
assert.equal(multilineInstance.data.activeSection.hoursText, multilineFixture.visitorInfo.hours);
const richMultilineFixture = structuredClone(visitorFixture);
richMultilineFixture.visitorInfoSections[0].nodes = [{ type: 'text', text: '每日 09:00-12:00\r\n每日 13:00-17:00' }];
const richMultilineInstance = { ...visitorDetailConfig, data: { ...structuredClone(visitorDetailConfig.data), locale: 'zh-CN', i18n: translations.getMessages('zh-CN') }, requestedKind: 'hours', setData(next) { Object.assign(this.data, next); } };
richMultilineInstance.applySpot(richMultilineFixture);
assert.deepEqual(Array.from(richMultilineInstance.data.activeSection.richNodes, (node) => node.name || node.text), ['每日 09:00-12:00', 'br', '每日 13:00-17:00']);
assert(!visitorDetailWxml.includes("activeKind === 'faq'") && !visitorDetailWxml.includes('visitor-faq-'));
visitorDetailInstance.data.locale = 'en';
visitorDetailInstance.applySpot(visitorFixture);
assert.equal(visitorDetailInstance.data.customSections[0].displayTitle, 'First');
assert.equal(visitorDetailInstance.data.customSections[0].richNodes[0].text, 'first content');
const noVideoPage = { ...detailConfig, data: { ...structuredClone(detailConfig.data), spot: { videoUrl: '' } }, setData(next) { Object.assign(this.data, next); } };
noVideoPage.loadPaidState();
assert.deepEqual(paidStateCalls, { config: 0, entitlements: 0 });
noVideoPage.data.spot = { videoUrl: 'https://example.com/video.mp4' };
noVideoPage.loadPaidState();
assert.deepEqual(paidStateCalls, { config: 1, entitlements: 1 });

const requests = [];
const wx = { request: (options) => { requests.push(options); } };
const auth = { getAccessToken: () => 'fixture-token', isSimulationToken: () => false, ensurePhoneBound(callback) { callback(true); } };
const access = (() => {
  const file = fs.readFileSync('utils/audio-access.js', 'utf8');
  const module = { exports: {} };
  vm.runInNewContext(file, { module, require: () => auth, getApp: () => ({ globalData: { apiBase: 'https://example.com' } }), wx });
  return module.exports;
})();
function accessReply(raw, status = 200) {
  let result;
  access.getAccess('track-1', (ok, data, code) => { result = { ok, data, code }; });
  const req = requests.pop();
  assert.match(req.url, /\/track-1\/access$/);
  req.success({ statusCode: status, data: raw });
  return result;
}
let result = accessReply({ access: 'preview', unlockMode: 'membership', previewSeconds: 100, previewUrl: '/api/miniprogram/audio/track-1/preview', fullUrl: '/should-not-be-used', reason: 'AUDIO_ENTITLEMENT_REQUIRED' });
assert(result.ok && result.data.mode === 'membership' && result.data.access === 'preview');
assert.equal(result.data.fullUrl, '');
assert.equal(result.data.previewSeconds, 60);
assert.match(result.data.previewUrl, /^https:\/\/example.com\//);
result = accessReply({ access: 'full', unlockMode: 'attraction', previewSeconds: 59, previewUrl: '/preview', fullUrl: '/api/miniprogram/audio/track-1/full?token=signed' });
assert.match(result.data.fullUrl, /token=signed/);
assert.equal(result.data.mode, 'attraction');
assert.equal(accessReply({}, 404).ok, false);

let pageConfig;
let audio;
const tracks = [{ id: 'track-1', category: 'online', attractionId: 'sight-1', albumId: null, previewUrl: '/preview', title: 'Test', exhibitId: 'point-1' }];
const audioDetailMarkup = fs.readFileSync('pages/audio/detail.wxml', 'utf8');
assert.match(audioDetailMarkup, /class="audio-experience-nav" style="top: \{\{statusBarHeight \+ 8\}\}px;"/, '全屏封面返回按钮必须位于真实状态栏下方');
let response = { access: 'preview', unlockMode: 'attraction', previewSeconds: 60, previewUrl: '/preview', fullUrl: null };
let showToastCount = 0;
let showModalCount = 0;
const orderAttempts = [];
let nextTimerId = 1;
const timers = new Map();
let backCalled = false;
const audioWx = {
  getWindowInfo: () => ({ statusBarHeight: 44 }),
  createInnerAudioContext: () => (audio = { currentTime: 0, play() { this.played = true; }, stop() { this.stopped = true; }, pause() { this.paused = true; }, seek(seconds) { this.currentTime = seconds; }, destroy() {}, onTimeUpdate(fn) { this.timeUpdate = fn; }, onSeeking(fn) { this.seeking = fn; }, onEnded(fn) { this.ended = fn; }, onError(fn) { this.error = fn; } }),
  showToast: () => showToastCount++,
  switchTab() {}, showModal() { showModalCount++; }
};
const content = {
  loadContent(cb) { cb({}, { source: 'remote', status: 'ready' }); },
  getAttraction() { return { id: 'sight-1', exhibits: [{ id: 'point-1', name: 'Point' }], audioGuides: tracks }; },
  getAudioAlbums() { return []; }
};
const source = fs.readFileSync('pages/audio/detail.js', 'utf8');
vm.runInNewContext(source, {
  Page: (config) => { pageConfig = config; },
  require: (name) => {
    if (name.includes('data/content')) return content;
    if (name.includes('utils/i18n')) return { getMessages: () => translations.getMessages('en'), apply: () => translations.getMessages('en') };
    if (name.includes('audio-access')) return { getAccess: (_id, cb) => cb(true, { mode: response.unlockMode, access: response.access, fullUrl: response.access === 'full' ? response.fullUrl : '', previewUrl: response.previewUrl, previewSeconds: Math.min(response.previewSeconds, 60) }, 200) };
    if (name.includes('paid-content')) return {
      fetchConfig(callback) { callback(true, { simulation: false, products: { attraction: { price: '¥9.9', enabled: true }, membership: { name: '终身会员', price: 99, enabled: false }, annualMembership: { name: '年会员', price: 199, enabled: true } } }); },
      createOrder(product, attractionId, callback) { orderAttempts.push({ product, attractionId }); callback(true, { paymentStatus: 'pending' }); }
    };
    if (name.includes('auth')) return auth;
    if (name.includes('utils/navigation')) return { goBack() { assert(audio.stopped, 'audio stops before back navigation'); backCalled = true; } };
    return {};
  }, wx: audioWx,
  setTimeout(fn, delay) { const id = nextTimerId++; timers.set(id, { fn, delay }); return id; },
  clearTimeout(id) { timers.delete(id); }
});
const instance = { ...pageConfig, data: structuredClone(pageConfig.data), setData(next) { Object.assign(this.data, next); } };
instance.onLoad({ attractionId: 'sight-1', pointId: 'point-1' });
assert.equal(instance.data.statusBarHeight, 44);
assert(instance.data.track && instance.data.access === null && !audio);
instance.playPreview();
assert(audio.played && !instance.data.fullPlayback);
assert.equal([...timers.values()][0].delay, 60000, 'preview duration is measured as real playback time');
audio.currentTime = 59.9; audio.timeUpdate();
assert(instance.data.playing);
audio.currentTime = 60; audio.timeUpdate();
assert(!instance.data.previewEnded && instance.data.playing, '2x media progress does not end a 60-second preview early');
audio.ended();
assert(!instance.data.previewEnded && !instance.data.playing, 'natural preview-source end stops audio without clearing the 60-second timer');
assert.equal(timers.size, 1);
const firstPreviewTimer = [...timers.values()][0]; timers.clear(); firstPreviewTimer.fn();
assert(audio.stopped && instance.data.previewEnded && !instance.data.playing);
assert.equal(instance.data.showUnlockPaywall, true);
assert.equal(instance.data.unlockOptions.length, 2);
assert.equal(instance.data.unlockOptions[0].priceDisplay, '¥9.9', 'single-sight price uses the configured amount');
assert.equal(instance.data.unlockOptions[1].product, 'annualMembership', 'paywall offers the annual membership product type');
assert.equal(instance.data.unlockOptions[1].title, '年会员', 'paywall uses the enabled annual product name');
assert.equal(instance.data.unlockOptions[1].priceDisplay, '¥199', 'paywall reads the annual membership price');
assert(!instance.data.unlockOptions.some((option) => option.product === 'membership'), 'disabled lifetime membership is excluded');
assert.equal(showModalCount, 0, 'preview completion does not use the native confirmation modal');
assert.equal(showToastCount, 0);
assert.match(audioDetailMarkup, /<view class="audio-player-actions">/, 'unlock action remains visible after preview ends');
assert.match(audioDetailMarkup, /class="audio-paywall-sheet"/, 'preview completion opens the custom guided unlock sheet');
assert.doesNotMatch(audioDetailMarkup, /audio-preview-ended-card/, 'preview-ended guidance is not an inline card');
assert.match(fs.readFileSync('pages/audio/detail.wxss', 'utf8'), /\.audio-full-action\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;/s, 'the initial unlock button label is centered');
instance.onUnlockPaywallClose();
assert.equal(instance.data.showUnlockPaywall, false);
instance.playPreview();
audio.currentTime = 0;
instance.onSeekChange({ detail: { value: 50 } });
assert(!instance.data.previewEnded && instance.data.playing);
assert.equal([...timers.values()][0].delay, 10000, 'seeking forward to 50 seconds consumes 50 seconds of preview allowance at 1x');
const secondPreviewTimer = [...timers.values()][0]; timers.clear(); secondPreviewTimer.fn();
assert(instance.data.previewEnded && !instance.data.playing);
assert.equal(instance.data.showUnlockPaywall, true);
instance.onUnlockOptionTap({ currentTarget: { dataset: { product: 'annualMembership' } } });
assert.deepEqual(orderAttempts[0], { product: 'annualMembership', attractionId: '' }, 'custom paywall annual plan reaches the annual-membership order flow');
instance.onUnlockOptionTap({ currentTarget: { dataset: { product: 'attraction' } } });
assert.deepEqual(orderAttempts[1], { product: 'attraction', attractionId: 'sight-1' }, 'single-sight option remains available and reaches its existing order flow');
assert.equal(showModalCount, 0);
assert.equal(showToastCount, 2, 'both selected products reach the existing payment-pending order flow');
instance.playFull();
assert(!instance.data.fullPlayback);
response = { ...response, access: 'full', fullUrl: 'https://example.com/signed' };
instance.refreshAccess();
assert.equal(instance.data.access.fullUrl, response.fullUrl);
instance.playFull();
assert(instance.data.fullPlayback && audio.src === response.fullUrl);
audio.stopped = false;
const accessRequestId = instance._accessRequestId;
instance.onBack();
assert(audio.stopped, 'back tap stops the active audio context');
assert(backCalled, 'back navigation runs after stopping audio');
assert(instance._accessRequestId > accessRequestId, 'back tap invalidates a pending access callback');
assert.equal(instance.data.access, null);
instance.onUnload();
console.log('PASS: visitor-card navigation, section tabs, tri-language rich content/fallback, fixed/custom sections, empty states, no-video paywall guard, audio access and preview boundaries');
