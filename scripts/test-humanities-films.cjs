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
  require: () => ({ getContent: () => ({ guideVideos: [film], attractions: [] }) })
});
const content = contentModule.exports;
let entitlementReads = 0;
const dependencies = {
  '../../data/content': content, '../../utils/i18n': i18n,
  '../../utils/paid-content': { fetchEntitlements(cb) { entitlementReads++; cb(true, { member: true, unlockedVideos: [] }); } },
  '../../utils/guide-video': require('../utils/guide-video'),
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
  const home = page('pages/index/index.js');
  home.applyRemoteContent(); await flush();
  assert.equal(home.data.humanitiesFilms.length, 3);
  assert.equal(home.data.filmCount, 4);
  home.onFilmTap({ currentTarget: { dataset: { id: film.id } } });
  const route = '/pages/video/detail?id=culture%20%26%201';
  assert.equal(navigation.at(-1), route, 'homepage encodes standalone ID, no fabricated sight');
  home.onFilmsTap(); assert.equal(navigation.at(-1), '/pages/video/index');
  const list = page('pages/video/index.js');
  list.onLoad(); list.onShow(); await flush();
  assert.equal(list.data.films.length, 4);
  i18n.setLocale('en'); list.onShow(); await flush();
  list.onSearch({ detail: { value: ' MYTHS ' } });
  assert.equal(list.data.films.length, 4, 'localized search trims and ignores case');
  list.onSearch({ detail: { value: 'not found' } });
  assert.equal(list.data.films.length, 0);
  list.onSearch({ detail: { value: '' } });
  list.onFilmTap({ currentTarget: { dataset: { id: film.id } } });
  assert.equal(navigation.at(-1), route);
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
  assert.equal(home.data.humanitiesFilms.length, 0, 'offline mirror never impersonates published films');
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
  assert.equal(publishedFilms[0].attractionId, '');
  assert.equal(publishedFilms[0].displayTitle, 'Humanities course');
  assert.equal(publishedFilms[0].displayDuration, '60:00');
  assert.equal(publishedFilms[0].cover, 'https://fixture.invalid/images/humanities-fixture.webp');
  assert.equal(content.getGuideVideos(contract, 'acropolis')[0].id, 'attraction-fixture');
  const markup = read('pages/index/index.wxml');
  assert(markup.indexOf('class="film-section section"') > markup.indexOf('home-channels-card'));
  assert(markup.indexOf('class="film-section section"') < markup.indexOf('DESTINATIONS'));
  assert(JSON.parse(read('app.json')).pages.includes('pages/video/index'));
  console.log('PASS: humanities film publishing/category isolation, stable order, 3 locales, home/list/detail navigation, search, offline/deletion/unload and public share metadata; 0 real requests/payments');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
