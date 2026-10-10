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
  // 当前 production categories 可由后台调整；页面 Tab 必须与接口中启用分类的 key 集合一致。
  const expectedKeys = (data.destinationCategories || [])
    .filter((category) => category && category.enabled !== false)
    .map((category) => category.key)
    .sort();
  assert.deepStrictEqual(keys.slice().sort(), expectedKeys, '页面 Tab 应与生产接口启用分类一致');
  const islandGroup = groups.find((g) => g.key === 'island');
  assert.equal(islandGroup.tab, '爱琴海境', 'island 三语名称 name 显示');
  const cultureNames = groups.find((g) => g.key === 'culture').tiles.map((t) => t.name);
  assert.ok(cultureNames.includes('雅典'), '雅典在 culture 分类瓷贴');
  assert.ok(data.destinations.length > 0, '生产应返回至少一个目的地');

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

  // 4) 名导讲解视频字段契约（Website 输出 + MpApp 适配层透传）。
  const raw = await new Promise((resolve, reject) => {
    https.get(`${BASE}/api/content?country=greece&includeAttractionDetails=false`, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
  const rawAttractions = raw.attractions || [];
  assert.ok(rawAttractions.length > 0, '原始响应应包含景点');
  const videoFieldKeys = ['expertVideoUrl', 'expertVideoCover', 'expertVideoDuration', 'expertVideoTrialSeconds'];
  assert.ok(rawAttractions.some((a) => videoFieldKeys.some((k) => k in a)), '生产原始响应应包含名导讲解视频字段');
  for (const a of rawAttractions) {
    if ('expertVideoUrl' in a) assert.ok(typeof a.expertVideoUrl === 'string' && a.expertVideoUrl.length > 0, `${a.id} expertVideoUrl 仅在非空时输出`);
    if ('expertVideoCover' in a) assert.ok(typeof a.expertVideoCover === 'string' && a.expertVideoCover.length > 0, `${a.id} expertVideoCover 仅在非空时输出`);
    if ('expertVideoDuration' in a) assert.equal(typeof a.expertVideoDuration, 'number', `${a.id} expertVideoDuration 应为数值`);
    if ('expertVideoTrialSeconds' in a) assert.equal(typeof a.expertVideoTrialSeconds, 'number', `${a.id} expertVideoTrialSeconds 应为数值`);
  }
  // 适配层必须把 video 字段透传到页面层（注入一条真实视频验证）。
  const seed = { expertVideoUrl: 'https://example.com/expert.mp4', expertVideoCover: 'https://example.com/cover.jpg', expertVideoDuration: 300, expertVideoTrialSeconds: 60 };
  const seedId = data.attractions[0].id;
  const seeded = { ...data, attractions: data.attractions.map((a) => (a.id === seedId ? { ...a, ...seed } : a)) };
  const adaptedSeed = content.getAttraction(seedId, seeded);
  assert.equal(adaptedSeed.expertVideoUrl, seed.expertVideoUrl, 'adapter 透传 expertVideoUrl');
  assert.equal(adaptedSeed.expertVideoCover, seed.expertVideoCover, 'adapter 透传 expertVideoCover');
  assert.equal(adaptedSeed.expertVideoDuration, 300, 'adapter 透传 expertVideoDuration');
  assert.equal(adaptedSeed.expertVideoTrialSeconds, 60, 'adapter 透传 expertVideoTrialSeconds');
  assert.equal(typeof content.getAttraction(seedId, data).expertVideoUrl, 'string', '无视频时适配层给空字符串而不是 undefined');

  console.log('PASS: live production contract — destination category tabs, disabled/unknown category handling, expert video field schema and adapter pass-through');
})().catch((e) => { console.error('FAIL:', e.message); process.exitCode = 1; });
