// Native API bridge fixture: never opens Channels or requests a real service.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const calls = [];
const toasts = [];
global.wx = { getStorageSync: () => 'zh-CN', showToast: (options) => toasts.push(options) };
global.getApp = () => ({ globalData: {} });
const i18n = require('../utils/i18n');
let definition;
vm.runInNewContext(fs.readFileSync(path.join(root, 'pages/index/index.js'), 'utf8'), {
  Page(config) { definition = config; },
  wx: global.wx,
  getApp: global.getApp,
  require(id) {
    if (id === '../../utils/i18n') return i18n;
    if (id === '../../data/luxury') return { getLuxuryCards: () => [] };
    if (id === '../../data/content' || id === '../../utils/share') return {};
    throw new Error(`Unexpected module: ${id}`);
  }
});
const page = { ...definition, data: { ...definition.data } };
assert.equal(calls.length, 0, 'page creation does not open an external profile');
for (const locale of ['zh-CN', 'zh-TW', 'en']) {
  page.data.i18n = i18n.getMessages(locale);
  const copy = page.data.i18n.homeChannels;
  for (const key of ['label', 'title', 'description', 'action', 'unsupported', 'openFailed']) {
    assert.equal(typeof copy[key], 'string');
    assert(copy[key].trim(), `${locale}.${key} must be translated`);
  }

  delete wx.openChannelsUserProfile;
  page.onChannelsTap();
  assert.equal(toasts.at(-1).title, copy.unsupported, 'older WeChat receives a localized compatibility message');
  const count = toasts.length;
  wx.openChannelsUserProfile = (options) => calls.push(options);
  page.onChannelsTap();
  assert.equal(calls.at(-1).finderUserName, 'sphh8gpNu8tw4yv', 'tap opens the user-provided Channels ID exactly');
  assert.equal(toasts.length, count, 'opening the profile does not show a false error');
  calls.at(-1).fail({ errMsg: 'fixture unavailable' });
  assert.equal(toasts.at(-1).title, copy.openFailed, 'API failures use the active language');
  assert.equal(toasts.at(-1).icon, 'none');
}
assert.equal(calls.length, 3, 'one profile request per supported tap');
const markup = fs.readFileSync(path.join(root, 'pages/index/index.wxml'), 'utf8');
const entry = markup.indexOf('class="home-channels-card card"');
assert(entry > markup.indexOf('class="entries card"') && entry < markup.indexOf('DESTINATIONS'), 'Channels recommendation is placed between services and destinations');
assert(markup.includes('bindtap="onChannelsTap"'), 'the entry is wired to the native API handler');
console.log('PASS: homepage Channels entry, exact profile ID, native API fallback/failure and three languages; 0 real requests');
