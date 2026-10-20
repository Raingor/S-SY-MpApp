const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const highlightsWxml = fs.readFileSync('pages/attraction/detail.wxml', 'utf8');
const highlightsWxss = fs.readFileSync('pages/attraction/detail.wxss', 'utf8');
const playerWxml = fs.readFileSync('pages/audio/detail.wxml', 'utf8');
const playerWxss = fs.readFileSync('pages/audio/detail.wxss', 'utf8');
const playerSource = fs.readFileSync('pages/audio/detail.js', 'utf8');

assert.equal((highlightsWxml.match(/highlight-card-no-image/g) || []).length, 2, 'both highlight layouts mark cards without an image');
assert.match(highlightsWxss, /\.highlight-card-no-image\s*\{\s*min-height:\s*0;/, 'a missing image removes the fixed card height');
assert.match(playerWxml, /class="audio-detail-scroll"[^>]*padding-top: \{\{statusBarHeight \+ 58\}\}px;/, 'audio artwork starts closer below the navigation bar');
assert.match(playerWxml, /class="audio-attraction-intro"[^>]*>[\s\S]*?\{\{spotIntro\}\}/, 'audio player renders the attraction introduction');
assert.match(playerWxml, /\{\{trackIntro\}\}/, 'album episode page renders the episode introduction');
assert.match(playerSource, /trackIntro: localized\(track && track\.description \? track \: \(this\.album \|\| null\), 'description', locale\)/, 'episode intro prefers episode description and falls back to album description');
assert.match(playerWxss, /\.audio-attraction-intro-copy\s*\{[^}]*line-height:\s*1\.7/s, 'attraction intro has readable multiline spacing');

let page;
const spot = {
  id: 'spot-1',
  summary: '景点中文简介。',
  summaryEn: 'Attraction overview.',
  exhibits: [{ id: 'point-1', name: '讲解点' }],
  audioGuides: [{ id: 'track-1', category: 'online', attractionId: 'spot-1', previewUrl: '/preview', title: '音轨', exhibitId: 'point-1' }]
};
const wx = {
  getWindowInfo: () => ({ statusBarHeight: 24 }),
  showToast() {},
  createInnerAudioContext() { throw new Error('Audio context should not be needed to render the intro'); }
};
const modules = {
  '../../data/content': {
    loadContent(callback) { callback({}, { source: 'remote', status: 'ready' }); },
    getAttraction() { return spot; },
    getAudioAlbums() { return []; }
  },
  '../../utils/i18n': { getMessages: () => ({ heritage: {} }), apply() {} },
  '../../utils/audio-access': { getAccess: (id, callback) => callback(true, { previewUrl: '/preview', access: 'preview' }, 200) },
  '../../utils/paid-content': {},
  '../../utils/auth': { getAccessToken: () => '' },
  '../../utils/navigation': { goBack() {} }
};
vm.runInNewContext(playerSource, {
  Page(config) { page = config; },
  require(name) { return modules[name] || {}; },
  wx,
  setTimeout() { return 1; },
  clearTimeout() {},
  console
});
const instance = { ...page, data: structuredClone(page.data), setData(next) { Object.assign(this.data, next); } };
instance.onLoad({ attractionId: 'spot-1', pointId: 'point-1' });
assert.equal(instance.data.spotIntro, '景点中文简介。', 'audio player uses the attraction summary');
instance.data.locale = 'en';
instance.localize();
assert.equal(instance.data.spotIntro, 'Attraction overview.', 'attraction summary follows the selected locale');

console.log('PASS: highlight cards without images collapse to content height; audio player displays localized attraction summaries');
