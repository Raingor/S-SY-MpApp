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

// 真实 utils/paid-content.js 的价格格式化：后台数值价格统一显示两位小数，但保持数值契约不变。
const paidModule = { exports: {} };
vm.runInThisContext(`(function(require, module, exports) {\n${fs.readFileSync(path.join(ROOT, 'utils/paid-content.js'), 'utf8')}\n})`, { filename: 'utils/paid-content.js' })(
  () => ({ getAccessToken: () => '', isSimulationToken: () => false, clearSession() {} }),
  paidModule, paidModule.exports
);
const { productPriceDisplay } = paidModule.exports;
assert.equal(productPriceDisplay({ enabled: true, price: 69.9, currency: 'CNY' }), '¥69.90', 'numeric city price 69.9 renders as ¥69.90');
assert.equal(productPriceDisplay({ enabled: true, price: 9.9, currency: 'CNY' }), '¥9.90', 'album price 9.9 renders as ¥9.90');
assert.equal(productPriceDisplay({ enabled: true, price: 199, currency: 'CNY' }), '¥199.00', 'annual membership 199 renders as ¥199.00');
assert.equal(productPriceDisplay({ enabled: true, price: '¥9.9', currency: 'CNY' }), '¥9.90', 'prefixed string price is normalized');
assert.equal(productPriceDisplay({ enabled: true, price: 10, currency: 'USD' }), 'USD 10.00', 'non-CNY keeps its currency code');
assert.equal(productPriceDisplay({ enabled: false, price: 69.9, currency: 'CNY' }), '', 'disabled product has no price');
assert.equal(productPriceDisplay({ enabled: true, price: '', currency: 'CNY' }), '', 'empty price stays empty');
assert.equal(productPriceDisplay(null), '', 'missing product has no price');
console.log('PASS: city index displays only the city product price returned by the commerce interface; paid-content formats numeric prices to two decimals');
