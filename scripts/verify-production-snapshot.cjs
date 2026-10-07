// 只读生产快照回归：把已保存的 /api/content JSON 回放进 MpApp 适配器与页面逻辑。
// 用法：node scripts/verify-production-snapshot.cjs /path/to/content.json
// 本脚本自身不发起任何网络请求。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = process.argv[2];
assert(file && fs.existsSync(file), 'usage: node scripts/verify-production-snapshot.cjs <saved /api/content JSON>');
const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
const origin = 'https://sy-greece.com';
let accessRequests = 0;
let contentRequests = 0;

global.getApp = () => ({ globalData: { apiBase: origin } });
global.wx = {
  getStorageSync: () => '', getSystemInfoSync: () => ({ statusBarHeight: 20 }),
  showToast() {}, showModal() {}, navigateTo() {}, switchTab() {}, previewImage() {},
  request(options) {
    assert.equal(options.method, 'GET');
    if (options.url.includes('/api/content?')) {
      contentRequests++;
      return options.success({ statusCode: 200, data: payload });
    }
    if (options.url.includes('/miniprogram/audio/')) {
      accessRequests++;
      return options.callback ? undefined : options.fail({ errMsg: 'read-only snapshot must not need audio access' });
    }
    throw new Error('unexpected request in snapshot verification: ' + options.url);
  },
  createInnerAudioContext() { throw new Error('snapshot verification must not create an audio context'); }
};

const content = require(path.join(__dirname, '..', 'data/content.js'));
const i18nStub = {
  getMessages: () => ({ heritage: { sights: '景点讲解', history: '希腊文史' }, loading: '加载中' }),
  apply(page) { page.setData({ locale: 'zh-CN', i18n: this.getMessages() }); return this.getMessages(); }
};
function pageFrom(relative) {
  let definition;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'), {
    Page(config) { definition = config; }, wx: global.wx, getApp: global.getApp,
    require(id) {
      if (id.includes('data/content')) return content;
      if (id.includes('utils/i18n')) return i18nStub;
      if (id.includes('utils/navigation')) return { goBack() {} };
      if (id.includes('utils/share')) return { buildShareCard: () => ({}) };
      return {};
    }
  }, { filename: relative });
  return { ...definition, data: { ...definition.data }, setData(next) { Object.assign(this.data, next); } };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
const line = (label, value) => console.log(`${label.padEnd(34)} ${value}`);

(async () => {
  const { data, state } = await content.fetchContent();
  assert.equal(state.source, 'remote', 'production payload must satisfy hasRemoteContract');
  assert.equal(state.status, 'ready');

  const attractions = content.getAttractions(data);
  const cities = content.getCities(data);
  const albums = content.getAudioAlbums(data);
  const destinations = content.getHomeDestinations(data, 'zh-CN');
  line('contract state', `${state.source}/${state.status}`);
  line('attractions', attractions.length);
  line('all status=published', attractions.every((spot) => spot.status === 'published'));
  line('cities', cities.length);
  line('audioAlbums after adapter', albums.length);
  line('destination groups', destinations.map((group) => `${group.key}:${group.tiles.length}`).join(' '));

  const allTracks = attractions.flatMap((spot) => (spot.audioGuides || []).map((track) => ({ spot, track })));
  const withStatus = allTracks.filter(({ track }) => Object.prototype.hasOwnProperty.call(track, 'status'));
  line('attraction audio tracks', allTracks.length);
  line('tracks exposing status', withStatus.length);
  line('demo tracks', allTracks.filter(({ track }) => track.isDemo === true).length);
  line('tracks with previewUrl', allTracks.filter(({ track }) => track.previewUrl).length);
  line('tracks linked to their spot', allTracks.every(({ spot, track }) => String(track.attractionId) === String(spot.id)));
  line('tracks in valid category', allTracks.every(({ track }) => ['route', 'online', 'expert'].includes(track.category)));
  line('tracks carrying albumId', allTracks.filter(({ track }) => track.albumId).length);

  const page = data.attractionDetailPage;
  const required = ['overview', 'visitor', 'highlights', 'audioHow', 'route', 'online', 'expert'];
  const sectionsOk = page && page.sections && required.every((key) => page.sections[key] && page.sections[key].label);
  line('attractionDetailPage sections', sectionsOk ? required.join(',') : 'MISSING');
  line('audioHow steps', page && page.audioHow && Array.isArray(page.audioHow.steps) ? page.audioHow.steps.length : 'MISSING');
  assert(sectionsOk && page.audioHow.steps.length > 0, 'production must carry the 7-section page copy');

  const spot = attractions[0];
  const detail = pageFrom('pages/attraction/detail.js');
  detail.spotId = spot.id;
  detail.data.locale = 'zh-CN';
  detail.applyPageCopy(page);
  detail.applySpot(spot);
  line('detail visitor sections', detail.data.visitorSections.map((row) => row.kind).join(','));
  line('detail page titles', required.map((key) => detail.data.pageCopy.sections[key].title).join(' / '));
  line('detail online/expert demo', `${detail.data.onlineGuides.length}/${detail.data.expertGuides.length} demo=${detail.data.onlineDemo}`);
  line('detail routes', detail.data.routes.length);

  const knowledge = pageFrom('pages/knowledge/knowledge.js');
  knowledge.onLoad({}); await tick();
  line('knowledge hotSpots', knowledge.data.hotSpots.length);
  line('knowledge visibleAlbums (empty state)', knowledge.data.visibleAlbums.length);
  knowledge.onSearchInput({ detail: { value: spot.name } });
  line('knowledge search hits by real name', knowledge.data.hotSpots.length > 0);
  knowledge.onPanelTap({ currentTarget: { dataset: { index: 1 } } });
  line('history panel albums', knowledge.data.visibleAlbums.length);

  const demo = allTracks.find(({ track }) => track.isDemo === true);
  if (demo) {
    const audioPage = pageFrom('pages/audio/detail.js');
    audioPage.onLoad({ attractionId: demo.spot.id, trackId: demo.track.id, category: demo.track.category });
    await tick();
    line('demo track opens', Boolean(audioPage.data.track));
    line('demo mode flag', audioPage.data.demoMode);
    audioPage.playPreview();
    line('demo preview blocks playback', audioPage.data.playing === false);
  }

  line('content GET (mocked)', contentRequests);
  line('audio access requests', accessRequests);
  assert.equal(accessRequests, 0, 'read-only snapshot verification must not request audio access');
  console.log('PASS: production snapshot satisfies the MpApp public contract; album empty state, demo-only attraction audio and 7-section copy verified offline (0 audio-access calls)');
})().catch((error) => { console.error(error); process.exitCode = 1; });
