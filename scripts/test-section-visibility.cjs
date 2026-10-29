// 当前景点板块策略：online 始终显示；route/expert 显隐完全由服务端（全局 hidden + hiddenSections）决定。
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

// online 不可被任何配置隐藏；route/expert 跟随服务端（全局 hidden 与 hiddenSections 任一为真即隐藏）。
for (const hidden of [false, true]) {
  for (const hiddenSections of [undefined, [], ['route'], ['expert'], ['route', 'expert'], ['online']]) {
    const sections = Object.fromEntries(Object.entries(PAGE.sections).map(([key, value]) => [key, { ...value, hidden }]));
    page.applyPageCopy({ ...PAGE, sections }, { id: 'a', hiddenSections });
    assert.equal(page.data.pageCopy.sections.online.hidden, false, 'all online visits remain visible');
    assert.equal(page.data.pageCopy.sections.route.hidden, hidden || (hiddenSections || []).includes('route'), 'route follows the server contract');
    assert.equal(page.data.pageCopy.sections.expert.hidden, hidden || (hiddenSections || []).includes('expert'), 'expert follows the server contract');
  }
}
// 生产现状：acropolis hiddenSections=['route'] → expert 显影；其余106景点仍 ['route','expert']。
page.applyPageCopy({ ...PAGE, sections: PAGE.sections }, { id: 'acropolis', hiddenSections: ['route'] });
assert.equal(page.data.pageCopy.sections.expert.hidden, false, 'acropolis expert section shows for the guide video entry');
page.applyPageCopy({ ...PAGE, sections: PAGE.sections }, { id: 'other', hiddenSections: ['route', 'expert'] });
assert.equal(page.data.pageCopy.sections.expert.hidden, true, 'other sights keep expert hidden');
console.log('PASS: online always visible; route/expert visibility fully server-driven (acropolis expert exposed, others stay hidden)');
