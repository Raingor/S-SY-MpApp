// Verify city index only shows the city product price supplied by the commerce interface.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const city = { id: 'athens', name: '雅典', priceCny: 0.01, currency: 'CNY' };
const remoteData = { cities: [city] };
let configuredPrice = '';
const content = {
  getCities: () => [city],
  loadContent(callback) { callback(remoteData, { status: 'ready', source: 'remote' }); }
};
const commerce = {
  loadCityState(id, callback) {
    assert.equal(id, 'athens');
    callback({ priceDisplay: configuredPrice, unlocked: false, member: false, simulation: false, products: {} });
  },
  buildPurchaseOptions: () => []
};
const i18n = { getMessages: () => ({ contentPage: {} }), apply() {} };
const modules = {
  '../../data/content': content,
  '../../utils/share': { buildShareCard: () => ({}) },
  '../../utils/navigation': { goBack() {} },
  '../../utils/i18n': i18n,
  '../../utils/auth': {},
  '../../utils/paid-content': {},
  '../../utils/city-commerce': commerce
};
let definition;
const pageSource = fs.readFileSync(path.join(ROOT, 'pages/city/index.js'), 'utf8');
vm.runInThisContext(`(function(require, getApp, wx, Page) {\n${pageSource}\n})`, { filename: 'pages/city/index.js' })(
  (id) => modules[id] || (() => { throw new Error(`Unexpected module: ${id}`); })(),
  () => ({ globalData: {} }),
  { getWindowInfo: () => ({ statusBarHeight: 20 }), getSystemInfoSync: () => ({ statusBarHeight: 20 }) },
  (value) => { definition = value; }
);
function createPage() {
  return { ...definition, data: { ...definition.data }, setData(values) { Object.assign(this.data, values); } };
}

const page = createPage();
page.onLoad({ id: 'athens' });
assert.equal(page.data.cityPriceDisplay, '', 'city content price must not be used as a fallback when commerce config has no city product');
configuredPrice = '¥69.90';
page.refreshCityCommerce();
assert.equal(page.data.cityPriceDisplay, '¥69.90', 'city index displays the price returned by the commerce interface');
console.log('PASS: city index displays only the city product price returned by the commerce interface');
