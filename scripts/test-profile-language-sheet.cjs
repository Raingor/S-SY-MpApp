// 「我的」页语言切换：入口行 + 底部选择弹窗；选择后写入本地并重载。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const relaunches = [];
let currentLocale = 'zh-CN';

function deepStub() {
  const fn = function () {};
  return new Proxy(fn, {
    get(target, key) {
      if (key === 'then' || key === 'catch') return undefined;
      if (key === Symbol.toPrimitive || key === 'toString') return () => '';
      return deepStub();
    },
    apply() { return deepStub(); }
  });
}

const messages = {
  'zh-CN': { locale: '简体中文', profile: deepStub(), profileDetail: deepStub() },
  'zh-TW': { locale: '繁體中文', profile: deepStub(), profileDetail: deepStub() },
  en: { locale: 'English', profile: deepStub(), profileDetail: deepStub() }
};

const i18nStub = {
  apply(page) {
    page.setData({ locale: currentLocale, i18n: messages[currentLocale] });
    return messages[currentLocale];
  },
  getLocale() { return currentLocale; },
  setLocale(next) { currentLocale = next; return next; },
  languageOptions() { return Object.keys(messages).map((value) => ({ value, label: messages[value].locale })); },
  getMessages(locale = currentLocale) { return messages[locale]; }
};

let definition = null;
const dependencies = {
  '../../utils/auth': {},
  '../../utils/share': { buildShareCard: () => ({}) },
  '../../utils/i18n': i18nStub,
  '../../utils/paid-content': {},
  '../../data/content': {}
};
const sandbox = {
  Page(value) { definition = value; },
  getApp: () => ({ globalData: {} }),
  require(id) {
    assert.ok(Object.prototype.hasOwnProperty.call(dependencies, id), `unexpected require: ${id}`);
    return dependencies[id];
  },
  wx: {
    getWindowInfo: () => ({ statusBarHeight: 20 }),
    getStorageSync: () => '',
    reLaunch: ({ url }) => relaunches.push(url),
    showToast() {}
  }
};
vm.runInNewContext(read('pages/profile/profile.js'), sandbox, { filename: 'pages/profile/profile.js' });

const page = {
  data: JSON.parse(JSON.stringify(definition.data)),
  setData(patch) { Object.assign(this.data, patch); }
};
const tabBar = { data: { hidden: false, selected: 2 }, setData(patch) { Object.assign(this.data, patch); } };
page.getTabBar = () => tabBar;
Object.keys(definition).forEach((key) => {
  if (typeof definition[key] === 'function') page[key] = definition[key].bind(page);
});

// 弹窗默认收起，入口展示当前语言
page.refreshLocale();
assert.equal(page.data.languageSheetOpen, false, 'language sheet stays closed on load');
assert.equal(page.data.languageLabel, '简体中文', 'entry shows the stored language');

page.onLanguageOpen();
assert.equal(page.data.languageSheetOpen, true, 'tapping the entry opens the sheet');
assert.equal(tabBar.data.hidden, true, 'tab bar is hidden so the sheet is not covered');

// 选择当前语言：只收起，不重载
page.onLanguageTap({ currentTarget: { dataset: { locale: 'zh-CN' } } });
assert.equal(page.data.languageSheetOpen, false);
assert.equal(tabBar.data.hidden, false, 'tab bar comes back when the sheet closes');
assert.equal(relaunches.length, 0, 'same-language tap does not reload');

// 选择其他语言：保存并重载
page.onLanguageOpen();
page.onLanguageTap({ currentTarget: { dataset: { locale: 'en' } } });
assert.equal(currentLocale, 'en', 'selected locale is persisted');
assert.equal(page.data.languageSheetOpen, false);
assert.deepEqual(relaunches, ['/pages/profile/profile'], 'switch reloads so every page and the tab bar follow');

const markup = read('pages/profile/profile.wxml');
assert.match(markup, /class="language-entry"[^>]*bindtap="onLanguageOpen"/, 'markup has a single language entry row');
assert.match(markup, /wx:if="\{\{languageSheetOpen\}\}"/, 'sheet renders only when open');
assert.match(markup, /class="language-mask" bindtap="onLanguageClose"/, 'mask dismisses the sheet');
assert.doesNotMatch(markup, /class="language-options"/, 'inline option row is removed');

const styles = read('pages/profile/profile.wxss');
assert.match(styles, /\.language-mask \{[^}]*z-index:\s*1000;/, 'sheet sits above the custom tab bar');
assert.match(styles, /\.language-sheet \{[^}]*env\(safe-area-inset-bottom\)/, 'sheet respects the bottom safe area');
assert.match(read('custom-tab-bar/index.wxml'), /class="tabbar" hidden="\{\{hidden\}\}"/, 'custom tab bar can be hidden by the page');

console.log('PASS: profile language entry opens a bottom sheet, saves the choice and reloads');
