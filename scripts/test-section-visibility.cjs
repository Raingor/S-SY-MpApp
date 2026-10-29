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

// 生产现状：全局 sections.expert/route.hidden=true 只是默认值；景点带显式 hiddenSections 时以它为权威。
const PRODUCTION_PAGE = {
  sections: {
    expert: { label: { zh: '游览攻略' }, hidden: true },
    route: { label: { zh: '路线导览' }, hidden: true },
    online: { label: { zh: '专业介绍' } }
  },
  audioHow: { steps: ['步骤'] }
};
page.applyPageCopy(PRODUCTION_PAGE, { id: 'acropolis', hiddenSections: ['route'] });
assert.equal(page.data.pageCopy.sections.expert.hidden, false, 'acropolis expert shows: explicit hiddenSections overrides the global default');
assert.equal(page.data.pageCopy.sections.route.hidden, true);
page.applyPageCopy(PRODUCTION_PAGE, { id: 'other', hiddenSections: ['route', 'expert'] });
assert.equal(page.data.pageCopy.sections.expert.hidden, true, 'other sights keep expert hidden');
// 无显式 hiddenSections 的旧数据：回退全局 hidden + overrides 合并。
page.applyPageCopy({ ...PRODUCTION_PAGE, sections: { ...PRODUCTION_PAGE.sections, expert: { label: { zh: '游览攻略' }, hidden: false } } }, { id: 'legacy' });
assert.equal(page.data.pageCopy.sections.expert.hidden, false, 'legacy data without hiddenSections falls back to the global flag');
// online 不可被任何配置隐藏。
for (const hiddenSections of [undefined, [], ['online'], ['route', 'expert', 'online']]) {
  page.applyPageCopy({ ...PRODUCTION_PAGE, sections: { ...PRODUCTION_PAGE.sections, online: { label: { zh: '专业介绍' }, hidden: true } } }, { id: 'a', hiddenSections });
  assert.equal(page.data.pageCopy.sections.online.hidden, false, 'all online visits remain visible');
}
console.log('PASS: explicit per-spot hiddenSections are authoritative over the global section defaults (acropolis expert exposed); online always visible');
