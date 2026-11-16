// Real adapter and pages with intercepted wx requests; no network, login or payment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const storage = new Map();
const navigation = [];
const requests = [];
const app = { globalData: { apiBase: 'https://fixture.invalid' } };
let offline = false;
const film = {
  id: 'culture & 1', category: 'humanities', status: 'published', sort: 2,
  title: '希腊神话与文明', titleTw: '希臘神話與文明', titleEn: 'Myths and civilization',
  description: '从神话看文明', descriptionTw: '從神話看文明', descriptionEn: 'A journey through mythology',
  cover: '/assets/images/dest/dest-athens.jpg', durationSeconds: 2375,
  accessUrl: '/api/miniprogram/video/culture-1/access'
};
const metadata = { countries: [], guides: [], cities: [], attractions: [], sampleItineraries: [], routes: [], destinations: [], guideVideos: [
  film, { ...film, id: 'first', sort: 1, attractionId: 'athens' },
  { ...film, id: 'tie', sort: 2 }, { ...film, id: 'fourth', sort: 3 },
  { ...film, id: 'draft', status: 'draft' }, { ...film, id: 'disabled', enabled: false },
  { ...film, id: 'legacy', category: undefined, attractionId: 'athens' },
  { ...film, id: 'missing-sight', category: undefined },
  { ...film, id: 'bad-access', accessUrl: 'javascript:bad' }
] };
const wx = {
  getStorageSync: (key) => storage.get(key) || '', setStorageSync: (key, val) => storage.set(key, val),
  showToast() {}, showModal() {}, getWindowInfo: () => ({ statusBarHeight: 24 }),
  navigateTo: (opts) => navigation.push(opts.url),
  request(opts) {
    requests.push(opts.url);
    assert.equal(opts.url, 'https://fixture.invalid/api/content?country=greece&includeAttractionDetails=false');
    if (offline) opts.fail({ errMsg: 'offline' });
    else opts.success({ statusCode: 200, data: metadata });
  }
};
global.wx = wx;
global.getApp = () => app;
const i18n = require('../utils/i18n');
const contentModule = { exports: {} };
vm.runInNewContext(read('data/content.js'), {
  module: contentModule, exports: contentModule.exports, wx, getApp: () => app,
  require: () => ({ getContent: () => ({ guideVideos: [film], attractions: [], cities: [], sampleItineraries: [] }) })
});
const content = contentModule.exports;
let entitlementReads = 0;
const dependencies = {
  '../../data/content': content, '../../utils/i18n': i18n,
  '../../utils/paid-content': { fetchEntitlements(cb) { entitlementReads++; cb(true, { member: true, unlockedVideos: [] }); } },
  '../../utils/guide-video': require('../utils/guide-video'),
  '../../utils/home-audio': require('../utils/home-audio'),
  '../../utils/navigation': { goBack() {} },
  '../../utils/share': require('../utils/share'),
  '../../data/luxury': { getLuxuryCards: () => [] }
};
function page(file) {
  let definition;
  vm.runInNewContext(read(file), { wx, getApp: () => app, Page(value) { definition = value; }, require(id) { assert(id in dependencies, id); return dependencies[id]; } });
  return { ...definition, data: structuredClone(definition.data), setData(next) { Object.assign(this.data, next); } };
}
const plain = (value) => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let n = 0; n < 6; n++) await Promise.resolve(); };
async function main() {
  const { data } = await new Promise((resolve) => content.loadContent((data, state) => resolve({ data, state }), true));
  assert.deepEqual(plain(content.getHumanitiesFilms(data).map((v) => v.id)), ['first', film.id, 'tie', 'fourth'], 'only published humanities, stable sort');
  assert.deepEqual(plain(content.getGuideVideos(data, 'athens').map((v) => v.id)), ['legacy'], 'humanities never appears in sight videos even when related');
  assert.equal(content.getHumanitiesFilms(data)[1].displayDuration, '39:35');
  for (const locale of ['zh-CN', 'zh-TW', 'en']) {
    const copy = i18n.getMessages(locale).humanitiesFilms;
    assert(Object.values(copy).every((value) => typeof value === 'string' && value.trim()));
    assert.deepEqual(Object.keys(copy), Object.keys(i18n.getMessages('zh-CN').humanitiesFilms));
    const expected = locale === 'en' ? film.titleEn : locale === 'zh-TW' ? film.titleTw : film.title;
    assert.equal(content.getHumanitiesFilms(data, locale)[1].displayTitle, expected);
  }
  // 首页不再承载漫游希腊：影集入口移到文史知识库第 3 个面板。
  const home = page('pages/index/index.js');
  home.applyRemoteContent(); await flush();
  assert.equal(home.data.humanitiesFilms, undefined, 'home no longer renders the film section');
  assert.equal(typeof home.onFilmsTap, 'undefined');
  assert.equal(typeof home.onFilmTap, 'undefined');
  const knowledge = page('pages/knowledge/knowledge.js');
  knowledge.onLoad({ panel: '2' }); await flush(); await flush();
  assert.deepEqual(plain(knowledge.data.panelTabs), ['景点精讲', '文史溯源', '实景漫游']);
  assert.equal(knowledge.data.activePanel, 2, 'deep link opens Roaming Greece');
  assert.equal(knowledge.data.visibleRoaming.length, 1, 'published humanities videos share one fallback album');
  assert.equal(knowledge.data.visibleRoaming[0].episodeCount, 4);
  const albumId = knowledge.data.visibleRoaming[0].id;
  const beforeAlbumTap = navigation.length;
  knowledge.onRoamingTap({ currentTarget: { dataset: { id: film.id } } });
  assert.equal(navigation.length, beforeAlbumTap, 'standalone film id is not an album card');
  knowledge.onRoamingTap({ currentTarget: { dataset: { id: albumId } } });
  const albumRoute = '/pages/video/detail?album=' + encodeURIComponent(albumId);
  assert.equal(navigation.at(-1), albumRoute, 'knowledge base opens the roaming album');
  knowledge.onSearchInput({ detail: { value: '神话' } });
  assert.equal(knowledge.data.visibleRoaming.length, 1, 'roaming search matches album titles');
  knowledge.onSearchInput({ detail: { value: 'no such film' } });
  assert.equal(knowledge.data.visibleRoaming.length, 0);
  knowledge.onSearchInput({ detail: { value: '' } });
  const route = '/pages/video/detail?id=culture%20%26%201';
  const list = page('pages/video/index.js');
  list.onLoad(); list.onShow(); await flush();
  assert.equal(list.data.films.length, 1);
  assert.equal(list.data.films[0].episodeCount, 4);
  i18n.setLocale('en'); list.onShow(); await flush();
  list.onSearch({ detail: { value: ' MYTHS ' } });
  assert.equal(list.data.films.length, 1, 'album search trims, ignores case and matches episode titles');
  assert.equal(list.data.films[0].episodeCount, 4);
  list.onSearch({ detail: { value: 'not found' } });
  assert.equal(list.data.films.length, 0);
  list.onSearch({ detail: { value: '' } });
  list.onFilmTap({ currentTarget: { dataset: { id: albumId } } });
  assert.equal(navigation.at(-1), albumRoute);
  const detail = page('pages/video/detail.js');
  detail.onLoad({ id: film.id }); detail.onShow(); await flush();
  assert.equal(detail.data.isHumanities, true);
  assert.equal(detail.data.video.displayTitle, film.titleEn);
  assert.equal(detail.data.video.displaySubject, '', 'standalone film has no invented sight');
  assert.equal(detail.data.video.purchased, false, 'annual membership alone never unlocks film');
  assert.equal(detail.data.videoOpen, null, 'intro never starts playback');
  assert(entitlementReads > 0);
  assert(requests.every((url) => url.includes('/api/content?')), 'no media/access/order requests on navigation');
  detail.onPlay(); assert.equal(detail.data.videoOpen.id, film.id, 'explicit play expands existing authorization component');
  const preview = require('../utils/share-preview').pagePreview('/pages/video/detail', detail);
  assert.equal(preview.image, film.cover, 'public artwork is shareable');
  assert.equal(preview.label, detail.data.i18n.humanitiesFilms.title);
  assert(!JSON.stringify(preview).includes('accessUrl'));
  assert.equal(detail.onShareAppMessage().path, route);
  offline = true;
  detail.refresh(); list.refresh(); home.applyRemoteContent(); await flush();
  assert.equal(detail.data.videoOpen, null);
  detail.onPlay(); assert.equal(detail.data.videoOpen, null, 'failed refresh cannot re-open stale playback');
  assert.equal(list.data.failed, true); assert.equal(list.data.films.length, 0);
  knowledge.refresh(); await flush(); await flush();
  assert.equal(knowledge.data.visibleRoaming.length, 0, 'offline mirror never impersonates published films');
  offline = false; metadata.guideVideos = [];
  detail.refresh(); list.refresh(); await flush();
  assert.equal(detail.data.video, null, 'unpublished film removes purchase and play');
  assert.equal(list.data.films.length, 0); assert.equal(list.data.failed, false);
  const stale = page('pages/video/detail.js');
  metadata.guideVideos = [film];
  stale.onLoad({ id: film.id }); stale.onShow(); stale.onUnload(); await flush();
  assert.equal(stale.data.video, null, 'unload invalidates pending metadata');
  // Shared contract supplied by the Website session after its isolated HTTP regression.
  metadata.guideVideos = JSON.parse(read('scripts/fixtures/humanities-videos.json')).guideVideos;
  const contract = await new Promise((resolve) => content.loadContent(resolve, true));
  const publishedFilms = content.getHumanitiesFilms(contract, 'en');
  assert.equal(publishedFilms.length, 1);
  const contractAlbums = content.getHumanitiesAlbums(contract, 'en');
  assert.equal(contractAlbums.length, 1);
  assert.equal(contractAlbums[0].episodeCount, 1);
  assert.equal(contractAlbums[0].displayTitle, 'Humanities course');
  assert.equal(publishedFilms[0].attractionId, '');
  assert.equal(publishedFilms[0].displayTitle, 'Humanities course');
  assert.equal(publishedFilms[0].displayDuration, '60:00');
  assert.equal(publishedFilms[0].cover, 'https://fixture.invalid/images/humanities-fixture.webp');
  assert.equal(content.getGuideVideos(contract, 'acropolis')[0].id, 'attraction-fixture');
  // 真人景点讲解和博主人文视频独立：同 albumId / 嵌套 videos 也不能混入。
  const mixedFilm = { ...film, id: 'mixed-attraction', category: 'attraction', attractionId: 'acropolis',
    albumId: 'album-mixed', section: 'monuments', episode: 1, title: '卫城遗迹', titleEn: 'Acropolis ruins',
    accessUrl: '/api/miniprogram/video/mixed-attraction/access' };
  const mixedHumanities = { ...film, id: 'mixed-humanities', category: 'humanities', albumId: 'album-mixed',
    section: 'stories', episode: 1, title: '旅途人文', titleEn: 'Travel humanities',
    accessUrl: '/api/miniprogram/video/mixed-humanities/access' };
  metadata.guideVideos = [mixedFilm, mixedHumanities];
  metadata.guideVideoAlbums = [{ id: 'album-mixed', title: '漫游希腊', titleEn: 'Roaming Greece', status: 'published', sort: 1, cover: '',
    sections: [{ key: 'monuments', title: '文明遗迹', sort: 0 }, { key: 'stories', title: '旅途人文', sort: 1 }],
    videos: [mixedFilm, mixedHumanities] }];
  const mixed = await new Promise((resolve) => content.loadContent(resolve, true));
  const mixedAlbums = content.getHumanitiesAlbums(mixed, 'en');
  assert.equal(mixedAlbums.length, 1);
  assert.equal(mixedAlbums[0].id, 'album-mixed');
  assert.equal(mixedAlbums[0].episodeCount, 1);
  assert.equal(mixedAlbums[0].sectionCount, 1);
  assert.deepEqual(mixedAlbums[0].sections.map((section) => section.key), ['stories']);
  assert.equal(mixedAlbums[0].searchText.includes('acropolis ruins'), false, 'roaming search excludes attraction videos');
  assert.equal(content.getGuideVideos(mixed, 'acropolis')[0].id, 'mixed-attraction', 'sight video stays available in its own category');
  assert.equal(mixedAlbums[0].cover, '/assets/images/dest/dest-athens.jpg');
  assert.deepEqual(plain(content.getHumanitiesFilms(mixed, 'en').map((video) => video.id)), ['mixed-humanities']);
  const mixedDetail = content.getGuideVideoAlbum(mixed, 'album-mixed', 'en');
  assert.equal(mixedDetail.episodeCount, 1);
  assert.equal(mixedDetail.sections[0].episodes[0].id, 'mixed-humanities');
  assert.equal(mixedDetail.durationSeconds, Number(mixedHumanities.durationSeconds), 'duration excludes attraction video');
  const attractionOnly = { ...mixed, guideVideos: [mixedFilm], guideVideoAlbums: [{ ...mixed.guideVideoAlbums[0], videos: [mixedFilm] }] };
  assert.equal(content.getGuideVideoAlbum(attractionOnly, 'album-mixed'), null, 'attraction-only album is not a roaming album');
  assert.equal(content.getHumanitiesAlbums(attractionOnly).length, 0);
  const homeMarkup = read('pages/index/index.wxml');
  assert.equal(homeMarkup.indexOf('film-section'), -1, 'home markup has no film section');
  assert.equal(homeMarkup.indexOf('onFilmsTap'), -1);
  const knowledgeMarkup = read('pages/knowledge/knowledge.wxml');
  assert(knowledgeMarkup.indexOf('activePanel === 2') > 0);
  assert(knowledgeMarkup.indexOf('bindtap="onRoamingTap"') > 0);
  assert(knowledgeMarkup.indexOf('i18n.heritage.roaming') > 0);
  assert(JSON.parse(read('app.json')).pages.includes('pages/video/index'));
  assert(JSON.parse(read('app.json')).pages.includes('pages/knowledge/knowledge'));
  // 漫游希臘（人文影集）随年会员观看：不再出现单独购买文案/入口；景点讲解仍保留 ¥168 购买。
  const videoMarkup = read('pages/video/detail.wxml');
  assert.equal(videoMarkup.includes('humanitiesFilms.purchase'), false, 'roaming films never advertise a separate purchase');
  assert(videoMarkup.includes('i18n.humanitiesFilms.memberAccess'), 'roaming films state the annual-member benefit');
  assert(videoMarkup.includes('purchase-allowed="{{false}}"'), 'album player never renders a purchase gate');
  assert(videoMarkup.includes('purchase-allowed="{{!isHumanities}}"'), 'only sight-guide videos keep the purchase gate');
  const albumAbout = videoMarkup.slice(videoMarkup.indexOf('bindtap="onAlbumAbout"'));
  const albumPlayStart = albumAbout.indexOf('audio-album-play-button');
  const albumPlay = albumAbout.slice(albumPlayStart, albumAbout.indexOf('</button>', albumPlayStart));
  assert.equal(albumPlay.includes('guideVideoBuyCta'), false, 'album bottom action never offers a purchase');
  assert(albumPlay.includes('guideVideoPlay'), 'album bottom action plays once access is granted');
  assert(albumPlay.includes('humanitiesFilms.memberCta'), 'album bottom action offers annual membership when the server locks the film');
  for (const locale of ['zh-CN', 'zh-TW', 'en']) {
    const copy = i18n.getMessages(locale).humanitiesFilms;
    assert.ok(copy.memberAccess, locale + ':memberAccess');
    assert.ok(copy.memberRequired && copy.memberCta, locale + ':member gate copy');
    assert.equal(/单独购买|單獨購買|sold separately/.test(JSON.stringify(copy)), false, locale + ' keeps no separate-purchase copy');
  }
  // 同一集回写不能造成 loading→ready 死循环（页面频闪 + 一直“正在加载”）。
  const albumPage = page('pages/video/detail.js');
  albumPage.data = { ...structuredClone(albumPage.data), locale: 'zh-CN', isAlbum: true, isHumanities: true };
  albumPage.data.album = { id: 'album-mixed', episodeCount: 1, sections: [], episodes: [{ id: 'mixed-humanities', title: '旅途人文' }] };
  let writes = 0;
  albumPage.setData = function setData(next) { writes += 1; Object.assign(this.data, next); };
  albumPage.selectEpisode('mixed-humanities');
  albumPage.handleAlbumAccess('ready', 'mixed-humanities');
  const writesAfterReady = writes;
  albumPage.handleAlbumAccess('ready', 'mixed-humanities');
  assert.equal(writes, writesAfterReady, 'repeated ready events with an unchanged purchase flag stop writing to data');
  assert.equal(albumPage.data.videoState, 'ready');
  albumPage.handleAlbumAccess('login', 'mixed-humanities');
  const writesAfterLogin = writes;
  albumPage.handleAlbumAccess('login', 'mixed-humanities');
  assert.equal(writes, writesAfterLogin, 'repeated login gate events do not loop');
  assert.equal(albumPage.data.videoState, 'login');
  // 仅年会员口径：服务端 locked(MEMBER) 时页面进入会员开通态，而不是错误态或可播放态。
  albumPage.handleAlbumAccess('member', 'mixed-humanities');
  assert.equal(albumPage.data.videoState, 'member');
  assert.equal(Boolean(albumPage._purchased['mixed-humanities']), false, 'membership lock is not treated as purchased');
  assert.equal(typeof albumPage.onMember, 'function', 'page exposes the annual-membership CTA handler');
  console.log('PASS: humanities film publishing/category isolation, stable order, 3 locales, home/list/detail navigation, search, offline/deletion/unload and public share metadata; 0 real requests/payments');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
