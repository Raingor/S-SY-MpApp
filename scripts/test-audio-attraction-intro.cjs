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
assert.doesNotMatch(playerWxml, /spotIntro|i18n\.heritage\.attractionIntro/, 'audio player no longer renders the redundant sight introduction');
assert.match(highlightsWxml, /spot\.summary/, 'sight overview stays available on the attraction detail page');
assert.match(playerWxml, /\{\{trackIntro\}\}/, 'album episode page renders the episode introduction');
assert.match(playerSource, /trackIntro: localized\(track && track\.description \? track \: \(this\.album \|\| null\), 'description', locale\)/, 'episode intro prefers episode description and falls back to album description');
assert.match(playerWxss, /\.audio-attraction-intro-copy\s*\{[^}]*line-height:\s*1\.7/s, 'episode intro retains readable multiline spacing');

let page;
const spot = {
  id: 'spot-1',
  summary: '景点中文简介。',
  summaryEn: 'Attraction overview.',
  exhibits: [{ id: 'point-1', name: '讲解点' }],
  audioGuides: [{ id: 'track-1', category: 'online', attractionId: 'spot-1', previewUrl: '/preview', title: '音轨', exhibitId: 'point-1', description: '本段音频简介。', descriptionEn: 'Recording introduction.' }]
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
    getAudioAlbums() {
      return [{ id: 'album-1', description: '专辑简介。', episodes: [
        { id: 'episode-1', albumId: 'album-1', category: 'heritage', previewUrl: '/episode-preview', title: '节目一', description: '这一集的简介。', descriptionEn: 'Episode introduction.' }
      ] }];
    }
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
assert.equal(instance.data.spotIntro, undefined, 'audio player no longer computes the redundant attraction summary');
assert.equal(instance.data.title, '讲解点', 'audio heading is unchanged');
assert.equal(instance.data.trackIntro, '本段音频简介。', 'sight audio keeps its recording introduction');
instance.data.locale = 'en';
instance.localize();
assert.equal(instance.data.trackIntro, 'Recording introduction.', 'recording introduction still follows the selected locale');

const albumPlayer = { ...page, data: structuredClone(page.data), setData(next) { Object.assign(this.data, next); } };
albumPlayer.onLoad({ albumId: 'album-1', episodeId: 'episode-1' });
assert.equal(albumPlayer.data.trackIntro, '这一集的简介。', 'album episodes keep their individual introductions');
albumPlayer.data.locale = 'en';
albumPlayer.localize();
assert.equal(albumPlayer.data.trackIntro, 'Episode introduction.');
albumPlayer.data.track.description = '';
albumPlayer.data.locale = 'zh-CN';
albumPlayer.localize();
assert.equal(albumPlayer.data.trackIntro, '专辑简介。', 'album introduction fallback remains available');

console.log('PASS: compact imageless highlights; player omits sight overview while keeping localized recording and episode introductions');
