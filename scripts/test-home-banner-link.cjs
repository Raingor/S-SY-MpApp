// 首页 Banner link：仅站内 attraction:<id> 跳转，且只有第一张可跳；无 link 维持原行为。离线 fixture。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const navigations = [];
const wx = {
  getStorageSync: () => '', setStorageSync() {}, removeStorageSync() {},
  getWindowInfo: () => ({ statusBarHeight: 20 }), showToast() {}, showModal() {},
  switchTab() {}, pageScrollTo() {}, createInnerAudioContext() { return { onPlay() {}, onPause() {}, onStop() {}, onError() {}, destroy() {}, play() {}, pause() {}, stop() {} }; },
  request(options) { if (String(options.url).includes('/api/content')) return options.success({ statusCode: 200, data: payload }); throw new Error('unexpected ' + options.url); }, navigateTo(o) { navigations.push(o.url); }
};
const cache = new Map();
function loadModule(rel) {
  const file = path.resolve(ROOT, rel.endsWith('.js') ? rel : rel + '.js');
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    module, exports: module.exports, wx, console,
    getApp: () => ({ globalData: { apiBase: 'https://fixture.invalid', contentSettings: {} } }),
    require: (id) => id === './mirror-content' ? { getContent: () => ({}) } : loadModule(path.resolve(path.dirname(file), id))
  }, { filename: file });
  return module.exports;
}
const content = loadModule('data/content.js');
const i18n = loadModule('utils/i18n.js');
content.invalidate();
let payload = null;

async function main() {
  payload = { countries: [], cities: [], attractions: [{ id: 'acropolis', name: '雅典卫城', status: 'published', city: 'athens' }], sampleItineraries: [], routes: [], destinations: [], audioAlbums: [], guideVideos: [], settings: {}, attractionDetailPage: null, heritageGuideBanners: [], miniprogramServiceEntries: [], vehicleService: null, home: { banners: [
    { id: 'hero-1', enabled: true, image: './images/a.webp', link: 'attraction:acropolis' },
    { id: 'hero-2', enabled: true, image: './images/b.webp', link: 'https://evil.example/x' },
    { id: 'hero-3', enabled: true, image: './images/c.webp', link: 'attraction:' },
    { id: 'hero-4', enabled: true, image: './images/d.webp' }
  ] } };
  let definition;
  vm.runInNewContext(read('pages/index/index.js'), {
    wx, Page(value) { definition = value; },
    getApp: () => ({ globalData: { apiBase: 'https://fixture.invalid', contentSettings: {} } }),
    require: (id) => id.endsWith('data/content') ? content : id.endsWith('utils/i18n') ? i18n : id.endsWith('data/luxury') ? loadModule('data/luxury.js') : {}
  }, { filename: 'pages/index/index.js' });
  const data = await new Promise((resolve) => content.loadContent(resolve, true)).then((r) => r.data || r);
  const banners = data.home.banners;
  assert.deepEqual(banners.map((b) => b.link), ['attraction:acropolis', '', '', ''], 'only attraction:<id> links survive; external/empty links are dropped');
  const page = { ...definition, data: structuredClone(definition.data), setData(next) { Object.assign(this.data, next); } };
  page.setData({ heroList: banners, heroCurrent: 0 });
  page.onHeroTap();
  assert.deepEqual(navigations, ['/pages/attraction/detail?id=acropolis'], 'the first banner navigates to the linked attraction');
  page.setData({ heroCurrent: 1 }); page.onHeroTap();
  page.setData({ heroCurrent: 2 }); page.onHeroTap();
  page.setData({ heroCurrent: 3 }); page.onHeroTap();
  assert.equal(navigations.length, 1, 'banners without a valid link keep the previous behaviour');
  // 需求方：只有第一张能跳景点详情，其余轮播即使配了合法 link 也不跳。
  const everyLinked = banners.map((item) => ({ ...item, link: 'attraction:acropolis' }));
  navigations.length = 0;
  page.setData({ heroList: everyLinked, heroCurrent: 0 }); page.onHeroTap();
  assert.deepEqual(navigations, ['/pages/attraction/detail?id=acropolis'], 'first position still navigates');
  for (const heroCurrent of [1, 2, 3]) {
    page.setData({ heroList: everyLinked, heroCurrent });
    page.onHeroTap();
  }
  assert.equal(navigations.length, 1, 'only the first banner may navigate, regardless of its configured link');
  assert.match(read('pages/index/index.js'), /onHeroTap\(\)\s*\{\s*if \(this\.data\.heroCurrent !== 0\) return;/, 'navigation guard is the first-banner check');
  const homeStyles = read('pages/index/index.wxss');
  const heroBox = homeStyles.match(/\.hero \{[^}]*\}/)[0];
  assert.match(heroBox, /height: 750rpx/, 'home banner renders square (full-width 750rpx height) per the client request');
  assert.doesNotMatch(heroBox, /900rpx/, 'no leftover oversized hero height');
  const markup = read('pages/index/index.wxml');
  assert.match(markup, /bindtap="onHeroTap"/);
  console.log('PASS: home banner link=attraction:<id> navigates in-app; external/missing links are inert');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
