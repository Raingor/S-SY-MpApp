// 定制行程服务流程页：入口改走流程页、CTA 进 tabBar 留资表单、三语文案与品牌齐全。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ---- 页面注册与跳转链路 ----
const appJson = JSON.parse(read('app.json'));
assert.ok(appJson.pages.includes('pages/service-flow/service-flow'), 'service flow page is registered');
assert.ok(appJson.tabBar.list.some((item) => item.pagePath === 'pages/customize/customize'), 'customize stays a tabBar page');
assert.ok(!appJson.tabBar.list.some((item) => item.pagePath === 'pages/service-flow/service-flow'), 'flow page is not a tab');
for (const ext of ['js', 'wxml', 'wxss', 'json']) assert.ok(fs.existsSync(path.join(ROOT, 'pages/service-flow/service-flow.' + ext)), 'flow page has .' + ext);
assert.equal(JSON.parse(read('pages/service-flow/service-flow.json')).navigationStyle, 'custom');

const indexSource = read('pages/index/index.js');
assert.match(indexSource, /onCustomTripTap\(\)\s*\{\s*wx\.navigateTo\(\{\s*url:\s*'\/pages\/service-flow\/service-flow'/, 'homepage custom-trip entry opens the flow page first');
assert.doesNotMatch(indexSource, /switchTab\(\{\s*url:\s*'\/pages\/customize\/customize'\s*\}\)[^]*?onCustomTripTap/, 'entry no longer jumps straight to the form');
assert.match(indexSource, /customization: \(\) => wx\.navigateTo\(\{ url: '\/pages\/service-flow\/service-flow' \}\)/, 'six-entry customization also opens the flow page');

const flowSource = read('pages/service-flow/service-flow.js');
assert.match(flowSource, /wx\.switchTab\(\{\s*url:\s*'\/pages\/customize\/customize'\s*\}\)/, 'CTA reaches the tabBar lead form via switchTab');
assert.doesNotMatch(flowSource, /navigateTo\(\{[^}]*customize/, 'CTA must not use navigateTo for a tab page');
assert.match(read('pages/service-flow/service-flow.wxml'), /bindtap="onStartCustomize"/, 'CTA button is wired in markup');
assert.doesNotMatch(flowSource, /https?:\/\//, 'flow page has no external links');

// ---- 运行时：i18n 三语 + 步骤分组 ----
const i18nModule = { exports: {} };
vm.runInNewContext(read('utils/i18n.js'), {
  wx: { getStorageSync: () => '', setStorageSync() {}, removeStorageSync() {} },
  getApp: () => ({ globalData: {} }),
  module: i18nModule, exports: i18nModule.exports,
  console, setTimeout() { return 0; }, clearTimeout() {}
}, { filename: 'utils/i18n.js' });
const i18n = i18nModule.exports;
const laneOf = ['you', 'crew', 'you', 'you', 'crew', 'you', 'crew', 'crew'];
for (const locale of ['zh-CN', 'zh-TW', 'en']) {
  const flow = i18n.getMessages(locale).serviceFlow;
  assert.ok(flow, locale + ' serviceFlow copy exists');
  assert.equal(flow.steps.length, 8, locale + ': eight flow steps');
  assert.equal(flow.feeList.length, 4, locale + ': four planner fee tiers');
  assert.deepEqual(Array.from(flow.feeList, (fee) => fee[1]), ['¥188', '¥288', '¥288', '¥388'], locale + ': planner fees match the service chart');
  assert.ok(flow.cta && flow.ctaHint && flow.laneYou && flow.laneCrew && flow.laneGreece, locale + ': CTA and lane copy present');
  assert.match(flow.title, /定制旅行服务流程|定製旅行服務流程|service flow/i);
  // 分组语义：1-3 沟通规划、4-6 确认付款、7-8 行前与行程
  const stageOf = [0, 0, 0, 1, 1, 1, 2, 2];
  assert.deepEqual(Array.from(flow.steps, (_, i) => stageOf[i]), [0, 0, 0, 1, 1, 1, 2, 2]);
}
assert.match(i18n.getMessages('zh-CN').serviceFlow.steps[3].desc, /50%/, 'payment rule preserved');
assert.match(i18n.getMessages('zh-CN').serviceFlow.steps[4].desc, /护照首页/, 'lock-file list preserved');

// ---- 页面逻辑：分组渲染 + CTA 行为 ----
let pageConfig;
vm.runInNewContext(flowSource, {
  wx: { getWindowInfo: () => ({ statusBarHeight: 24 }), switchTab(options) { pageConfig._switched = options.url; } },
  getApp: () => ({ globalData: {} }),
  require: (id) => ({ '../../utils/i18n': i18n, '../../utils/share': { buildShareCard: () => ({}) } }[id]),
  Page(config) { pageConfig = config; }
}, { filename: 'pages/service-flow/service-flow.js' });
const page = {
  ...pageConfig,
  data: { ...structuredClone(pageConfig.data) },
  setData(next) { Object.assign(this.data, next); }
};
page.onLoad();
const grouped = page.data.groupedSteps;
assert.equal(grouped.length, 3);
assert.deepEqual(Array.from(grouped, (s) => s.steps.length), [3, 3, 2], 'steps group into 3/3/2 stages');
assert.equal(grouped[0].steps[0].title, i18n.getMessages('zh-CN').serviceFlow.steps[0].title);
assert.ok(grouped.every((stage) => stage.steps.every((step) => step.lane && step.index)), 'each step carries lane and number');
page.onStartCustomize();
assert.equal(pageConfig._switched, '/pages/customize/customize', 'CTA performs the switchTab navigation');

// ---- 样式与品牌 ----
const flowCss = read('pages/service-flow/service-flow.wxss');
assert.match(flowCss, /#0C1B33/, 'deep navy page background');
assert.match(flowCss, /#D8C396/, 'champagne accent used for numbering and slogan');
assert.match(read('pages/service-flow/service-flow.wxml'), /BLUE SEACOAST/, 'brand footer present');
assert.match(read('pages/service-flow/service-flow.wxml'), /只为一生美好回忆/, 'brand slogan present');
assert.match(flowCss, /\.cta\b[\s\S]*?switchTab|\.cta\s*\{/, 'CTA styled as the page button');

console.log('PASS: service flow page registered, homepage routes through it, CTA switchTabs to the customize form, tri-lingual 8-step/fee/brand content renders in 3-3-2 stages');
