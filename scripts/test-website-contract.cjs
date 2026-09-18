// 端到端联调：用 Website 契约样例（见其 c7900b8 描述）直接驱动 MpApp 适配器与页面逻辑。
// 覆盖：shareTitle/shareImage 可空回退、attractionId 显式关联、双 images/ 折叠、绝对 URL 保留、暂无详情不跳。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

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

const content = loadModule(path.resolve(__dirname, '../data/content.js'));

// Website 契约样例：athens 关联 acropolis；acropolis 配置 shareTitle/shareImage；
// 同时验证双 images/ 折叠、绝对 URL 保留、可空回退、暂无景点的 mykonos。
const websiteFixture = {
  countries: [{ id: 'greece', name: '希腊' }],
  cities: [], guides: [], routes: [], sampleItineraries: [],
  destinationCategories: [
    { key: 'culture', name: '文明溯源', nameTw: '文明溯源', nameEn: 'Heritage', sort: 20, enabled: true },
    { key: 'island', name: '海岛度假', nameTw: '海島度假', nameEn: 'Island escapes', sort: 10, enabled: true },
    { key: 'empty', name: '空分类', sort: 30, enabled: true },
    { key: 'disabled', name: '禁用分类', sort: 1, enabled: false }
  ],
  attractions: [
    {
      id: 'acropolis', name: '雅典卫城', countryId: 'greece',
      image: './images/athens.webp',
      shareTitle: ' 雅典卫城 · 众神栖居的圣岩 ',
      shareImage: './images/share-acropolis.webp'
    },
    {
      id: 'old', name: '旧景点', countryId: 'greece', image: './images/delphi.webp'
      // 无 shareTitle/shareImage → 回退景点名/主图
    }
  ],
  destinations: [
    { id: 'athens', name: '雅典', type: 'culture', image: './images/athens.webp', attractionId: 'acropolis' },
    { id: 'mykonos', name: '米克诺斯', type: 'island', image: './images/destination-mu4yf709-f0dadc.jpg', attractionId: '' },
    { id: 'double', name: '双目录测试', type: 'island', image: './images/images/double-path.jpg' },
    { id: 'unknown', name: '未知分类', type: 'unknown', image: './images/unknown.jpg' }
  ]
};

// 绝对 URL 与双 images/ 归一化样例（绕过 fetch，直接走适配器）。
const edgeFixture = {
  countries: [{ id: 'greece', name: '希腊' }], cities: [], guides: [], routes: [], sampleItineraries: [],
  attractions: [
    { id: 'cdn', name: 'CDN图', countryId: 'greece', image: './images/x.webp', shareTitle: '  ', shareImage: 'https://cdn.example.com/x.jpg' },
    { id: 'double', name: '双目录', countryId: 'greece', image: './images/x.webp', shareImage: 'images/images/double-path.jpg' }
  ],
  destinations: []
};

async function main() {
  // 1) 用 Website 契约样例喂适配器
  let resolveFetch;
  global.getApp = () => ({ globalData: { apiBase: 'https://content.example', countryId: 'greece' } });
  let country = 'greece';
  global.wx = {
    getStorageSync: (k) => k === 'sy_mp_country_id' ? country : '',
    setStorageSync: () => {},
    request: (opts) => { resolveFetch && resolveFetch(opts); return { abort() {} }; },
    showToast: () => {}, showModal: () => {}, navigateTo: () => {}, getWindowInfo: () => ({ statusBarHeight: 20 })
  };
  const p = new Promise((res) => { resolveFetch = (opts) => { opts.success({ statusCode: 200, data: websiteFixture }); res(); }; });
  content.loadContent(() => {}, true);
  await p;
  const data = content.getCountries ? null : null; // cache already set
  const spot = content.getAttraction('acropolis');
  assert.equal(spot.shareTitle, '雅典卫城 · 众神栖居的圣岩', 'shareTitle 去空格');
  assert.equal(spot.shareImage, 'https://content.example/images/share-acropolis.webp', 'shareImage ./images 归一化');
  const old = content.getAttraction('old');
  assert.equal(old.shareTitle, '', '可空回退空串');
  assert.equal(old.shareImage, '', '可空回退空串');

  const groups = content.getHomeDestinations();
  assert.deepEqual(groups.map((group) => group.key), ['island', 'culture'], '按 sort 排序并隐藏空/禁用分类');
  assert.deepEqual(groups.map((group) => group.tab), ['海岛度假', '文明溯源'], '中文分类标签');
  const findTile = (id) => groups.flatMap((g) => g.tiles).find((t) => t.id === id);
  assert.equal(findTile('athens').attractionId, 'acropolis', 'athens→acropolis 透传');
  assert.equal(findTile('mykonos').attractionId, '', 'mykonos 无关联');
  assert.equal(findTile('double').img, 'https://content.example/images/double-path.jpg', '双 images/ 折叠');
  assert.equal(findTile('unknown'), undefined, '未知 type 不误归类');
  const englishGroups = content.getHomeDestinations(undefined, 'en', { culture: 'Heritage', island: 'Island escapes' });
  assert.deepEqual(englishGroups.map((group) => group.tab), ['Island escapes', 'Heritage'], '英文分类标签');

  // 旧接口未返回 destinationCategories 时，回退既有双分类；未知 type 仍不归类。
  content.invalidate();
  let fallbackResolve;
  const fallbackPromise = new Promise((resolve) => { fallbackResolve = resolve; });
  resolveFetch = (opts) => { opts.success({ statusCode: 200, data: { ...websiteFixture, destinationCategories: undefined } }); fallbackResolve(); };
  content.loadContent(() => {}, true);
  await fallbackPromise;
  const fallbackGroups = content.getHomeDestinations();
  assert.deepEqual(fallbackGroups.map((group) => group.key), ['culture', 'island'], '旧接口回退 culture/island');
  assert.equal(fallbackGroups.flatMap((group) => group.tiles).find((tile) => tile.id === 'unknown'), undefined, '回退时未知 type 仍隐藏');

  // 2) 边缘样例：绝对 URL 保留、images/images 折叠
  let r2;
  const p2 = new Promise((res) => { r2 = (opts) => { opts.success({ statusCode: 200, data: edgeFixture }); res(); }; });
  resolveFetch = r2;
  content.invalidate();
  content.loadContent(() => {}, true);
  await p2;
  const cdn = content.getAttraction('cdn');
  assert.equal(cdn.shareTitle, '', '纯空格 shareTitle 视为空');
  assert.equal(cdn.shareImage, 'https://cdn.example.com/x.jpg', '绝对 URL 保留');
  const dbl = content.getAttraction('double');
  assert.equal(dbl.shareImage, 'https://content.example/images/double-path.jpg', 'images/images 折叠为 /images/');

  console.log('PASS: Website 契约联调 — shareTitle/shareImage 可空回退、./images 归一化、绝对URL保留、双images/折叠、attractionId 显式关联透传');
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
