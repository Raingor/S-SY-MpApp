// Isolated check for the Expert Guide optional video feature.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const pageSource = fs.readFileSync(path.join(ROOT, 'pages/attraction/detail.js'), 'utf8');
const markup = fs.readFileSync(path.join(ROOT, 'pages/attraction/detail.wxml'), 'utf8');
const dataSource = fs.readFileSync(path.join(ROOT, 'data/content.js'), 'utf8');

// Markup contract: scoped expert video element only inside the Expert Guide section.
assert(markup.includes('id="expert-video"'), 'expert video element exists');
assert(markup.includes('bindtimeupdate="onExpertVideoTimeUpdate"'), 'expert video has a scoped trial handler');
const expertSection = markup.split('id="section-expert"')[1].split('id="section-video"')[0];
assert(expertSection.includes('<video') && expertSection.includes('id="expert-video"'), 'video element belongs to the Expert Guide section');
const onlineSection = markup.split('id="section-expert"')[0].split('id="section-online"').pop();
assert(!onlineSection.includes('<video'), 'Online Preview section has no video element');
assert(dataSource.includes('expertVideoUrl') && dataSource.includes('expertVideoCover') && dataSource.includes('expertVideoDuration'), 'content adapter passes through expert video fields');
assert(markup.includes('expertVideoUnlocked'), 'unlock state is wired in the template');

// Behavior: expert video enables the shared paywall fetch and exposes video fields from applySpot.
let pageConfig;
const paidCalls = { config: 0, entitlements: 0 };
const contentStub = { getAttractions: () => [] };
vm.runInNewContext(pageSource, {
  Page: (config) => { pageConfig = config; },
  getApp: () => ({ globalData: {} }),
  wx: { navigateTo() {}, switchTab() {}, previewImage() {}, showToast() {}, createVideoContext() { return { pause() {} }; } },
  require: (id) => {
    if (id.includes('data/content')) return contentStub;
    if (id.includes('utils/i18n')) return { getMessages: () => ({ paidContent: { memberAnnual: '会员', member: '会员', trialUnavailable: '暂无试看', trialConfigured: '试看 {seconds} 秒' } }), apply() {} };
    if (id.includes('utils/share')) return { buildShareCard: () => ({}) };
    if (id.includes('utils/navigation')) return { goBack() {} };
    if (id.includes('auth')) return { getAccessToken: () => '' };
    if (id.includes('paid-content')) return {
      fetchConfig(cb) { paidCalls.config++; cb(true, { configured: true, simulation: false, products: {} }); },
      fetchEntitlements(cb) { paidCalls.entitlements++; cb(true, { member: false, purchases: [] }); },
      isUnlocked: () => false
    };
    return {};
  },
  setTimeout, clearTimeout
});
const instance = { ...pageConfig, data: { ...structuredClone(pageConfig.data), locale: 'zh-CN', spot: { id: 's1', videoUrl: '', expertVideoUrl: 'https://example.com/expert.mp4', expertVideoCover: 'cover.jpg', expertVideoDuration: 300, expertVideoTrialSeconds: 60 } }, setData(next) { Object.assign(this.data, next); } };
instance.loadPaidState();
assert.deepEqual(paidCalls, { config: 1, entitlements: 1 }, 'expert video triggers the shared paywall fetch');
instance.applySpot(instance.data.spot);
assert.equal(instance.data.expertVideoUrl, 'https://example.com/expert.mp4');
assert.equal(instance.data.expertVideoCover, 'cover.jpg');
assert.equal(instance.data.expertVideoDuration, 300);
assert.equal(instance.data.expertVideoTrialSeconds, 60);

// Negative: an attraction with only the legacy video keeps the old behavior and does not set expert fields.
const legacy = { ...pageConfig, data: { ...pageConfig.data }, setData(next) { Object.assign(this.data, next); } };
legacy.applySpot({ id: 's2', videoUrl: 'https://example.com/main.mp4' });
assert(!legacy.data.expertVideoUrl, 'legacy attraction video does not populate the expert video field');
console.log('PASS: Expert Guide supports an optional on-location video scoped to the section; Online and legacy attraction video unaffected');
