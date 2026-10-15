// Public content adapter + collection lifecycle fixture; no real network/audio requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const origin = 'http://fixture.invalid';
const navigation = [];
let requests = 0;
let locale = 'zh-CN';
const track = (id, options = {}) => ({
  id, title: id, category: 'online', attractionId: 'acropolis', status: 'published',
  previewUrl: `/fixture/${id}/preview`, ...options
});
const tracks = [
  track('regular'),
  track('string-pin', { isPinned: 'false' }),
  track('pinned-a', { isPinned: true, titleEn: 'Pinned A', titleTw: '置頂甲', description: 'needle' }),
  track('legacy', { description: 'needle' }),
  track('pinned-demo', { isPinned: true, isDemo: true, previewUrl: '' }),
  track('pinned-b', { isPinned: true }),
  track('expert-regular', { category: 'expert' }),
  track('expert-pinned', { category: 'expert', isPinned: true }),
  track('pinned-route', { category: 'route', isPinned: true }),
  track('pinned-other', { attractionId: 'other', isPinned: true }),
  track('pinned-draft', { status: 'draft', isPinned: true }),
  track('pinned-album', { albumId: 'history', isPinned: true })
];
const response = {
  cities: [], routes: [], destinations: [], sampleItineraries: [],
  attractions: [{ id: 'acropolis', name: '雅典卫城', status: 'published', audioGuides: tracks }]
};
global.getApp = () => ({ globalData: { apiBase: origin } });
global.wx = {
  getStorageSync: () => '',
  getSystemInfoSync: () => ({ statusBarHeight: 20 }),
  request(options) {
    assert.equal(options.method, 'GET');
    assert.equal(options.url, `${origin}/api/content?country=greece&includeAttractionDetails=false`);
    requests++;
    options.success({ statusCode: 200, data: JSON.parse(JSON.stringify(response)) });
  },
  navigateTo({ url }) { navigation.push(url); },
  createInnerAudioContext() { throw new Error('Collection must never create audio playback'); }
};
const content = require('../data/content');
const i18n = {
  getMessages: () => ({ heritage: { online: '线上游览', expert: '名师讲解', preview: '试听', secondsUnit: '秒' } }),
  apply(page) { page.setData({ locale, i18n: this.getMessages() }); }
};
function createCollection(category = 'online') {
  let definition;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/audio/collection.js'), 'utf8'), {
    wx: global.wx,
    Page(config) { definition = config; },
    require(id) {
      if (id === '../../data/content') return content;
      if (id === '../../utils/i18n') return i18n;
      if (id === '../../utils/navigation') return { goBack() {} };
      throw new Error(`Unexpected module: ${id}`);
    }
  });
  const page = { ...definition, data: { ...definition.data }, setData(values) { Object.assign(this.data, values); } };
  page.onLoad({ attractionId: 'acropolis', category });
  page.onShow();
  return page;
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
const ids = (page) => Array.from(page.data.visibleItems, (item) => item.id);

(async () => {
  const collection = createCollection();
  await tick();
  assert.deepEqual(ids(collection), ['pinned-a', 'pinned-demo', 'pinned-b', 'regular', 'string-pin', 'legacy'], 'pins first, stable API order within each group, unrelated/draft/album records excluded');
  assert.deepEqual(Array.from(collection.data.items, (item) => item.id), ['regular', 'string-pin', 'pinned-a', 'legacy', 'pinned-demo', 'pinned-b'], 'source order is preserved');
  assert.equal(content.getAttraction('acropolis').audioGuides.find((item) => item.id === 'pinned-a').isPinned, true, 'public content adapter retains the pin field');

  collection.onFilterTap({ currentTarget: { dataset: { filter: 'audio' } } });
  assert.deepEqual(ids(collection), ['pinned-a', 'pinned-b', 'regular', 'string-pin', 'legacy'], 'audio filter retains pin priority');
  collection.onSearchInput({ detail: { value: 'needle' } });
  assert.deepEqual(ids(collection), ['pinned-a', 'legacy'], 'search retains pin priority');
  collection.onSearchInput({ detail: { value: '' } });
  collection.onFilterTap({ currentTarget: { dataset: { filter: 'all' } } });

  for (const language of ['zh-TW', 'en']) {
    locale = language;
    collection.onShow(); await tick();
    assert.deepEqual(ids(collection), ['pinned-a', 'pinned-demo', 'pinned-b', 'regular', 'string-pin', 'legacy'], `${language} refresh retains ordering`);
    assert.equal(collection.data.visibleItems[0].displayTitle, language === 'en' ? 'Pinned A' : '置頂甲');
  }
  collection.onItemTap({ currentTarget: { dataset: { id: 'pinned-a' } } });
  assert.equal(navigation.at(-1), '/pages/audio/detail?attractionId=acropolis&category=online&trackId=pinned-a', 'reordering preserves track navigation');

  tracks.find((item) => item.id === 'pinned-a').isPinned = false;
  collection.onShow(); await tick();
  assert.deepEqual(ids(collection), ['pinned-demo', 'pinned-b', 'regular', 'string-pin', 'pinned-a', 'legacy'], 'unpinning is refreshed on re-entry');

  const expert = createCollection('expert');
  await tick();
  assert.deepEqual(ids(expert), ['expert-pinned', 'expert-regular'], 'expert collection shares the pinned-first rule');

  tracks.forEach((item) => { delete item.isPinned; });
  collection.onShow(); await tick();
  assert.deepEqual(ids(collection), ['regular', 'string-pin', 'pinned-a', 'legacy', 'pinned-demo', 'pinned-b'], 'legacy payload without pins retains the original order');
  response.attractions[0].audioGuides = [];
  collection.onShow(); await tick();
  assert.deepEqual(ids(collection), [], 'unpublished/removed records clear on refresh');
  console.log(`PASS: pinned ordering, stable groups, public adapter, search/filter, locales, unpin refresh, category isolation and navigation; ${requests} fixture GETs, 0 real requests`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
