// 后台按页面配置转发标题/图片；未配置图片时使用页面首图，未配置标题时沿用页面标题+摘要。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const cache = new Map();
const app = { globalData: {} };
const payload = {
  cities: [], attractions: [], sampleItineraries: [], routes: [], destinations: [],
  shareCards: [
    { route: '/pages/index/index?from=menu', title: '后台首页标题', description: '后台首页摘要', image: './images/share-home.jpg', sort: 1 },
    { route: '/pages/knowledge/knowledge/', titleTw: '後台知識庫', image: 'https://cdn.invalid/share-knowledge.webp', sort: 2 },
    { route: '/pages/vehicle/vehicle', title: '用车转发标题', sort: 3 },
    { route: '/pages/city/index', title: '城市转发标题', sort: 4 },
    { route: '/pages/car/car', title: '草稿不该生效', status: 'draft' }
  ]
};
const wx = {
  getStorageSync: () => '', setStorageSync() {}, showToast() {}, showModal() {},
  request: (options) => options.success({ statusCode: 200, data: payload })
};
function load(rel) {
  const file = path.resolve(ROOT, rel.endsWith('.js') ? rel : rel + '.js');
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    module, exports: module.exports, require: (id) => load(path.resolve(path.dirname(file), id)),
    wx, getApp: () => app, console, setTimeout, clearTimeout, Date,
    Page: () => {}, Component: () => {}
  }, { filename: file });
  return module.exports;
}
const content = load('data/content');
const i18n = load('utils/i18n');
const { buildShareCard } = load('utils/share');
const page = (locale, data = {}) => ({ data: { i18n: i18n.getMessages(locale), locale, ...data } });

async function main() {
  const result = await new Promise((resolve) => content.loadContent((data, state) => resolve({ data, state })));
  assert.equal(result.state.source, 'remote');
  const cards = app.globalData.shareCards;
  assert.equal(cards.length, 4, 'draft share card is ignored');
  assert.equal(cards[0].route, '/pages/index/index', 'route drops query string');
  assert.equal(cards[1].route, '/pages/knowledge/knowledge', 'route drops trailing slash');
  assert.equal(cards[0].image, 'https://sy-greece.com/images/share-home.jpg', 'relative image is resolved to the media host');

  const match = content.getShareCard(cards, '/pages/knowledge/knowledge?panel=2');
  assert.ok(match, 'route match ignores query');
  assert.equal(content.localizeShareCard(match, 'zh-TW').title, '後台知識庫');
  assert.equal(content.localizeShareCard(match, 'zh-CN').title, '', 'missing locale falls back to empty, not another locale');
  assert.equal(content.localizeShareCard(match, 'en').image, 'https://cdn.invalid/share-knowledge.webp');
  assert.equal(content.getShareCard(cards, '/pages/business/business'), null);

  const home = page('zh-CN', { heroCopy: { title: '页面标题', description: '页面摘要' }, heroList: [{ img: '/assets/images/hero/home.jpg' }] });
  let rendered;
  home.selectComponent = () => ({ render: async (spec) => { rendered = spec; return '/tmp/share.jpg'; } });
  const configured = buildShareCard('/pages/index/index?from=menu', home);
  assert.equal(configured.title, '后台首页标题', 'backend title is used verbatim, no page summary appended');
  assert.equal(configured.imageUrl, 'https://sy-greece.com/images/share-home.jpg', 'backend image wins over the page hero');
  assert.equal((await configured.promise).imageUrl, '/tmp/share.jpg');
  assert.equal(rendered.title, '后台首页标题');
  assert.equal(rendered.summary, '后台首页摘要');
  assert.equal(rendered.image, 'https://sy-greece.com/images/share-home.jpg');

  const fallback = page('zh-CN', { heroCopy: { title: '页面标题', description: '页面摘要' }, heroList: [{ img: '/assets/images/hero/home.jpg' }] });
  const plain = buildShareCard('/pages/travel-guide/travel-guide', fallback);
  assert.ok(plain.title.indexOf('｜') > 0, 'unconfigured page keeps page title + summary');
  const configuredNoImage = buildShareCard('/pages/vehicle/vehicle', page('zh-CN', { service: { title: '用车服务', description: '用车重点' } }));
  assert.equal(configuredNoImage.title, '用车转发标题');
  assert.equal(configuredNoImage.imageUrl, '/assets/images/hero/hero-santorini.jpg', 'missing backend image and page image uses the brand default');
  const pageFirstImage = buildShareCard('/pages/knowledge/knowledge', page('zh-TW', { activePanel: 1, visibleAlbums: [{ cover: '/album.jpg' }] }));
  assert.equal(pageFirstImage.title, '後台知識庫');
  assert.equal(pageFirstImage.imageUrl, 'https://cdn.invalid/share-knowledge.webp', 'configured image still wins');
  const pageFirstOnly = buildShareCard('/pages/city/index?id=athens', page('zh-CN', { city: { name: '雅典', description: '文明探索', cover: '/city.jpg' } }));
  assert.equal(pageFirstOnly.title, '城市转发标题');
  assert.equal(pageFirstOnly.imageUrl, '/city.jpg', 'card without image falls back to the page first image');

  const profile = buildShareCard('/pages/profile/index', page('zh-CN', {}));
  assert.equal(profile.path, '/pages/index/index', 'profile pages still share the public home entry');
  assert.equal(profile.title, '后台首页标题');
  console.log('PASS share cards: backend title/image, first-image fallback, draft ignored');
}
main().catch((error) => { console.error(error); process.exit(1); });