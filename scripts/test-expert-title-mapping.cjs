const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('pages/attraction/detail.js', 'utf8');
const i18nSource = fs.readFileSync('utils/i18n.js', 'utf8');

assert.match(i18nSource, /expert: '名师讲解'/, 'zh-CN heritage expert label uses 名师讲解');
assert.match(i18nSource, /expert: '名師講解'/, 'zh-TW heritage expert label uses 名師講解');
assert.doesNotMatch(i18nSource, /名导讲解/, 'zh-CN i18n no longer contains the old 名导讲解 wording');

let pageConfig;
vm.runInNewContext(source, {
  Page(config) { pageConfig = config; },
  require() { return { getMessages: () => ({}) }; },
  wx: { getWindowInfo: () => ({ statusBarHeight: 20 }), showToast() {}, request() {} },
  getApp: () => ({ globalData: {} })
});
const messages = {
  heritage: { expert: '名师讲解' },
  contentPage: { guideLabels: {} }
};
const page = { ...pageConfig, data: structuredClone(pageConfig.data), setData(next) { Object.assign(this.data, next); } };
page.data.i18n = messages;

// 后台仍是旧文案「名导讲解」时，小程序端显示为「名师讲解」。
page.data.locale = 'zh-CN';
page.applyPageCopy({ sections: { expert: { label: { zh: '名导讲解' }, subtitle: { zh: 'EXPERT' } }, online: { label: { zh: '线上预览' } } }, audioHow: { steps: ['步骤'] } });
assert.equal(page.data.pageCopy.sections.expert.title, '名师讲解', 'legacy backend label 名导讲解 displays as 名师讲解');
assert.equal(page.data.pageCopy.sections.online.title, '线上预览', 'other backend labels pass through unchanged');

// 繁体旧文案「名導講解」同样兼容。
page.data.locale = 'zh-TW';
page.applyPageCopy({ sections: { expert: { label: { zh: '名導講解' } } }, audioHow: { steps: [] } });
assert.equal(page.data.pageCopy.sections.expert.title, '名师讲解', 'legacy traditional label 名導講解 displays as 名师讲解');

// 后台自定义的其他标题不被覆盖。
page.data.locale = 'zh-CN';
page.applyPageCopy({ sections: { expert: { label: { zh: '专家导览' } } }, audioHow: { steps: [] } });
assert.equal(page.data.pageCopy.sections.expert.title, '专家导览', 'custom backend expert titles are respected');

console.log('PASS: legacy 名导讲解/名導講解 backend titles display as 名师讲解; custom titles pass through');
