// 景点详情板块（路线导览/线上预览/名师讲解）显隐：全局 sections[key].hidden 与分景点 attraction.hiddenSections 合并。
// 语义：hidden===true 或该景点 hiddenSections 包含该 key → 隐藏；只能进一步隐藏，不能复活全局隐藏。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('pages/attraction/detail.js', 'utf8');
const wxml = fs.readFileSync('pages/attraction/detail.wxml', 'utf8');

assert.match(wxml, /wx:if="\{\{!pageCopy\.sections\.expert\.hidden\}\}" id="section-expert"/, 'expert section honours backend hidden');
assert.match(wxml, /wx:if="\{\{!pageCopy\.sections\.route\.hidden\}\}" id="section-routes"/, 'route section honours backend hidden');
assert.match(wxml, /wx:if="\{\{!pageCopy\.sections\.online\.hidden\}\}" id="section-online"/, 'online section honours backend hidden');
assert.match(wxml, /wx:if="\{\{!pageCopy\.sections\.expert\.hidden\}\}"[\s\S]*?expertVideoUrl/, 'expert video block stays inside the hideable section');

let pageConfig;
vm.runInNewContext(source, {
  Page(config) { pageConfig = config; },
  require() { return { getMessages: () => ({ heritage: { expert: '名师讲解' } }) }; },
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

// 全局无隐藏 + 景点无覆盖 → 全显示
page.applyPageCopy(PAGE, { id: 'a', hiddenSections: [] });
assert.equal(page.data.pageCopy.sections.expert.hidden, false);
assert.equal(page.data.pageCopy.sections.route.hidden, false);

// 分景点覆盖：仅该景点隐藏 expert
page.applyPageCopy(PAGE, { id: 'a', hiddenSections: ['expert'] });
assert.equal(page.data.pageCopy.sections.expert.hidden, true, 'per-attraction override hides expert');
assert.equal(page.data.pageCopy.sections.route.hidden, false, 'other sections unaffected');

// 全局隐藏 + 景点无覆盖 → 隐藏；覆盖数组不含的 key 仍受全局控制
page.applyPageCopy({ ...PAGE, sections: { ...PAGE.sections, route: { label: PAGE.sections.route.label, hidden: true } } }, { id: 'a', hiddenSections: [] });
assert.equal(page.data.pageCopy.sections.route.hidden, true, 'global hidden applies without override');

// 只能进一步隐藏：全局隐藏 route，景点覆盖不包含 route 也无法复活
page.applyPageCopy({ ...PAGE, sections: { ...PAGE.sections, route: { label: PAGE.sections.route.label, hidden: true } } }, { id: 'a', hiddenSections: ['expert'] });
assert.equal(page.data.pageCopy.sections.route.hidden, true);
assert.equal(page.data.pageCopy.sections.expert.hidden, true);

// hiddenSections 缺省（旧数据）不报错
page.applyPageCopy(PAGE, { id: 'a' });
assert.equal(page.data.pageCopy.sections.expert.hidden, false);

console.log('PASS: section visibility merges global hidden and per-attraction hiddenSections; override cannot revive global hide');
