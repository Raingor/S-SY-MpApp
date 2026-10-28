// Test-only VM harness. All requests/audio/payment are intercepted; never opens a socket.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const plain = (value) => JSON.parse(JSON.stringify(value));

function createHarness(initialConfig) {
  const h = { entitlements: { member: false }, config: plain(initialConfig), configOk: true, requests: [], payments: 0, played: [], errors: [], mediaResponse: null, loggedIn: true, active: null, matched: 0 };
  const storage = new Map([['sy_mp_access_token', 'fixture-client-token']]);
  const app = { globalData: { apiBase: 'https://fixture.invalid', contentSettings: {}, auth: { accessToken: '', user: null } } };
  const user = { id: 'fixture-user', nickname: 'Fixture', phoneBound: true };
  const timers = new Map();
  let timerId = 0;
  const wx = {
    getStorageSync: (key) => storage.get(key) || '',
    setStorageSync: (key, value) => storage.set(key, value), removeStorageSync: (key) => storage.delete(key),
    showToast() {}, showModal() {}, getWindowInfo: () => ({ statusBarHeight: 20 }),
    requestPayment() { h.payments++; throw new Error('No native payment may occur during fixture replay'); },
    request(options) {
      const parsed = new URL(options.url);
      assert.equal(parsed.origin, 'https://fixture.invalid', 'no external requests');
      h.requests.push({ method: options.method, path: parsed.pathname + parsed.search, body: options.data });
      let response;
      const c = h.active;
      const expected = c && new URL(c.request.path, parsed.origin);
      const matches = c && options.method === c.request.method && parsed.pathname === expected.pathname &&
        (parsed.pathname !== '/api/content' || parsed.searchParams.get('includeAttractionDetails') === 'false');
      if (matches) {
        if (c.request.body) assert.deepEqual(plain(options.data), c.request.body, c.name + ' request body');
        h.matched++;
        response = c.response;
      } else if (parsed.pathname === '/api/miniprogram/knowledge/config') {
        response = { statusCode: h.configOk ? 200 : 503, data: h.config };
      } else if (parsed.pathname === '/api/miniprogram/entitlements') {
        response = { statusCode: h.entitlementsOk === false ? 503 : 200, data: h.entitlements };
      } else if (parsed.pathname === '/api/miniprogram/auth/me') {
        response = { statusCode: h.loggedIn ? 200 : 401, data: h.loggedIn ? { user } : {} };
      } else {
        throw new Error('Unexpected mocked request: ' + options.method + ' ' + parsed.pathname);
      }
      options.success(plain(response));
    },
    createInnerAudioContext() {
      const audio = {
        currentTime: 0, src: '',
        onPlay(fn) { this.playHandler = fn; }, onWaiting(fn) { this.waitingHandler = fn; },
        onTimeUpdate(fn) { this.timeHandler = fn; }, onEnded(fn) { this.endedHandler = fn; }, onError(fn) { this.errorHandler = fn; },
        stop() { this.stopped = true; }, pause() {}, seek(value) { this.currentTime = value; }, destroy() {},
        play() {
          h.played.push(this.src);
          if (h.mediaResponse && h.mediaResponse.statusCode >= 400) this.errorHandler({ errMsg: 'fixture media HTTP ' + h.mediaResponse.statusCode });
          else this.playHandler();
        }
      };
      return audio;
    }
  };
  const globals = { wx, getApp: () => app, setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; }, clearTimeout(id) { timers.delete(id); }, console: { error(...args) { h.errors.push(args); }, log() {}, warn() {} } };
  function load(relative, dependencies) {
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, relative), 'utf8'), {
      ...globals, module, exports: module.exports,
      require(id) { assert.ok(Object.hasOwn(dependencies, id), relative + ': unexpected dependency ' + id); return dependencies[id]; }
    }, { filename: relative });
    return module.exports;
  }
  h.load = load;
  h.i18n = load('utils/i18n.js', {});
  h.share = load('utils/share.js', { './i18n': h.i18n, './share-preview': load('utils/share-preview.js', {}) });
  h.auth = load('utils/auth.js', { './i18n': h.i18n });
  h.paid = load('utils/paid-content.js', { './auth': h.auth });
  h.access = load('utils/audio-access.js', { './auth': h.auth, './paid-content': h.paid });
  h.content = load('data/content.js', { './mirror-content': { getContent() { throw new Error('No local fallback expected'); } } });
  let pageConfig;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'pages/audio/detail.js'), 'utf8'), {
    ...globals, Page(config) { pageConfig = config; }, require(id) {
      const dependencies = { '../../data/content': h.content, '../../utils/i18n': h.i18n, '../../utils/auth': h.auth, '../../utils/paid-content': h.paid, '../../utils/audio-access': h.access, '../../utils/navigation': { goBack() {} }, '../../utils/share': h.share };
      assert.ok(Object.hasOwn(dependencies, id), 'unexpected player dependency ' + id);
      return dependencies[id];
    }
  }, { filename: 'pages/audio/detail.js' });
  h.page = (track, spot) => ({
    ...pageConfig, data: { ...structuredClone(pageConfig.data), track: plain(track), access: { mode: track.unlockMode, access: 'preview' }, durationSeconds: 4 },
    params: { attractionId: track.attractionId || '', albumId: track.albumId || '' }, spot: spot ? plain(spot) : null,
    setData(next) { Object.assign(this.data, next); }
  });
  h.replay = async (c, run) => {
    assert.equal(h.active, null);
    h.active = c; h.matched = 0;
    try { await run(); assert.equal(h.matched, 1, c.name + ': exactly one captured response consumed'); }
    finally { h.active = null; }
  };
  h.setLoggedIn = (loggedIn) => { h.loggedIn = loggedIn; if (loggedIn) storage.set('sy_mp_access_token', 'fixture-client-token'); else storage.delete('sy_mp_access_token'); };
  h.orderCount = () => h.requests.filter((r) => r.method === 'POST' && r.path === '/api/miniprogram/orders').length;
  h.plain = plain;
  h.timers = timers;
  return h;
}
module.exports = { createHarness, plain };
