const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('pages/audio/detail.js', 'utf8');
let pageConfig;
let audio;
let toastCount = 0;
let loggedErrors = 0;
let stopCount = 0;
const wx = {
  createInnerAudioContext() {
    audio = {
      currentTime: 0,
      onPlay(fn) { this.playHandler = fn; },
      onWaiting(fn) { this.waitingHandler = fn; },
      onTimeUpdate(fn) { this.timeHandler = fn; },
      onEnded(fn) { this.endedHandler = fn; },
      onError(fn) { this.errorHandler = fn; },
      stop() {
        stopCount++;
        if (stopCount > 5) throw new Error('recursive InnerAudioContext.stop / onError');
        // Some Android runtimes may emit an error while stopping a media stream.
        this.errorHandler({ errMsg: 'stop interrupted' });
      },
      play() {},
      destroy() {}
    };
    return audio;
  },
  showToast() { toastCount++; }
};
const modules = {
  '../../data/content': {},
  '../../utils/i18n': { getMessages: () => ({ heritage: { networkFailed: '加载失败' } }) },
  '../../utils/audio-access': {},
  '../../utils/paid-content': { fetchConfig(callback) { callback(false, { products: {} }); } },
  '../../utils/auth': { getUserState(callback) { callback(false, null); } },
  '../../utils/navigation': {}
};
vm.runInNewContext(source, {
  Page(config) { pageConfig = config; },
  require(name) { return modules[name] || {}; },
  wx,
  console: { error() { loggedErrors++; } },
  setTimeout() { return 1; },
  clearTimeout() {}
});

const page = { ...pageConfig, data: structuredClone(pageConfig.data), setData(next) { Object.assign(this.data, next); } };
page.data.track = { id: 'track-1', previewSeconds: 60, durationSeconds: 120, previewUrl: '/preview' };
page.data.access = { access: 'preview', previewSeconds: 60 };
page.ensureAudioContext();
page.stopPreview();
assert.equal(stopCount, 1, 'preview expiry stops the audio once');
assert.equal(toastCount, 0, 'the intentional stop does not show a network error');
assert.equal(page.data.accessError, false);
assert.equal(page.data.showUnlockPaywall, true, 'preview expiry still shows the unlock sheet');
page.onUnlockPaywallClose();
page._playSource('/preview', false);
assert.equal(page._ignoringStopErrors, false, 'the next playback reenables error reporting');
audio.errorHandler({ errMsg: 'genuine playback failure' });
assert.equal(stopCount, 2, 'a genuine error stops once, even if stop emits another error');
assert.equal(toastCount, 1);
assert.equal(loggedErrors, 1);
assert.equal(page.data.accessError, true);

console.log('PASS: audio stop errors are ignored; genuine playback errors are reported once without reentrant stop');
