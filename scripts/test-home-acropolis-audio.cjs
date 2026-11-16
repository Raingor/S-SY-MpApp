// Offline playback harness: no Website API, real media, authentication or payment requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const loadHelper = (file) => {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module });
  return module.exports;
};
const { getHomeAudioPreview } = loadHelper('utils/home-audio.js');
const preview = {
  kind: 'human-video-audio', attractionId: 'acropolis', sourceVideoId: 'human-video-38min',
  previewUrl: 'https://fixture.invalid/audio/acropolis-human-preview.m4a', previewSeconds: 60,
  fullUrl: 'https://fixture.invalid/private-original.mp4'
};
const payload = (extra = {}) => ({
  home: { audioPreview: { ...preview, ...extra } },
  attractions: [{ id: 'acropolis', audioGuides: [
    { id: 'ai-audio', category: 'online', attractionId: 'acropolis', isPinned: true, previewUrl: '/ai-preview' },
    { id: 'other-human', category: 'expert', attractionId: 'acropolis', previewUrl: '/other-preview' }
  ] }]
});
assert.equal(getHomeAudioPreview(payload()).sourceVideoId, preview.sourceVideoId);
assert.equal(getHomeAudioPreview(payload()).previewUrl, preview.previewUrl);
const guideAudio = { kind: 'guide-audio', attractionId: 'acropolis', sourceAudioId: 'acropolis-guide-30min', previewUrl: 'https://fixture.invalid/audio/acropolis-guide-preview-60s-74cb88c5.m4a', previewSeconds: 60 };
assert.equal(getHomeAudioPreview({ home: { audioPreview: guideAudio } }).sourceAudioId, 'acropolis-guide-30min', 'recorded guide audio uses sourceAudioId');
assert.equal(getHomeAudioPreview({ home: { audioPreview: { ...guideAudio, sourceAudioId: '' } } }), null, 'missing recorded audio id is rejected');
assert.equal(getHomeAudioPreview({ home: { audioPreview: { ...guideAudio, sourceAudioId: '', sourceVideoId: 'guide-video-acropolis' } } }).sourceVideoId, 'guide-video-acropolis');
assert.equal(getHomeAudioPreview(payload()).fullUrl, undefined, 'private original is never retained');
assert.equal(getHomeAudioPreview({ attractions: payload().attractions }), null, 'no AI or expert audio fallback');
for (const extra of [
  { kind: 'online' }, { kind: 'expert-narration' }, { attractionId: 'delphi' }, { enabled: false }, { sourceVideoId: '' },
  { previewUrl: '' }, { previewUrl: preview.fullUrl }, { previewUrl: 'http://fixture.invalid/p.mp3' },
  { previewUrl: '//fixture.invalid/p.mp3' }, { previewSeconds: 0 }, { previewSeconds: 'invalid' }
]) assert.equal(getHomeAudioPreview(payload(extra)), null);
assert.equal(getHomeAudioPreview(payload({ previewSeconds: 120 })).previewSeconds, 60);
assert.equal(getHomeAudioPreview(payload({ previewUrl: '/audio/human-preview.m4a' }), 'https://fixture.invalid').previewUrl,
  'https://fixture.invalid/audio/human-preview.m4a');

let definition;
let contentCallback;
let contentCalls = 0;
let accessCalls = 0;
const toasts = [];
const timers = new Map();
let timerId = 0;
const contexts = [];
const app = { globalData: { apiBase: 'https://fixture.invalid' } };
const wx = {
  getStorageSync: () => 'zh-CN',
  showToast(options) { toasts.push(options.title); },
  createInnerAudioContext() {
    const audio = {
      currentTime: 0, playCalls: 0, pauseCalls: 0, stopCalls: 0,
      onPlay(fn) { this.emitPlay = fn; }, onPause(fn) { this.emitPause = fn; },
      onStop(fn) { this.emitStop = fn; }, onTimeUpdate(fn) { this.emitTime = fn; },
      onEnded(fn) { this.emitEnded = fn; }, onError(fn) { this.emitError = fn; },
      play() { this.playCalls++; },
      pause() { this.pauseCalls++; this.emitPause(); },
      stop() {
        this.stopCalls++;
        assert(this.stopCalls < 10, 'stop errors must not recurse');
        this.emitStop();
        this.emitError(); // Android may emit an error during an intentional stop.
        this.currentTime = 0;
      },
      destroy() { this.destroyed = true; }
    };
    contexts.push(audio);
    return audio;
  }
};
const i18nModule = { exports: {} };
vm.runInNewContext(fs.readFileSync('utils/i18n.js', 'utf8'), { module: i18nModule, wx, getApp: () => app });
const i18n = i18nModule.exports;
vm.runInNewContext(fs.readFileSync('pages/index/index.js', 'utf8'), {
  Page(config) { definition = config; }, wx, getApp: () => app,
  setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id; },
  clearTimeout(id) { timers.delete(id); },
  require(id) {
    if (id.endsWith('/i18n')) return i18n;
    if (id.endsWith('/home-audio')) return { getHomeAudioPreview };
    if (id.endsWith('/audio-access')) return { getAccess() { accessCalls++; } };
    if (id.endsWith('/content')) return { loadContent(callback, forceRefresh) { assert.equal(forceRefresh, true); contentCalls++; contentCallback = callback; } };
    if (id.endsWith('/luxury')) return { getLuxuryCards: () => [] };
    return {};
  }
});
const makePage = () => ({ ...definition, data: structuredClone(definition.data), setData(next, callback) { Object.assign(this.data, next); if (callback) callback(); } });
const ready = { source: 'remote', status: 'ready' };
const page = makePage();
page.onRouteAudioToggle();
assert.equal(page.data.routeAudioLoading, true);
page.onRouteAudioToggle();
assert.equal(contentCalls, 1, 'repeated clicks do not queue duplicate requests');
contentCallback(payload(), ready);
assert.equal(accessCalls, 0, 'homepage narration does not request an unrelated audio-track entitlement');
const audio = page.routeAudioContext;
assert.equal(audio.src, preview.previewUrl, 'homepage plays the extracted video narration only');
assert.equal(audio.autoplay, false);
assert.equal(audio.obeyMuteSwitch, false);
assert.equal(audio.playCalls, 1, 'the original click starts playback when metadata resolves');
assert.equal(page.data.routeAudioPlaying, false, 'play() alone is not actual playback');
audio.emitPlay();
assert.equal(page.data.routeAudioPlaying, true);
assert.equal(page.data.routeAudioLoading, false);
assert.equal(timers.size, 0);
page.onRouteAudioToggle();
assert.equal(audio.pauseCalls, 1);
assert.equal(page.data.routeAudioPlaying, false);
page.onRouteAudioToggle(); audio.emitPlay();
assert.equal(audio.playCalls, 2);
audio.currentTime = 30; audio.emitTime();
assert.equal(page.data.routeAudioCurrentTime, '0:30');
assert.equal(page.data.routeAudioProgress, 50);
audio.currentTime = 61; audio.emitTime();
assert.equal(page.data.routeAudioPreviewEnded, true);
assert.equal(page.data.routeAudioProgress, 100);
assert.equal(page.data.routeAudioCurrentTime, '1:00');
page.onRouteAudioToggle();
assert.equal(audio.playCalls, 2, 'expired preview requires the restart control');
const beforeRestartToasts = toasts.length;
page.onRouteAudioRestart();
assert.equal(page.data.routeAudioCurrentTime, '0:00');
assert.equal(page.data.routeAudioPreviewEnded, false);
assert.equal(toasts.length, beforeRestartToasts, 'intentional stop errors stay quiet');
const restart = [...timers.values()].find((timer) => timer.ms === 100);
timers.clear(); restart.fn(); audio.emitPlay();
assert.equal(audio.playCalls, 3);
audio.emitError();
assert.equal(page.routeAudioSource, '');
assert.equal(page.data.routeAudioLoading, false);
assert.equal(toasts.length, beforeRestartToasts + 1, 'genuine failure is reported once');
page.onRouteAudioToggle(); contentCallback(payload({ previewSeconds: 59 }), ready);
audio.emitPlay();
assert.equal(audio.src, preview.previewUrl);
assert.equal(page.routeAudioIgnoringStopErrors, false, 'retry reenables failure reporting');
assert.equal(page.data.routeAudioDuration, '0:59');
assert(page.data.routeAudioPreviewNote.includes('0:59'));
audio.currentTime = 59; audio.emitTime();
assert.equal(page.data.routeAudioPreviewEnded, true, 'a shorter server preview is respected');
page.onRouteAudioRestart();
page.onHide();
assert.equal(timers.size, 0, 'leaving the page cancels delayed restart');
audio.emitPlay();
assert.equal(page.data.routeAudioPlaying, false, 'late media events cannot play after hiding');

const hidden = makePage(); hidden.onRouteAudioToggle();
const lateContent = contentCallback;
hidden.onHide(); lateContent(payload(), ready);
assert.equal(hidden.routeAudioContext, undefined, 'late content does not create media after hiding');
const unloaded = makePage(); unloaded.onRouteAudioToggle();
const lateUnloadContent = contentCallback;
unloaded.onUnload(); lateUnloadContent(payload(), ready);
assert.equal(unloaded.routeAudioContext, undefined, 'late metadata does not create media after unloading');
for (const state of [{ source: 'local', status: 'fallback' }, { source: 'error', status: 'contract-error' }]) {
  const offline = makePage(); offline.onRouteAudioToggle(); contentCallback(payload(), state);
  assert.equal(offline.routeAudioContext, undefined, 'no offline mirror audio is played');
  assert.equal(offline.data.routeAudioLoading, false);
}
const missing = makePage(); missing.onRouteAudioToggle(); contentCallback({ attractions: payload().attractions }, ready);
assert.equal(missing.routeAudioContext, undefined, 'missing extracted narration never falls back to pinned AI audio');
assert.equal(missing.data.routeAudioLoading, false);
missing.onRouteAudioToggle(); contentCallback({ home: {} }, ready);
assert.equal(missing.data.routeAudioLoading, false, 'a retry with missing narration cannot get stuck loading');
const natural = makePage(); natural.onRouteAudioToggle(); contentCallback(payload(), ready);
natural.routeAudioContext.emitPlay(); natural.routeAudioContext.emitEnded();
assert.equal(natural.data.routeAudioPreviewEnded, true, 'a preview ending naturally also unlocks the restart control');
assert.equal(natural.data.routeAudioCurrentTime, '1:00');
assert.equal(natural.data.routeAudioProgress, 100);
const timeout = makePage(); timeout.onRouteAudioToggle(); contentCallback(payload(), ready);
const startTimeout = [...timers.values()].find((timer) => timer.ms === 10000);
startTimeout.fn();
assert.equal(timeout.data.routeAudioLoading, false, 'startup timeout allows retry');
assert.equal(timeout.routeAudioSource, '');
for (const locale of ['zh-CN', 'zh-TW', 'en']) {
  const copy = i18n.getMessages(locale).routeAudio;
  for (const key of ['title', 'desc', 'loading', 'unavailable', 'preview', 'ended']) assert(copy[key].trim());
  assert.equal(copy.kicker, 'ACROPOLIS AUDIO');
}
page.onUnload(); assert.equal(audio.destroyed, true);

// Exercise the actual /api/content adapter with a synthetic response.
async function verifyAdapter() {
  const module = { exports: {} };
  const raw = { ...payload({ previewUrl: '/audio/human-preview.m4a' }), cities: [], sampleItineraries: [], routes: [], destinations: [] };
  const adapterWx = {
    getStorageSync: () => '',
    request(options) { options.success({ statusCode: 200, data: raw }); }
  };
  vm.runInNewContext(fs.readFileSync('data/content.js', 'utf8'), {
    module, wx: adapterWx, getApp: () => app,
    require(id) {
      if (id === './mirror-content') return { getContent: () => ({}) };
      if (id === '../utils/home-audio') return { getHomeAudioPreview };
      throw new Error('Unexpected adapter dependency: ' + id);
    }
  });
  const adapted = await new Promise((resolve) => module.exports.loadContent(resolve, true));
  assert.equal(adapted.home.audioPreview.sourceVideoId, preview.sourceVideoId);
  assert.equal(adapted.home.audioPreview.previewUrl, '/audio/human-preview.m4a');
  assert.equal(getHomeAudioPreview(adapted, app.globalData.apiBase).previewUrl, 'https://fixture.invalid/audio/human-preview.m4a');
  assert.equal(adapted.home.audioPreview.previewSeconds, 60);
  assert.equal(adapted.home.audioPreview.fullUrl, undefined);
  assert.equal(adapted.home.audioPreview.accessUrl, undefined);
  delete raw.home.audioPreview;
  const missing = await new Promise((resolve) => module.exports.loadContent(resolve, true));
  assert.equal(missing.home.audioPreview, null, 'adapter preserves the missing-preview state');
  console.log('PASS: original human-video narration only, real content adapter, no AI/track fallback, pause/restart, expiry, retries and lifecycle cancellation; 0 real requests');
}
verifyAdapter().catch((error) => { console.error(error); process.exitCode = 1; });
