// 城市页统计数字来自后台 city 记录，管理员可自定义；空值/缺省项不再渲染成 "undefined"。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const translations = (() => {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'utils/i18n.js'), 'utf8'), { module, wx: { getStorageSync: () => 'zh-CN' }, getApp: () => ({ globalData: {} }) });
  return module.exports;
})();
let pageConfig;
const cities = [{ id: 'athens', name: '雅典', museumCount: 13, guidePointCount: 1303, audioMinutes: 2133 }];
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'pages/city/index.js'), 'utf8'), {
  Page: (config) => { pageConfig = config; },
  getApp: () => ({ globalData: {} }),
  wx: { getWindowInfo: () => ({ statusBarHeight: 20 }), switchTab() {}, navigateTo() {} },
  require: (id) => {
    if (id.includes('data/content')) return { getCities: () => cities, loadContent(cb) { cb({ cities }, { source: 'remote', status: 'ready' }); } };
    if (id.includes('utils/share')) return { buildShareCard: () => ({}) };
    if (id.includes('utils/navigation')) return { goBack() {} };
    if (id.includes('utils/i18n')) return { getMessages: (l) => translations.getMessages(l || 'zh-CN'), getLocale: () => 'zh-CN', apply() {} };
    if (id.includes('auth')) return {};
    if (id.includes('paid-content')) return {};
    if (id.includes('city-commerce')) return { loadCityState(_id, cb) { cb({ priceDisplay: '', unlocked: false, member: false, simulation: false, products: {} }); }, buildPurchaseOptions: () => [] };
    return {};
  }
});
function statsFor(spot) {
  const instance = { ...pageConfig, data: { ...pageConfig.data }, setData(next) { Object.assign(this.data, next); } };
  instance.applyCity(spot, 20);
  return instance.data.stats;
}

const custom = statsFor(cities[0]);
assert.equal(custom.map((s) => String(s.value)).join('|'), '13|1,303|2,133', '后台自定义数字按原样展示');

// 后台只填部分字段时，空值不再渲染为 "undefined"。
const partial = statsFor({ ...cities[0], guidePointCount: undefined, audioMinutes: null });
assert.equal(partial.map((s) => String(s.value)).join('|'), '13', '缺省/空的统计项不出现 undefined');

// 0 是合法的自定义值，仍然展示。
const zeros = statsFor({ ...cities[0], museumCount: 0, guidePointCount: 0, audioMinutes: 0 });
assert.equal(zeros.map((s) => String(s.value)).join('|'), '0|0|0', '0 是合法自定义值，仍展示');

console.log('PASS: 城市页统计数字来自后台 city 字段并支持自定义；空字段安全降级');
