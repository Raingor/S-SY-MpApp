// Website-shaped public content and page lifecycle fixture. Every wx.request is intercepted.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const origin = 'http://fixture.invalid';
const moduleCache = new Map();
function loadModule(filename, overrides = {}) {
  const candidate = fs.existsSync(filename) ? filename : `${filename}.js`;
  const resolved = path.resolve(candidate);
  if (moduleCache.has(resolved)) return moduleCache.get(resolved).exports;
  const module = { exports: {} };
  moduleCache.set(resolved, module);
  const localRequire = (id) => Object.prototype.hasOwnProperty.call(overrides, id)
    ? overrides[id]
    : id.startsWith('.') ? loadModule(path.resolve(path.dirname(resolved), id)) : require(id);
  vm.runInThisContext('(function(require,module,exports,setTimeout,clearTimeout){\n' + fs.readFileSync(resolved, 'utf8') + '\n})', { filename: resolved })(localRequire, module, module.exports, global.setTimeout, global.clearTimeout);
  return module.exports;
}
const requests = [];
const navigation = [];
const playback = { created: 0, played: 0, destroyed: 0 };
let failContent = false;
let failAccess = false;
let accessReply = 'preview';
const track = (id, category, association = {}) => ({ id, category, title: id,
  previewUrl: `/api/miniprogram/audio/${id}/preview`, accessUrl: `/api/miniprogram/audio/${id}/access`,
  previewSeconds: 60, durationSeconds: 120, unlockMode: 'free', ...association });
const albumTrack = track('history-1', 'heritage', { albumId: 'history', attractionId: null });
const matchingTrack = track('acropolis-1', 'online', { attractionId: 'acropolis', albumId: null, title: '雅典卫城' });
const crossTrack = track('other-1', 'online', { attractionId: 'other', albumId: null, title: '雅典卫城' });
const base = () => ({ settings: {}, countries: [], guides: [], cities: [], routes: [], destinations: [], sampleItineraries: [],
  audioAlbums: [], attractions: [] });
let response = base();
const appInstance = { globalData: { apiBase: origin, pendingAudioAlbum: null } };
global.getApp = () => appInstance;
global.wx = {
  getStorageSync: () => '', getSystemInfoSync: () => ({ statusBarHeight: 20 }),
  showToast() {}, showModal() {}, navigateTo({ url }) { navigation.push(url); },
  request(options) {
    assert(options.url.startsWith(origin + '/'), `non-fixture request: ${options.url}`);
    requests.push({ url: options.url, method: options.method });
    if (options.url === `${origin}/api/content?country=greece&includeAttractionDetails=false`) {
      if (failContent) options.fail({ errMsg: 'fixture offline' });
      else options.success({ statusCode: 200, data: response });
    } else if (/^http:\/\/fixture\.invalid\/api\/miniprogram\/audio\/[\w-]+\/access$/.test(options.url)) {
      const id = options.url.split('/').at(-2);
      if (failAccess) return options.fail({ errMsg: 'fixture access unavailable' });
      options.success({ statusCode: 200, data: { access: accessReply, unlockMode: 'free',
        previewUrl: `/api/miniprogram/audio/${id}/preview`,
        fullUrl: accessReply === 'full' ? `/api/miniprogram/audio/${id}/full?token=fixture-${requests.length}` : null,
        previewSeconds: 60 } });
    } else throw new Error(`unexpected fixture request: ${options.url}`);
  },
  createInnerAudioContext() {
    playback.created++;
    return { autoplay: false, currentTime: 0,
      onTimeUpdate() {}, onSeeking() {}, onEnded() {}, onError() {},
      play() { playback.played++; }, pause() {}, stop() {}, destroy() { playback.destroyed++; } };
  }
};
const content = loadModule(path.resolve(__dirname, '../data/content.js'));
const i18n = { getMessages: () => ({ heritage: { sights: '景点讲解', history: '希腊文史', previewEnded: '试听结束' } }),
  apply(page) { page.setData({ locale: 'zh-CN', i18n: this.getMessages() }); return this.getMessages(); } };
function pageFrom(relative) {
  let definition;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'), {
    Page(config) { definition = config; }, wx: global.wx, getApp: global.getApp,
    setTimeout: global.setTimeout, clearTimeout: global.clearTimeout,
    require(id) {
      if (id.includes('data/content')) return content;
      if (id.includes('utils/i18n')) return i18n;
      if (id.includes('utils/audio-access')) return loadModule(path.resolve(__dirname, '../utils/audio-access.js'), {
        './auth': { getAccessToken: () => '', isSimulationToken: () => false },
        './paid-content': {}
      });
      if (id.includes('utils/auth')) return { getAccessToken: () => '' };
      if (id.includes('utils/share')) return { buildShareCard: () => ({}) };
      if (id.includes('utils/navigation')) return { goBack() {} };
      if (id.includes('utils/paid-content')) return {};
      throw new Error(`unexpected module: ${id}`);
    }
  }, { filename: relative });
  return { ...definition, data: { ...definition.data }, setData(next) { Object.assign(this.data, next); } };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
let previewTimerId = 0;
const previewTimers = new Map();
global.setTimeout = (fn, delay) => { const id = ++previewTimerId; previewTimers.set(id, { fn, delay }); return id; };
global.clearTimeout = (id) => previewTimers.delete(id);
const knowledgeMarkup = fs.readFileSync(path.join(__dirname, '../pages/knowledge/knowledge.wxml'), 'utf8');
const knowledgeStyles = fs.readFileSync(path.join(__dirname, '../pages/knowledge/knowledge.wxss'), 'utf8');
const albumMarkup = fs.readFileSync(path.join(__dirname, '../pages/audio/album.wxml'), 'utf8');
assert.match(knowledgeMarkup, /knowledge-nav sy-nav" style="padding-right: \{\{menuRightSpace\}\}px;/, 'knowledge header reserves space for the WeChat capsule');
assert.match(knowledgeStyles, /\.heritage-album\s*\{[^}]*display:\s*flex/s, 'heritage album cards use a compact horizontal layout');
const attractionMarkup = fs.readFileSync(path.join(__dirname, '../pages/attraction/detail.wxml'), 'utf8');
const audioDetailMarkup = fs.readFileSync(path.join(__dirname, '../pages/audio/detail.wxml'), 'utf8');
assert.match(attractionMarkup, /class="guide-entry-card" data-category="online" bindtap="onGuideCollectionTap"/, 'Online Preview opens the online guide-point collection');
assert.doesNotMatch(attractionMarkup, /online-preview-track|onOnlinePreviewTap/, 'audio is not played directly from the attraction card');
assert.match(audioDetailMarkup, /class="audio-player-controls"/, 'the audio player is shown after opening an individual guide point');
assert(knowledgeMarkup.indexOf('class="heritage-album-cover"') < knowledgeMarkup.indexOf('class="heritage-album-body"'), 'heritage card renders image before text');
assert.match(knowledgeStyles, /\.heritage-album-cover\s*\{[^}]*width:\s*188rpx;[^}]*height:\s*188rpx/s, 'knowledge album art uses a square thumbnail');
assert.match(knowledgeStyles, /\.heritage-album-body\s*\{[^}]*padding:\s*0/s, 'horizontal album text aligns without extra inset');
assert.match(albumMarkup, /class="audio-cover" src="\{\{album\.cover\}\}"/, 'album detail binds its image to the normalized cover URL');
(async () => {
  const knowledge = pageFrom('pages/knowledge/knowledge.js');
  knowledge.onLoad({ panel: '1' }); knowledge.onShow(); await tick();
  assert.equal(knowledge.data.loading, false);
  assert.equal(knowledge.data.visibleAlbums.length, 0, 'empty API produces an honest album empty state');
  assert.equal(playback.created, 0);

  response = { ...base(), audioAlbums: [{ id: 'hidden-album', status: 'unpublished', episodes: [track('hidden-episode', 'heritage', { albumId: 'hidden-album' })] },
    { id: 'history', title: '希腊历史的15个地方', description: '专辑说明', cover: 'https://sy-greece.com/images/history-cover.jpg', episodes: [
    albumTrack,
    track('wrong-album', 'heritage', { albumId: 'another', attractionId: null }),
    track('draft', 'heritage', { albumId: 'history', status: 'draft', attractionId: null }),
    track('unset-status', 'heritage', { albumId: 'history', status: '', attractionId: null }),
    track('other-kind', 'online', { albumId: 'history', attractionId: 'acropolis' }),
    { ...track('demo', 'heritage', { albumId: 'history' }), isDemo: true }
  ] }], attractions: [
    { id: 'acropolis', name: '雅典卫城', status: 'published', city: 'athens', audioGuides: [matchingTrack, crossTrack, albumTrack,
      track('hidden', 'online', { attractionId: 'acropolis', status: 'unpublished' }),
      track('not-published', 'online', { attractionId: 'acropolis', status: '' }),
      { id: 'demo-spot', category: 'online', attractionId: 'acropolis', albumId: null, isDemo: true, playable: false, previewUrl: '', title: '演示数据' }] },
    { id: 'other', name: '另一个景点', status: 'published', city: 'athens', audioGuides: [crossTrack] }
  ] };
  knowledge.refresh(); await tick();
  assert.deepEqual(Array.from(knowledge.data.visibleAlbums, (item) => item.id), ['history']);
  assert.deepEqual(Array.from(knowledge.data.visibleAlbums[0].episodes, (item) => item.id), ['history-1'], 'albumId and category determine ownership');
  knowledge.onSearchInput({ detail: { value: '不存在' } });
  assert.equal(knowledge.data.visibleAlbums.length, 0, 'search hides nonmatching album');
  knowledge.onSearchInput({ detail: { value: '希腊历史' } });
  assert.equal(knowledge.data.visibleAlbums.length, 1);
  knowledge.onAlbumTap({ currentTarget: { dataset: { id: 'history' } } });
  assert.equal(navigation.at(-1), '/pages/audio/album?id=history');
  assert.equal(appInstance.globalData.pendingAudioAlbum.album.cover, 'https://sy-greece.com/images/history-cover.jpg', 'the already-rendered album cover is preserved for the detail route');

  const album = pageFrom('pages/audio/album.js');
  album.onLoad({ id: 'history' }); album.onShow(); await tick();
  assert.equal(album.data.episodes.length, 1);
  assert.equal(album.data.album.cover, 'https://sy-greece.com/images/history-cover.jpg', 'album detail keeps the visible list cover while refreshing remote data');
  assert.equal(appInstance.globalData.pendingAudioAlbum, null, 'one-shot album cover handoff is cleared after consumption');
  album.onEpisodeTap({ currentTarget: { dataset: { id: 'history-1' } } });
  assert.equal(navigation.at(-1), '/pages/audio/detail?albumId=history&episodeId=history-1');
  assert.equal(playback.created, 0, 'listing never creates audio context');
  const albumDetail = pageFrom('pages/audio/detail.js');
  const beforeAlbumDetail = requests.length;
  albumDetail.onLoad({ albumId: 'history', episodeId: 'history-1' }); await tick();
  assert.equal(albumDetail.data.track.id, 'history-1');
  assert.equal(albumDetail.data.demoCategory, 'heritage');
  assert.equal(albumDetail.data.cover, 'https://sy-greece.com/images/history-cover.jpg', 'album episode uses the album cover when the episode has no individual cover');
  assert.equal(requests.length, beforeAlbumDetail + 1, 'page load only fetches public content, never audio access');
  assert.equal(albumDetail.data.access, null);
  albumDetail.onShow();
  assert.equal(requests.length, beforeAlbumDetail + 1, 'onShow does not prefetch audio access');
  assert.equal(playback.created, 0, 'opening an album episode does not create or play audio');
  albumDetail.playPreview();
  assert.equal(playback.created, 1);
  assert.equal(playback.played, 1);
  albumDetail.onUnload();
  const malformedAlbumLink = pageFrom('pages/audio/detail.js');
  malformedAlbumLink.onLoad({ albumId: 'history', attractionId: 'acropolis', trackId: 'acropolis-1' }); await tick();
  assert.equal(malformedAlbumLink.data.unavailable, true, 'an incomplete album link must not fall through to an attraction track');
  malformedAlbumLink.onUnload();

  response = { ...response, audioAlbums: [] }; // backend unpublishes the album while detail stays mounted
  album.onShow(); await tick();
  assert.equal(album.data.album, null, 'returning to album detail revalidates publication');
  const beforeStaleTap = navigation.length;
  album.onEpisodeTap({ currentTarget: { dataset: { id: 'history-1' } } });
  assert.equal(navigation.length, beforeStaleTap, 'a stale episode cannot open');
  knowledge.refresh();
  assert.equal(knowledge.data.visibleAlbums.length, 0, 'old cards clear while content refresh is pending');
  knowledge.onAlbumTap({ currentTarget: { dataset: { id: 'history' } } });
  assert.equal(navigation.length, beforeStaleTap, 'a stale album cannot open');
  await tick();

  const acropolis = content.getAttraction('acropolis');
  assert.deepEqual(Array.from(acropolis.audioGuides, (item) => item.id), ['acropolis-1', 'demo-spot'], 'do not link same-titled audio from another attraction or an album');
  const attractionPage = pageFrom('pages/attraction/detail.js');
  attractionPage.spotId = 'acropolis';
  attractionPage.applySpot(acropolis);
  assert.deepEqual(Array.from(attractionPage.data.onlineGuides, (item) => item.id), ['acropolis-1', 'demo-spot']);
  attractionPage.onGuideCollectionTap({ currentTarget: { dataset: { category: 'online' } } });
  assert.equal(navigation.at(-1), '/pages/audio/collection?attractionId=acropolis&category=online');
  const collection = pageFrom('pages/audio/collection.js');
  collection.onLoad({ attractionId: 'acropolis', category: 'online' }); collection.onShow(); await tick();
  assert.deepEqual(Array.from(collection.data.visibleItems, (item) => item.id), ['acropolis-1', 'demo-spot']);
  collection.onItemTap({ currentTarget: { dataset: { id: 'acropolis-1' } } });
  assert.equal(navigation.at(-1), '/pages/audio/detail?attractionId=acropolis&category=online&trackId=acropolis-1');
  const detail = pageFrom('pages/audio/detail.js');
  const beforeAttractionDetail = requests.length;
  detail.onLoad({ attractionId: 'acropolis', trackId: 'acropolis-1', category: 'online' }); await tick();
  assert.equal(detail.data.track.id, 'acropolis-1');
  assert.equal(requests.length, beforeAttractionDetail + 1, 'attraction page load also avoids /access');
  assert.equal(detail.data.access, null);
  assert.equal(playback.created, 1, 'attraction audio context must only be created after explicit play tap');
  assert.equal(playback.played, 1);
  detail.playPreview();
  assert.equal(playback.created, 2);
  assert.equal(playback.played, 2);
  detail.onHide(); detail.onUnload();
  assert.equal(playback.destroyed, 2);
  const demo = pageFrom('pages/audio/detail.js');
  const beforeDemoRequests = requests.length;
  demo.onLoad({ attractionId: 'acropolis', trackId: 'demo-spot', category: 'online' }); await tick();
  assert.equal(demo.data.demoMode, true);
  assert.equal(requests.length, beforeDemoRequests + 1, 'demo only requests public content, never access');
  demo.playPreview();
  assert.equal(playback.created, 2, 'demo never creates an audio context');
  demo.onUnload();

  response = { ...response, attractions: response.attractions.map((spot) => spot.id === 'acropolis' ? { ...spot, audioGuides: [] } : spot) };
  collection.onShow(); await tick();
  assert.equal(collection.data.visibleItems.length, 0, 'returning to collection revalidates unpublished tracks');
  const beforeCollectionTap = navigation.length;
  collection.onItemTap({ currentTarget: { dataset: { id: 'acropolis-1' } } });
  assert.equal(navigation.length, beforeCollectionTap, 'stale track card cannot open');

  const wrong = pageFrom('pages/audio/detail.js');
  wrong.onLoad({ attractionId: 'acropolis', trackId: 'other-1', category: 'online' }); await tick();
  assert.equal(wrong.data.unavailable, true, 'cross-attraction track ID must not open');
  assert.equal(playback.played, 2);
  wrong.onUnload();
  const routePage = pageFrom('pages/audio/route.js');
  routePage.spot = { id: 'acropolis', audioGuides: [
    track('route-wrong', 'route', { attractionId: 'other', albumId: null, routeId: 'route-1', exhibitId: 'point-1' }),
    track('route-correct', 'route', { attractionId: 'acropolis', albumId: null, routeId: 'route-1', exhibitId: 'point-1' })
  ] };
  routePage.routeId = 'route-1'; routePage.attractionId = 'acropolis';
  routePage.onPointTap({ currentTarget: { dataset: { id: 'point-1' } } });
  assert.equal(navigation.at(-1), '/pages/audio/detail?attractionId=acropolis&pointId=point-1&category=route&trackId=route-correct');

  response = { ...response, attractions: response.attractions.map((spot) => spot.id === 'acropolis' ? { ...spot, audioGuides: [matchingTrack] } : spot) };
  accessReply = 'full';
  const fullDetail = pageFrom('pages/audio/detail.js');
  const beforeFull = requests.length;
  fullDetail.onLoad({ attractionId: 'acropolis', trackId: 'acropolis-1' }); await tick();
  assert.equal(requests.length, beforeFull + 1, 'full playback page also does not prefetch access');
  fullDetail.playFull();
  assert.equal(fullDetail.data.fullPlayback, true);
  assert(fullDetail.audio.src.startsWith(`${origin}/api/miniprogram/audio/acropolis-1/full?token=fixture-`));
  fullDetail.stop();
  const beforeSecondFull = requests.length;
  fullDetail.playFull();
  assert.equal(requests.length, beforeSecondFull + 1, 'every full-play tap requests a fresh signed URL');
  fullDetail.onUnload();
  accessReply = 'preview';
  failAccess = true;
  const accessFailure = pageFrom('pages/audio/detail.js');
  accessFailure.onLoad({ attractionId: 'acropolis', trackId: 'acropolis-1' }); await tick();
  assert.equal(accessFailure.data.accessError, false, 'access has not been requested before the play tap');
  accessFailure.playPreview();
  assert.equal(accessFailure.data.accessError, true, 'access failure shows retry rather than fake playback');
  assert.equal(playback.created, 3);
  accessFailure.onUnload();
  failAccess = false;

  response = base(); failContent = true;
  knowledge.refresh(); album.refresh(); await tick();
  assert.equal(knowledge.data.visibleAlbums.length, 0, 'offline cannot reuse a stale remote album');
  assert.equal(knowledge.data.offline, true);
  assert.equal(album.data.album, null);
  assert.equal(album.data.failed, true, 'offline album page shows a loading failure, not an unpublished-album empty state');
  assert(requests.every((item) => item.url.startsWith(origin + '/')));
  assert(requests.every((item) => item.method === 'GET'));
  const contentGets = requests.filter((item) => item.url.endsWith('/api/content?country=greece&includeAttractionDetails=false')).length;
  const accessGets = requests.length - contentGets;
  console.log(`PASS: empty/published/search/album relation/attraction exact ID/offline/lazy audio; ${contentGets} fixture content GET + ${accessGets} fixture access GET, 0 real requests`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
