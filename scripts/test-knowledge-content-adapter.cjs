// Exercise the real MpApp content adapter with an intercepted wx.request.
// No network request leaves this process.
const assert = require('node:assert/strict');
const churchId = 'import-2135218d59e8ac91';
let churchStatus = 'published';
let requests = 0;
global.getApp = () => ({ globalData: { apiBase: 'http://fixture.invalid' } });
global.wx = {
  getStorageSync: () => '',
  request(options) {
    assert.equal(options.url, 'http://fixture.invalid/api/content?country=greece');
    assert.equal(options.method, 'GET');
    requests++;
    options.success({ statusCode: 200, data: {
      countries: [], cities: [], guides: [], routes: [], destinations: [], sampleItineraries: [],
      attractions: [{ id: churchId, name: '圣母升天堂（拜占庭教堂）', countryId: 'greece', status: churchStatus }]
    } });
  }
};
const content = require('../data/content');
async function main() {
  let result = await content.fetchContent();
  assert.equal(result.state.source, 'remote');
  assert.equal(content.getAttraction(churchId, result.data).status, 'published');
  churchStatus = 'unpublished';
  result = await content.fetchContent();
  assert.equal(result.state.source, 'remote');
  assert.equal(content.getAttraction(churchId, result.data).status, 'unpublished');
  assert.equal(requests, 2, 'a second fetch consumes the updated response rather than stale cache');
  console.log('PASS: real content adapter preserves attraction status and consumes fresh fixture responses; 0 real network requests');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
