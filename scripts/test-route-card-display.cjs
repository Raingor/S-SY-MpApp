const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const fixture = {
  settings: {},
  countries: [{ id: 'greece', name: '希腊' }],
  cities: [], attractions: [], routes: [], destinations: [],
  sampleItineraries: [
    { id: 'sample-athens-3d', title: '雅典精华', days: 3, tag: '短途精选｜大陆古迹', crowd: '适合短途建筑爱好者' },
    { id: 'sample-heritage-7d', title: '文明深度游', days: 7, tag: '大陆深度｜建筑研学', crowd: '偏爱多层文明古迹及慢节奏的建筑爱好者'.repeat(3) }
  ]
};

global.getApp = () => ({ globalData: { apiBase: 'https://example.test' } });
global.wx = {
  getStorageSync: () => 'greece',
  request(options) { options.success({ statusCode: 200, data: fixture }); }
};

const moduleCache = new Map();
function loadModule(filename) {
  const resolved = require.resolve(filename);
  if (moduleCache.has(resolved)) return moduleCache.get(resolved).exports;
  const module = { exports: {} };
  moduleCache.set(resolved, module);
  const localRequire = (id) => (id.startsWith('.')
    ? loadModule(path.resolve(path.dirname(resolved), id))
    : require(id));
  vm.runInThisContext('(function(require,module,exports){\n' + fs.readFileSync(resolved, 'utf8') + '\n})', { filename: resolved })(localRequire, module, module.exports);
  return module.exports;
}

const content = loadModule(path.resolve(__dirname, '../data/content.js'));
const load = () => new Promise((resolve) => content.loadContent(resolve, true));

(async () => {
  await load();
  const routes = content.getReferenceList();
  assert.deepStrictEqual(routes.map((route) => route.days), [3, 7], '天数必须直接来自 sampleItineraries.days');
  assert.strictEqual(routes[0].tag, '短途精选｜大陆古迹', '主题标签仍独立保留，不用来推断天数');
  assert.strictEqual(routes[0].crowd, '适合短途建筑爱好者');

  const homeWxml = fs.readFileSync('pages/index/index.wxml', 'utf8');
  const homeWxss = fs.readFileSync('pages/index/index.wxss', 'utf8');
  const homeJs = fs.readFileSync('pages/index/index.js', 'utf8');
  const listingWxml = fs.readFileSync('pages/itinerary/index.wxml', 'utf8');
  const listingJs = fs.readFileSync('pages/itinerary/index.js', 'utf8');
  const detailWxml = fs.readFileSync('pages/itinerary/detail.wxml', 'utf8');

  assert(homeWxml.includes("{{item.days}}{{locale === 'en' ? ' days' : '天'}}"), '首页卡片在原标签位显示本地化天数');
  assert(!homeWxml.includes('{{item.tag}}'), '首页路线卡片不再把主题 tag 当天数');
  assert(homeWxml.includes('class="route-crowd ellipsis-2"'), '首页适合人群最多两行');
  const routeCrowdRule = homeWxss.match(/\.route-crowd\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(routeCrowdRule, /text-align:\s*left;/, '首页每张路线卡的适合人群说明与换行均左对齐');
  assert.match(routeCrowdRule, /overflow-wrap:\s*break-word;/, '窄屏长说明可换行');
  assert(listingWxml.includes("{{item.days}}{{locale === 'en' ? ' days' : '天'}}"), '参考行程列表显示真实天数');
  assert(!listingWxml.includes('{{item.tag}}'), '参考行程列表卡片不再展示旧主题标签 badge');
  assert(listingWxml.includes('class="iti-crowd ellipsis-2"'), '列表适合人群最多两行');
  assert(detailWxml.includes('{{itinerary.crowd}}'), '详情页继续展示完整适合人群');
  assert(homeJs.includes("'/pages/itinerary/detail?id=' + id"), '首页卡片点击进入对应参考行程详情');
  assert(listingJs.includes("'/pages/itinerary/detail?id=' + id"), '列表卡片点击进入对应参考行程详情');

  console.log('PASS: sampleItineraries.days 驱动路线 badge；tag 保持独立；首页/列表 crowd 两行省略；卡片进入详情且详情保留完整 crowd');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
