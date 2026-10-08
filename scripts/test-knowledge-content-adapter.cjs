// Exercise the real MpApp content adapter with an intercepted wx.request.
// No network request leaves this process.
// 约定：已发布景点会下发；后台置为未发布/草稿后，适配层必须把它从前台数据里剔除（不再暴露给页面）。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const modules = new Map();
function loadModule(filename) {
  const resolved = require.resolve(filename);
  if (modules.has(resolved)) return modules.get(resolved).exports;
  const module = { exports: {} };
  modules.set(resolved, module);
  const localRequire = (id) => (id.startsWith('.')
    ? loadModule(path.resolve(path.dirname(resolved), id))
    : require(id));
  vm.runInThisContext('(function(require,module,exports){\n' + fs.readFileSync(resolved, 'utf8') + '\n})', { filename: resolved })(localRequire, module, module.exports);
  return module.exports;
}
const churchId = 'import-2135218d59e8ac91';
let churchStatus = 'published';
let requests = 0;
global.getApp = () => ({ globalData: { apiBase: 'http://fixture.invalid' } });
global.wx = {
  getStorageSync: () => '',
  request(options) {
    assert.equal(options.url, 'http://fixture.invalid/api/content?country=greece&includeAttractionDetails=false');
    assert.equal(options.method, 'GET');
    requests++;
    options.success({ statusCode: 200, data: {
      countries: [], cities: [], guides: [], routes: [], destinations: [], sampleItineraries: [],
      attractions: [{ id: churchId, name: '圣母升天堂（拜占庭教堂）', countryId: 'greece', status: churchStatus }]
    } });
  }
};
const content = loadModule(path.resolve(__dirname, '../data/content.js'));
async function main() {
  let result = await content.fetchContent();
  assert.equal(result.state.source, 'remote');
  assert.equal(content.getAttraction(churchId, result.data).status, 'published');
  assert.equal(content.getAttractions(result.data).length, 1, 'published attraction is exposed');
  churchStatus = 'unpublished';
  result = await content.fetchContent();
  assert.equal(result.state.source, 'remote');
  assert.equal(content.getAttraction(churchId, result.data), null, 'unpublished attraction must not be exposed to pages');
  assert.equal(content.getAttractions(result.data).length, 0, 'unpublished attraction is filtered out of lists');
  assert.equal(requests, 2, 'a second fetch consumes the updated response rather than stale cache');
  console.log('PASS: real content adapter hides unpublished attractions and consumes fresh fixture responses; 0 real network requests');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
