// Simulate an admin "category dropdown change" on the real production payloads
// (without touching production DB) to prove the mini-program re-renders tabs
// dynamically on next force-refresh.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const https = require('node:https');

const modules = new Map();
function load(filename) {
  const resolved = require.resolve(filename);
  if (modules.has(resolved)) return modules.get(resolved).exports;
  const module = { exports: {} };
  modules.set(resolved, module);
  const localRequire = (id) => (id.startsWith('.') ? load(path.resolve(path.dirname(resolved), id)) : require(id));
  vm.runInThisContext('(function(require,module,exports){\n' + fs.readFileSync(resolved, 'utf8') + '\n})', { filename: resolved })(localRequire, module, module.exports);
  return module.exports;
}

global.getApp = () => ({ globalData: { apiBase: 'https://sy-greece.com' } });
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
  navigateTo: () => {},
};

const content = load('../data/content.js');

content.loadContent((data) => {
  // Scenario A: 克里特 (crete) is moved island -> mountain (mountain category kept enabled by admin).
  const retagged = {
    ...data,
    destinationCategories: [
      ...data.destinationCategories,
      { key: 'mountain', name: '山海遗堡', nameTw: '山海遺堡', nameEn: 'Mountain stronghold', sort: 2, enabled: true }
    ],
    destinations: data.destinations.map((x) => (x.id === 'crete' ? { ...x, type: 'mountain' } : x))
  };
  let groups = content.getHomeDestinations(retagged, 'zh-CN');
  console.log('A: tabs =', groups.map((g) => `${g.key}(${g.tiles.length})`).join(', '));
  const mt = groups.find((g) => g.key === 'mountain');
  console.log('A: mountain tab tiles =', mt ? mt.tiles.map((t) => t.name).join(', ') : 'N/A');
  console.log('A: island lost 克里特 ->', (groups.find((g) => g.key === 'island').tiles.find((t) => t.id === 'crete') ? 'still' : 'gone'));

  // Scenario B: 克里特 moved back to island -> mountain tab disappears (no mountain destinations).
  const reverted = {
    ...retagged,
    destinations: data.destinations.map((x) => (x.id === 'crete' ? { ...x, type: 'island' } : x))
  };
  const g2 = content.getHomeDestinations(reverted, 'zh-CN');
  console.log('B: tabs =', g2.map((g) => g.key).join(', '));
  console.log('B: mountain hidden =', !g2.find((g) => g.key === 'mountain'));
}, true);
