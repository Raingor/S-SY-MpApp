// No production writes: exercise the real adapters/pages with mocked wx.request.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// Mini-program modules are CommonJS; do not inherit the workstation's parent package type.
const modules = new Map();
function loadModule(filename) {
  const resolved = require.resolve(filename);
  if (modules.has(resolved)) return modules.get(resolved).exports;
  const module = { exports: {} };
  modules.set(resolved, module);
  const localRequire = (id) => id.startsWith('.') ? loadModule(path.resolve(path.dirname(resolved), id)) : require(id);
  vm.runInThisContext('(function(require,module,exports){\n' + fs.readFileSync(resolved, 'utf8') + '\n})', { filename: resolved })(localRequire, module, module.exports);
  return module.exports;
}
const app = { globalData: { apiBase: 'https://content.example', countryId: 'greece' } };
let country = 'greece';
const requests = [];
const navigations = [];
const notices = [];
global.getApp = () => app;
global.wx = {
  getStorageSync: (key) => key === 'sy_mp_country_id' ? country : '',
  setStorageSync: (key, value) => { if (key === 'sy_mp_country_id') country = value; },
  request: (options) => requests.push(options),
  showToast: (options) => notices.push(options.title),
  showModal: () => {},
  navigateTo: (options) => navigations.push(options.url),
  getWindowInfo: () => ({ statusBarHeight: 24 })
};
const content = loadModule(path.resolve(__dirname, '../data/content.js'));
function fixture() {
  return {
    countries: [{ id: 'greece', name: '希腊' }], cities: [{ id: 'city-one' }, { id: 'city-two' }], guides: [], routes: [], sampleItineraries: [],
    attractionDetailPage: {
      sections: Object.fromEntries(['overview', 'visitor', 'highlights', 'audioHow', 'route', 'online', 'expert'].map((key) => [key, { label: { zh: key + '标题', en: key + ' title' }, subtitle: { zh: key + '说明', en: key + ' description' } }])),
      audioHow: { steps: [{ zh: '后台步骤', en: 'Backend step' }], note: { zh: '后台说明', en: 'Backend note' } }
    },
    attractions: [
      { id: 'spot & one', name: '测试景点', countryId: 'greece', image: './images/athens.webp', shareTitle: ' 后台分享文案 ', shareImage: './images/custom-share.jpg' },
      { id: 'old', name: '旧景点', countryId: 'greece', image: './images/delphi.webp' },
      { id: 'foreign', name: '跨国景点', countryId: 'italy' }
    ],
    destinations: [
      { id: 'city-one', cityId: 'city-one', name: '同名目的地', type: 'culture', image: './images/uploaded.jpg', attractionId: 'spot & one' },
      { id: 'city-two', cityId: 'city-two', name: '同名目的地', type: 'island', attractionId: '' }
    ]
  };
}
function respond(data) { requests.shift().success({ statusCode: 200, data }); }
function load(force = true) { return new Promise((resolve) => content.loadContent((data) => resolve(data), force)); }
function page(path) {
  let definition;
  global.Page = (value) => { definition = value; };
  loadModule(require.resolve(path));
  return { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(value) { Object.assign(this.data, value); } };
}
async function main() {
  const first = load();
  // In-flight calls must deduplicate even after a timer tick.
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = load();
  assert.equal(requests.length, 1);
  respond(fixture());
  const data = await first;
  assert.equal(await second, data);
  const spot = content.getAttraction('spot & one', data);
  assert.equal(spot.shareTitle, '后台分享文案');
  assert.equal(spot.shareImage, 'https://content.example/images/custom-share.jpg');
  assert.equal(content.getAttraction('old', data).shareImage, '');
  const groups = content.getHomeDestinations(data);
  assert.equal(groups[0].tiles[0].id, 'city-one');
  assert.equal(groups[0].tiles[0].attractionId, 'spot & one');
  assert.equal(groups[0].tiles[0].img, 'https://content.example/images/uploaded.jpg');
  assert.equal(groups[1].tiles[0].attractionId, '');
  assert.equal(await load(false), data);
  assert.equal(requests.length, 0);

  const home = page('../pages/index/index');
  home.destinationContent = data;
  const tap = (id) => home.onDestTap({ currentTarget: { dataset: { attractionId: id } } });
  tap('spot & one');
  assert.equal(navigations[0], '/pages/attraction/detail?id=spot%20%26%20one');
  for (const id of ['', undefined, 'missing', 'foreign']) tap(id);
  assert.equal(navigations.length, 1);
  country = 'italy';
  tap('spot & one');
  assert.equal(navigations.length, 1);
  country = 'greece';
  assert.equal(notices.length, 5);
  assert.match(fs.readFileSync(require.resolve('../pages/index/index.wxml'), 'utf8'), /data-attraction-id="\{\{item.attractionId\}\}"/);
  home.onShow();
  assert.equal(requests.length, 1, 'home onShow requests fresh content');
  respond(fixture());
  await Promise.resolve();

  const detail = page('../pages/attraction/detail');
  detail.onLoad({ id: 'spot & one' });
  detail.onShow();
  assert.equal(requests.length, 1);
  assert.equal(detail.data.loading, true, 'detail stays in loading state while its first content request is pending');
  const detailWxml = fs.readFileSync(require.resolve('../pages/attraction/detail.wxml'), 'utf8');
  assert.match(detailWxml, /wx:if="\{\{spot\}\}"[\s\S]*wx:elif="\{\{loading\}\}"[\s\S]*wx:elif="\{\{!spot\}\}"/);
  const updated = fixture();
  updated.attractions[0].shareTitle = '新分享文字';
  updated.attractions[0].shareImage = 'https://cdn.example/share.jpg';
  respond(updated);
  await Promise.resolve();
  assert.equal(detail.data.loading, false, 'loading ends after a successful detail response');
  assert.equal(detail.data.pageCopy.sections.overview.title, 'overview标题');
  assert.equal(detail.data.pageCopy.audioHow.steps[0].text, '后台步骤');
  assert.deepEqual(detail.onShareAppMessage(), {
    title: '新分享文字', path: '/pages/attraction/detail?id=spot%20%26%20one', imageUrl: 'https://cdn.example/share.jpg'
  });
  detail.loadSpot();
  const oldApi = fixture();
  delete oldApi.attractionDetailPage;
  respond(oldApi);
  await Promise.resolve();
  assert.equal(detail.data.spot, null, 'old API must not render a partially hardcoded attraction detail');
  assert.equal(detail.data.contentError, true);
  assert.equal(detail.data.loading, false, 'loading ends after a failed content response');
  detail.spotId = 'missing-attraction';
  detail.loadSpot();
  assert.equal(detail.data.loading, true, 'missing attraction remains in loading state until the request resolves');
  const noMatch = fixture();
  noMatch.attractions = [];
  respond(noMatch);
  await Promise.resolve();
  assert.equal(detail.data.loading, false);
  assert.equal(detail.data.spot, null);
  assert.equal(detail.data.contentError, false, 'a successful response with no match becomes the genuine empty state');
  detail.spotId = 'spot & one';
  detail.loadSpot();
  detail.spotId = 'old';
  detail.loadSpot();
  assert.equal(detail.data.loading, true);
  assert.equal(requests.length, 1, 'overlapping detail loads share the active content request');
  respond(fixture());
  await Promise.resolve();
  assert.equal(detail.data.spot.id, 'old', 'stale detail callbacks cannot replace the latest requested attraction');
  assert.equal(detail.data.loading, false);
  detail.spotId = 'old';
  detail.applySpot(content.getAttraction('old', data));
  assert.equal(detail.onShareAppMessage().title, '旧景点 · ' + detail.data.i18n.commonSlogan);
  assert.equal(detail.onShareAppMessage().imageUrl, '/assets/images/dest/dest-delphi.jpg');
  detail.data.spot = null;
  assert.equal(detail.onShareAppMessage().path, '/pages/attraction/detail?id=old');
  detail.spotId = '';
  assert.equal(detail.onShareAppMessage().path, '/pages/index/index');

  for (const value of ['/images/share.jpg', 'share.jpg', './images/images/share.jpg', '  ']) {
    const pending = load();
    const sample = fixture();
    sample.attractions[0].shareImage = value;
    sample.attractions[0].shareTitle = '   ';
    respond(sample);
    const adapted = content.getAttraction('spot & one', await pending);
    assert.equal(adapted.shareImage, value.trim() ? 'https://content.example/images/share.jpg' : '');
    assert.equal(adapted.shareTitle, '');
  }
  content.invalidate();
  const reloaded = load(false);
  assert.equal(requests.length, 1);
  respond(fixture());
  await reloaded;
  console.log('PASS: adapters, explicit ID navigation, missing/cross-country links, share overrides/fallbacks/encoded path, refresh and request deduplication');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
