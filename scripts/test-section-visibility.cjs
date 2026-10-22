// 当前景点板块策略：线上游览始终显示，路线/名师讲解隐藏，兼容旧后台隐藏配置。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('pages/attraction/detail.js', 'utf8');
const wxml = fs.readFileSync('pages/attraction/detail.wxml', 'utf8');

assert.match(wxml, /wx:if="\{\{!pageCopy\.sections\.expert\.hidden\}\}" id="section-expert"/, 'expert section binds visibility state');
assert.match(wxml, /wx:if="\{\{!pageCopy\.sections\.route\.hidden\}\}" id="section-routes"/, 'route section binds visibility state');
assert.match(wxml, /wx:if="\{\{!pageCopy\.sections\.online\.hidden\}\}" id="section-online"/, 'online section binds visibility state');
assert.match(wxml, /wx:if="\{\{!pageCopy\.sections\.expert\.hidden\}\}"[\s\S]*?expertVideoUrl/, 'expert video block stays inside the hideable section');

let pageConfig;
vm.runInNewContext(source, {
  Page(config) { pageConfig = config; },
  require() { return { getMessages: () => ({ heritage: { expert: '名师讲解' }, paidContent: {} }) }; },
  wx: { getWindowInfo: () => ({ statusBarHeight: 20 }), showToast() {}, request() {} },
  getApp: () => ({ globalData: {} })
});
const page = { ...pageConfig, data: structuredClone(pageConfig.data), setData(next) { Object.assign(this.data, next); } };
const PAGE = {
  sections: {
    expert: { label: { zh: '名师讲解' } },
    route: { label: { zh: '路线导览' } },
    online: { label: { zh: '线上预览' } }
  },
  audioHow: { steps: ['步骤'] }
};

// 旧全局和分景点隐藏配置都不能隐藏线上游览；仅 route/expert 固定隐藏。
for (const hidden of [false, true]) {
  for (const hiddenSections of [undefined, [], ['online'], ['route', 'expert', 'online']]) {
    const sections = Object.fromEntries(Object.entries(PAGE.sections).map(([key, value]) => [key, { ...value, hidden }]));
    page.applyPageCopy({ ...PAGE, sections }, { id: 'a', hiddenSections });
    assert.equal(page.data.pageCopy.sections.online.hidden, false, 'all online visits remain visible');
    assert.equal(page.data.pageCopy.sections.route.hidden, true, 'all route entries are hidden');
    assert.equal(page.data.pageCopy.sections.expert.hidden, true, 'all expert entries are hidden');
  }
}
console.log('PASS: online visits always visible; only route/expert hidden, including stale global and attraction overrides');
