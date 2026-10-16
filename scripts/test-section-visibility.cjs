// 景点详情板块（路线导览/线上预览/名师讲解）支持后台 hidden 自定义显隐。
// 契约：attractionDetailPage.sections[key].hidden === true 时隐藏；缺省/false/其他值均显示。
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

// 后台显式 hidden: true → 隐藏
page.applyPageCopy({
  sections: {
    expert: { label: { zh: '名师讲解' }, hidden: true },
    route: { label: { zh: '路线导览' } },
    online: { label: { zh: '线上预览' }, hidden: false }
  },
  audioHow: { steps: ['步骤'] }
});
assert.equal(page.data.pageCopy.sections.expert.hidden, true, 'explicit hidden:true hides the section');
assert.equal(page.data.pageCopy.sections.route.hidden, false, 'missing hidden defaults to visible');
assert.equal(page.data.pageCopy.sections.online.hidden, false, 'explicit hidden:false stays visible');
assert.equal(page.data.pageCopy.sections.expert.title, '名师讲解', 'title mapping still works with hidden');

console.log('PASS: expert/route/online sections follow backend hidden flag; default remains visible');
