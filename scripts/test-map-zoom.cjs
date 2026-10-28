// 私有地图点开放大：应用内缩放查看器；公开地图仍走系统预览。全部离线。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const PREVIEW = [];
const TOASTS = [];
const wx = {
  getStorageSync: () => '', setStorageSync() {}, removeStorageSync() {},
  getWindowInfo: () => ({ statusBarHeight: 20 }),
  previewImage(options) { PREVIEW.push(options); },
  showToast(options) { TOASTS.push(options); },
  setClipboardData() {}
};

function loadPage(rel, extraRequires = {}) {
  let definition;
  vm.runInNewContext(read(rel), {
    wx, getApp: () => ({ globalData: { apiBase: 'https://fixture.invalid' } }),
    Page(value) { definition = value; },
    require: (id) => extraRequires[id] || loadModule(path.resolve(path.dirname(path.join(ROOT, rel)), id))
  }, { filename: rel });
  return definition;
}
const cache = new Map();
function loadModule(file) {
  if (!file.endsWith('.js')) file += '.js';
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    module, exports: module.exports, wx,
    require: (id) => id === './mirror-content' ? { getContent: () => ({}) } : loadModule(path.resolve(path.dirname(file), id)),
    getApp: () => ({ globalData: { apiBase: 'https://fixture.invalid' } }), console
  }, { filename: file });
  return module.exports;
}
const i18n = loadModule(path.join(ROOT, 'utils/i18n.js'));

const { isPrivateMapUrl } = loadModule(path.join(ROOT, 'utils/map-source.js'));
assert.equal(isPrivateMapUrl('/api/miniprogram/attraction-map/abc123.png'), true);
assert.equal(isPrivateMapUrl('./images/map.webp'), false);

async function main() {
  for (const rel of ['pages/attraction/visitor-section.js', 'pages/attraction/detail.js']) {
    const definition = loadPage(rel);
    const page = { ...definition, data: structuredClone(definition.data), setData(next) { Object.assign(this.data, next); } };
    // 私有地图：打开应用内查看器，不进系统预览。
    const beforePreview = PREVIEW.length;
    const map = { mapImage: '/api/miniprogram/attraction-map/mvabcdefgh1.png' };
    const url = rel.endsWith('detail.js') ? (() => { page.data.visitorMap = map.mapImage; page.onMapTap(); return page.data.visitorMap; })() : (() => { page.data.activeSection = map; page.onMapTap(); return page.data.activeSection.mapImage; })();
    assert.equal(page.data.mapZoomOpen, true, rel + ': private map opens the in-app viewer');
    assert.equal(page.data.mapZoomImage, url);
    assert.equal(PREVIEW.length, beforePreview, rel + ': system preview must not be used for private maps');
    assert.equal(TOASTS.at(-1).title, i18n.getMessages('zh-CN').heritage.mapViewOnly);
    page.onMapZoomClose();
    assert.equal(page.data.mapZoomOpen, false, rel + ': close resets the viewer');
    // 公开地图：保持原有系统预览。
    if (rel.endsWith('detail.js')) { page.data.visitorMap = './images/map.webp'; page.onMapTap(); }
    else { page.data.activeSection = { mapImage: './images/map.webp' }; page.onMapTap(); }
    assert.equal(PREVIEW.length, beforePreview + 1, rel + ': public map still previews');
    assert.equal(page.data.mapZoomOpen, false, rel + ': public map must not open the viewer');
  }
  // 组件：打开重置缩放，关闭冒泡，提示语取当前语言。
  let component;
  vm.runInNewContext(read('components/map-zoom/map-zoom.js'), {
    wx, Component(value) { component = value; },
    require: (id) => id.endsWith('i18n') ? i18n : {}
  }, { filename: 'components/map-zoom/map-zoom.js' });
  const instance = { ...component.methods, data: { ...component.data }, setData(next) { Object.assign(this.data, next); }, triggerEvent(name) { this._closed = name; } };
  component.lifetimes.attached.call(instance);
  assert.equal(instance.data.hint, i18n.getMessages('zh-CN').heritage.mapViewOnly);
  instance.setData({ scaleValue: 4 });
  component.properties.open.observer.call(instance, true);
  assert.equal(instance.data.scaleValue, 1, 'reopen resets zoom');
  instance.close();
  assert.equal(instance._closed, 'close');
  instance.noop();
  // 标记与注册：两页均挂组件；查看器不含保存/转发入口。
  for (const rel of ['pages/attraction/visitor-section.wxml', 'pages/attraction/detail.wxml']) {
    const markup = read(rel);
    assert.match(markup, /<map-zoom open="\{\{mapZoomOpen\}\}" image="\{\{mapZoomImage\}\}" bind:close="onMapZoomClose"/, rel);
    assert.doesNotMatch(markup, /show-menu-by-longpress="\{\{true\}\}"/, rel);
  }
  for (const rel of ['pages/attraction/visitor-section.json', 'pages/attraction/detail.json']) {
    assert.equal(JSON.parse(read(rel)).usingComponents['map-zoom'], '/components/map-zoom/map-zoom', rel);
  }
  const viewer = read('components/map-zoom/map-zoom.wxml');
  assert.match(viewer, /movable-area[^>]*scale-area/);
  assert.match(viewer, /movable-view[^>]*scale scale-min="1" scale-max="5"/);
  assert.match(viewer, /mode="aspectFit"/, 'any-aspect map renders fully centered, never top-anchored');
  assert.match(viewer, /show-menu-by-longpress="\{\{false\}\}"/);
  assert.doesNotMatch(viewer, /previewImage|saveImageToPhotosAlbum|openDocument/);
  const css = read('components/map-zoom/map-zoom.wxss');
  assert.match(css, /position: fixed; top: 0; left: 0; right: 0; bottom: 0/, 'explicit offsets: WXSS does not support the inset shorthand');
  assert.doesNotMatch(css, /inset:/);
  assert.match(css, /\.map-zoom-view \{ width: 100%; height: 100%; \}/, 'movable-view fills the viewport so aspectFit centers the map');
  assert.match(css, /z-index: 3000/);
  // 既有契约不受影响：私有地图不产生系统菜单，分享卡不取私有图。
  assert.equal(String(loadModule(path.join(ROOT, 'utils/share-preview.js')).pagePreview(
    '/pages/attraction/visitor-section',
    { data: { i18n: i18n.getMessages(), locale: 'zh-CN', spot: { name: '卫城博物馆', summary: '概览' }, activeSection: { title: '景点地图' } } }
  ).image), '', 'viewer state must not leak into share previews');
  console.log('PASS: private maps open the in-app pinch-zoom viewer (no system save menu) on detail and visitor-section, public maps still preview, component resets zoom and exposes tri-lingual hint');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
