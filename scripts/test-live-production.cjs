// Focused live-production integration test for the destination tabs contract.
// Reuses test-live-production.cjs's vm loader + real HTTPS wx.request.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const https = require('node:https');
const assert = require('node:assert/strict');

const BASE = 'https://sy-greece.com';
const modules = new Map();
function loadModule(filename) {
  const resolved = require.resolve(filename);
  if (modules.has(resolved)) return modules.get(resolved).exports;
  const module = { exports: {} };
  modules.set(resolved, module);
  const localRequire = (id) => (id.startsWith('.') ? loadModule(path.resolve(path.dirname(resolved), id)) : require(id));
  vm.runInThisContext('(function(require,module,exports){\n' + fs.readFileSync(resolved, 'utf8') + '\n})', { filename: resolved })(localRequire, module, module.exports);
  return module.exports;
}

const app = { globalData: { apiBase: BASE } };
global.getApp = () => app;
global.wx = {
  getStorageSync: () => '',
  setStorageSync: () => {},
  getWindowInfo: () => ({ statusBarHeight: 24 }),
  request: (opts) => {
    const req = https.get(opts.url, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        let data;
        try { data = JSON.parse(d); } catch (e) { data = {}; }
        opts.success({ statusCode: res.statusCode, data });
      });
    });
    req.on('error', () => { opts.fail && opts.fail(); });
    return { abort() { req.destroy(); } };
  },
  showToast: () => {},
  showModal: () => {},
  navigateTo: (opts) => { process.env.NAV = opts.url; },
};

const content = loadModule('../data/content.js');

(async () => {
  // 1) Real production response: should produce exactly the enabled categories with destinations.
  const data = await new Promise((resolve) => { content.loadContent((d) => resolve(d), true); });
  const groups = content.getHomeDestinations(data, content.getLocale ? undefined : undefined, { culture: '文明溯源', island: '海岛度假', mountain: '山海遗堡' });
  const keys = groups.map((g) => g.key);
  // Production currently only has culture + island published destinations, mountain hidden.
  assert.deepStrictEqual(keys.sort(), ['culture', 'island'], 'mountain 应隐藏：生产仅返回 culture+island，Tab 应为这两个');
  const islandGroup = groups.find((g) => g.key === 'island');
  assert.equal(islandGroup.tab, '爱琴海境', 'island 三语名称 name 显示');
  const cultureNames = groups.find((g) => g.key === 'culture').tiles.map((t) => t.name);
  assert.ok(cultureNames.includes('雅典'), '雅典在 culture 分类瓷贴');
  assert.equal(data.destinations.length === 8, true, '8 个目的地');

  // 2) Simulate Website "disabled a category" by feeding a contract with enabled:false island.
  const disabledData = {
    ...data,
    destinationCategories: [
      { key: 'culture', name: '文明溯源', nameTw: '文明溯源', nameEn: 'Civilization Origins', sort: 1, enabled: true },
      { key: 'island', name: '爱琴海境', nameTw: '愛琴海境', nameEn: 'Aegean Escapes', sort: 3, enabled: false }
    ]
  };
  const afterDisable = content.getHomeDestinations(disabledData, 'zh-CN', { culture: '文明溯源', island: '海岛度假', mountain: '山海遗堡' });
  assert.deepStrictEqual(afterDisable.map((g) => g.key), ['culture'], '禁用 island 后 Tab 仅剩 culture');

  // 3) Unknown type destination must NOT be grouped into any tab.
  const unknownSeed = {
    ...data,
    destinationCategories: data.destinationCategories,
    destinations: [...(data.destinations || []), { id: 'u1', name: '未知', type: 'sculpture', image: './images/u.webp', countryId: 'greece', attractionId: '' }]
  };
  const withUnknown = content.getHomeDestinations(unknownSeed);
  const allTiles = withUnknown.flatMap((g) => g.tiles);
  assert.ok(!allTiles.find((t) => t.id === 'u1'), '未知 type 不进入任何 Tab');

  console.log('PASS: live production contract — mountain hidden, culture+island tabs, island tab name in zh, disabled category removed, unknown type excluded');
})().catch((e) => { console.error('FAIL:', e.message); process.exitCode = 1; });
