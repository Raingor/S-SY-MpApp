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
assert(detail.indexOf('VISIT THE MUSEUM') < detail.indexOf('MUST-SEE'));
assert(detail.indexOf('MUST-SEE') < detail.indexOf('AUDIO GUIDE'));
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
}
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
const tapInstance = { ...detailConfig, data: { ...structuredClone(detailConfig.data), visitorSections: visitorSectionsFor('zh-CN').visitorSections }, spotId: 'fixture-id' };
tapInstance.onVisitorSectionTap({ currentTarget: { dataset: { kind: 'tickets' } } });
assert.equal(detailNavigation[0].url, '/pages/attraction/visitor-section?id=fixture-id&kind=tickets');
const visitorDetailWxml = fs.readFileSync('pages/attraction/visitor-section.wxml', 'utf8');
assert(visitorDetailWxml.includes('wx:for="{{sections}}"') && visitorDetailWxml.includes('bindtap="onTabTap"'));
assert(visitorDetailWxml.includes('nodes="{{activeSection.richNodes}}"'));
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
const auth = { getAccessToken: () => '', isSimulationToken: () => false };
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
const tracks = [{ id: 'track-1', category: 'online', previewUrl: '/preview', title: 'Test', exhibitId: 'point-1' }];
let response = { access: 'preview', unlockMode: 'attraction', previewSeconds: 60, previewUrl: '/preview', fullUrl: null };
let showToastCount = 0;
const audioWx = {
  createInnerAudioContext: () => (audio = { currentTime: 0, play() { this.played = true; }, stop() { this.stopped = true; }, pause() { this.paused = true; }, destroy() {}, onTimeUpdate(fn) { this.timeUpdate = fn; }, onSeeking(fn) { this.seeking = fn; }, onEnded(fn) { this.ended = fn; }, onError(fn) { this.error = fn; } }),
  showToast: () => showToastCount++,
  switchTab() {}, showModal() {}
};
const content = {
  loadContent(cb) { cb({}, { source: 'remote' }); },
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
    if (name.includes('paid-content')) return { fetchConfig() { throw Error('No purchase without user interaction'); } };
    if (name.includes('auth')) return auth;
    return { goBack() {} };
  }, wx: audioWx
});
const instance = { ...pageConfig, data: structuredClone(pageConfig.data), setData(next) { Object.assign(this.data, next); } };
instance.onLoad({ attractionId: 'sight-1', pointId: 'point-1' });
assert(instance.data.track && !instance.data.access.fullUrl);
instance.playPreview();
assert(audio.played && !instance.data.fullPlayback);
audio.currentTime = 59.9; audio.timeUpdate();
assert(instance.data.playing);
audio.currentTime = 60; audio.seeking();
assert(audio.stopped && instance.data.previewEnded && !instance.data.playing);
assert.equal(showToastCount, 1);
instance.playPreview();
audio.currentTime = 60; audio.timeUpdate();
assert(instance.data.previewEnded && !instance.data.playing);
assert.equal(showToastCount, 2);
instance.playFull();
assert(!instance.data.fullPlayback);
response = { ...response, access: 'full', fullUrl: 'https://example.com/signed' };
instance.refreshAccess();
assert.equal(instance.data.access.fullUrl, response.fullUrl);
instance.playFull();
assert(instance.data.fullPlayback && audio.src === response.fullUrl);
instance.onUnload();
console.log('PASS: visitor-card navigation, section tabs, tri-language rich content/fallback, fixed/custom sections, empty states, no-video paywall guard, audio access and preview boundaries');
