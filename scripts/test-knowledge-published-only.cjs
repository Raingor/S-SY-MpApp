const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const spots = [
  { id: 'public-1', name: 'Published Athens', status: 'published', city: 'athens', summary: 'Open to visitors' },
  { id: 'public-enabled-false', name: 'Published despite unrelated enabled flag', status: 'published', enabled: false, city: 'athens', summary: 'Status is authoritative' },
  { id: 'hidden-draft', name: 'Secret Draft', status: 'draft', city: 'athens', summary: 'Must not appear' },
  { id: 'hidden-unpublished', name: 'Removed Delphi', status: 'unpublished', city: 'delphi', summary: 'Must not appear' },
  { id: 'import-2135218d59e8ac91', name: '圣母升天堂（拜占庭教堂）', status: 'unpublished', city: 'athens', summary: 'Must not appear' },
  { id: 'missing-status', name: 'Unknown Status', city: 'athens', summary: 'Must not appear' }
];
let pageDefinition;
const navigations = [];
const content = {
  loadContent(callback) { callback({ attractions: spots, cities: [], sampleItineraries: [] }, { source: 'remote' }); },
  getAttractions(data) { return data.attractions; },
  getCities() { return []; },
  getReferenceList() { return []; },
  getAudioAlbums() { return []; }
};
global.getApp = () => ({ globalData: {} });
global.Page = (config) => { pageDefinition = config; };
global.wx = { navigateTo({ url }) { navigations.push(url); } };
const i18n = { getMessages: () => ({ heritage: {}, knowledgePage: {} }), apply(page) { page.setData({ locale: 'zh-CN', i18n: { heritage: {}, knowledgePage: {} } }); return { heritage: {}, knowledgePage: {} }; } };
const source = fs.readFileSync(require.resolve('../pages/knowledge/knowledge.js'), 'utf8');
vm.runInThisContext(`(function(require, Page, getApp) { ${source}\n})`, { filename: 'pages/knowledge/knowledge.js' })((id) => {
  if (id.includes('data/content')) return content;
  if (id.includes('utils/i18n')) return i18n;
  if (id.includes('utils/share')) return { buildShareCard: () => ({}) };
  if (id.includes('utils/navigation')) return { goBack() {} };
  throw new Error(`Unexpected module: ${id}`);
}, global.Page, global.getApp);

const page = { ...pageDefinition, data: { ...pageDefinition.data }, setData(next) { Object.assign(this.data, next); } };
page.refresh();
assert.deepEqual(page.data.allHotSpots.map((spot) => spot.id), ['public-1', 'public-enabled-false']);
assert.deepEqual(page.data.hotSpots.map((spot) => spot.id), ['public-1', 'public-enabled-false']);
page.onCategoryTap({ currentTarget: { dataset: { id: 'delphi' } } });
assert.deepEqual(page.data.hotSpots, []);
page.onCategoryTap({ currentTarget: { dataset: { id: 'delphi' } } });
page.onSearchInput({ detail: { value: 'Secret Draft' } });
assert.deepEqual(page.data.hotSpots, []);
page.onSearchInput({ detail: { value: 'Removed Delphi' } });
assert.deepEqual(page.data.hotSpots, []);
page.onSearchInput({ detail: { value: '圣母升天堂' } });
assert.deepEqual(page.data.hotSpots, []);
page.onSearchInput({ detail: { value: 'Unknown Status' } });
assert.deepEqual(page.data.hotSpots, []);
page.onSearchConfirm();
assert.deepEqual(navigations, []);
page.onSearchInput({ detail: { value: 'Published Athens' } });
assert.deepEqual(page.data.hotSpots.map((spot) => spot.id), ['public-1']);
page.onSearchInput({ detail: { value: 'Published despite unrelated enabled flag' } });
assert.deepEqual(page.data.hotSpots.map((spot) => spot.id), ['public-enabled-false']);

// The page can remain mounted while an admin unpublishes a sight. Returning to it
// must not expose the previous card during a pending refresh or after the response.
page.onShow(); // first show directly after onLoad/initial refresh
let respond;
content.loadContent = (callback) => { respond = callback; };
page.onShow(); // return from another page
assert.equal(typeof respond, 'function', 'returning to knowledge requests fresh public content');
assert.deepEqual(page.data.hotSpots, [], 'old cards disappear while the refresh is pending');
page.onHotSpotTap({ currentTarget: { dataset: { id: 'public-enabled-false' } } });
assert.deepEqual(navigations, [], 'a stale tap cannot open the old card');
page.onSearchInput({ detail: { value: 'Published despite unrelated enabled flag' } });
assert.deepEqual(page.data.hotSpots, []);
respond({ attractions: spots.map((spot) => spot.id === 'public-enabled-false' ? { ...spot, status: 'unpublished' } : spot) }, { source: 'remote' });
assert.deepEqual(page.data.hotSpots, []);
page.onSearchInput({ detail: { value: 'Published Athens' } });
assert.deepEqual(page.data.hotSpots.map((spot) => spot.id), ['public-1']);
page.onHotSpotTap({ currentTarget: { dataset: { id: 'public-1' } } });
assert.deepEqual(navigations, ['/pages/attraction/detail?id=public-1']);
console.log('PASS: knowledge displays only status=published, filters search/city, and clears stale cards/taps on return before fresh response');
