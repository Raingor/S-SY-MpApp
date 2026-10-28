// 分享卡片使用当前页面公开字段；不联网，不截图个人资料，不改变音频权限。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const cache = new Map();
let component;
let fakeTimeout = false;
let timeoutCallback;
const wx = { getStorageSync: () => '', setStorageSync() {} };
function load(rel) {
  const file = path.resolve(ROOT, rel.endsWith('.js') ? rel : rel + '.js');
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module, exports: module.exports,
    require: (id) => load(path.resolve(path.dirname(file), id)), wx, getApp: () => ({ globalData: {} }),
    Component: (value) => { component = value; },
    setTimeout: (fn, ms) => { if (fakeTimeout && ms === 2200) { timeoutCallback = fn; return 0; } return setTimeout(fn, ms); }, clearTimeout, console
  }, { filename: file });
  return module.exports;
}
const i18n = load('utils/i18n');
const { pagePreview, drawPreview, textLines } = load('utils/share-preview');
const { buildShareCard } = load('utils/share');
const page = (locale, data = {}) => ({ data: { i18n: i18n.getMessages(locale), locale, ...data } });
async function main() {
  for (const locale of ['zh-CN', 'zh-TW', 'en']) {
    const p = page(locale, { spot: { id: 'a & b', name: '景点', nameTw: '景點', nameEn: 'Attraction', summary: '重点内容', summaryTw: '重點內容', summaryEn: 'Page highlights', image: '/assets/images/dest/dest-athens.jpg' } });
    let rendered;
    p.selectComponent = (selector) => { assert.equal(selector, '#share-preview'); return { render: async (spec) => { rendered = spec; return '/tmp/rendered.jpg'; } }; };
    const card = buildShareCard('/pages/attraction/detail?id=a%20%26%20b', p);
    const result = await card.promise;
    assert.equal(result.path, '/pages/attraction/detail?id=a%20%26%20b');
    assert.equal(result.imageUrl, '/tmp/rendered.jpg');
    assert.ok(result.title.includes(locale === 'en' ? 'Page highlights' : locale === 'zh-TW' ? '重點內容' : '重点内容'));
    assert.equal(rendered.image, p.data.spot.image);
    assert.equal(rendered.title, locale === 'en' ? 'Attraction' : locale === 'zh-TW' ? '景點' : '景点');
    p.data.spot.shareTitle = '管理员指定标题'; p.data.spot.shareImage = 'https://fixture.invalid/custom.jpg';
    const override = buildShareCard('/pages/attraction/detail?id=a', p);
    assert.equal(override.title, '管理员指定标题'); assert.equal(override.imageUrl, p.data.spot.shareImage);
    assert.equal((await override.promise).imageUrl, '/tmp/rendered.jpg');
    assert.equal(rendered.image, p.data.spot.shareImage, 'configured cover is composed with page summary, not a bypass');
    delete p.selectComponent;
    assert.equal(buildShareCard('/pages/attraction/detail?id=a', p).imageUrl, p.data.spot.shareImage, 'configured image remains safe fallback');
  }
  const samples = {
    '/pages/index/index': { heroCopy: { title: '首页重点', description: '首页摘要' }, heroList: [{ img: '/home.jpg' }] },
    '/pages/travel-guide/travel-guide': { guideTitle: '后台指南', guideSubtitle: '后台摘要' },
    '/pages/guide/guide': { guideBanners: [{ img: '/banner.jpg', description: '当前后台Banner内容' }], guide: { intro: '不再展示的个人宣传' } },
    '/pages/knowledge/knowledge': { activePanel: 1, visibleAlbums: [{ cover: '/album.jpg' }] },
    '/pages/city/index': { city: { name: '雅典', description: '文明探索', cover: '/city.jpg' } },
    '/pages/city/spots': { city: { name: '雅典', subtitle: '文明探索', cover: '/city.jpg' } },
    '/pages/itinerary/detail': { itinerary: { title: '环游三日', summary: '行程重点', img: '/trip.jpg' } },
    '/pages/itinerary/index': { list: [{ title: '环游三日', img: '/trip.jpg' }] },
    '/pages/service-flow/service-flow': { flow: { title: '服务流程', stage1: '规划', stage2: '确认', stage3: '出发' } },
    '/pages/luxury/detail': { detail: { title: '游艇', intro: '出海重点', image: '/yacht.jpg' } },
    '/pages/vehicle/vehicle': { service: { title: '用车服务', description: '用车重点' } },
    '/pages/audio/detail': { title: '当前节目', description: '本集介绍', cover: '/track.jpg', access: { fullUrl: 'https://secret.invalid/signed' } },
    '/pages/audio/album': { album: { displayTitle: '当前专辑', displayDescription: '专辑介绍', cover: '/album.jpg' } },
    '/pages/audio/route': { title: '参观路线', description: '沿途重点', coverImage: '/route.jpg', mapImage: 'https://secret.invalid/map' },
    '/pages/audio/collection': { title: '景点节目', spotName: '当前景点' },
    '/pages/attraction/visitor-section': { spot: { name: '卫城', summary: '概览', image: '/a.jpg' }, activeSection: { title: '交通' } },
    '/pages/customize/customize': {}, '/pages/business/business': {}, '/pages/membership/shop': {}
  };
  for (const [route, data] of Object.entries(samples)) {
    const p = page('zh-CN', { ...data, form: { contact: 'SECRET-PHONE', passport: 'SECRET-PASSPORT' }, user: { name: 'SECRET-NAME' } });
    const spec = pagePreview(route, p);
    assert.ok(spec.title, route + ': title'); assert.ok(spec.summary, route + ': summary');
    assert.ok(!JSON.stringify(spec).includes('SECRET') && !JSON.stringify(spec).includes('secret.invalid'), route + ': no personal fields/private map/signed audio');
    const source = fs.readFileSync(path.join(ROOT, route + '.js'), 'utf8');
    assert.match(source, /onShareAppMessage\(/, route + ': handler installed');
    assert.match(source, /buildShareCard\([^;]+, this\)/, route + ': passes page context');
    assert.match(fs.readFileSync(path.join(ROOT, route + '.wxml'), 'utf8'), /<sy-share-preview id="share-preview"/, route + ': canvas component installed');
  }
  assert.equal(pagePreview('/pages/guide/guide', page('zh-CN', samples['/pages/guide/guide'])).summary, '当前后台Banner内容');
  const kp = page('en', { activePanel: 0 });
  const title = pagePreview('/pages/knowledge/knowledge', kp).title;
  kp.data.activePanel = 1; assert.notEqual(pagePreview('/pages/knowledge/knowledge', kp).title, title, 'panel changes update card');
  function handler(route) {
    let definition;
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, route + '.js'), 'utf8'), {
      Page(value) { definition = value; }, getApp: () => ({ globalData: {} }),
      require: (id) => id.endsWith('/share') ? { buildShareCard } : id.endsWith('/i18n') ? i18n : {}
    });
    return definition.onShareAppMessage;
  }
  const audioPage = page('en', samples['/pages/audio/detail']);
  audioPage.params = { albumId: 'album & one', episodeId: 'episode?x', autoplay: '1', fullUrl: 'SECRET' };
  const audioCard = handler('/pages/audio/detail').call(audioPage);
  assert.equal(audioCard.path, '/pages/audio/detail?albumId=album%20%26%20one&episodeId=episode%3Fx');
  assert.ok(!JSON.stringify(audioCard).includes('autoplay') && !JSON.stringify(audioCard).includes('SECRET'));
  const knowledgePage = page('en', { activePanel: 1, audioOnly: true });
  assert.equal(handler('/pages/knowledge/knowledge').call(knowledgePage).path, '/pages/knowledge/knowledge?panel=1&audioOnly=1');
  assert.equal(handler('/pages/service-flow/service-flow').call(page('en')).path, '/pages/service-flow/service-flow');
  const cityPage = page('en', { city: { id: 'a & b', name: '雅典', en: 'Athens' } });
  assert.equal(handler('/pages/city/index').call(cityPage).path, '/pages/city/index?id=a%20%26%20b');
  assert.equal(pagePreview('/pages/city/index', cityPage).title, 'Athens');
  const tripPage = page('zh-CN', { itinerary: { type: 'custom', token: 'token & one', title: '定制行程', summary: 'SECRET-PERSONAL', header: [{ value: 'SECRET-PHONE' }] } });
  assert.equal(handler('/pages/itinerary/detail').call(tripPage).path, '/pages/itinerary/detail?token=token%20%26%20one', 'preserve intentional private itinerary sharing');
  assert.ok(!JSON.stringify(pagePreview('/pages/itinerary/detail', tripPage)).includes('SECRET'));
  // profile 不进入个人页面/路径，也不能因生成失败回退到个人屏幕截图。
  for (const route of ['/pages/profile/profile', '/pages/profile/edit/edit']) {
    const p = page('zh-CN', { itinerary: { token: 'SECRET', title: 'SECRET' } });
    p.selectComponent = () => { throw Error('private screen must not render'); };
    const card = buildShareCard(route, p);
    assert.ok(!JSON.stringify(card).includes('SECRET')); assert.ok(card.imageUrl); assert.ok(!card.promise);
  }
  const p = page('zh-CN', samples['/pages/city/index']);
  p.selectComponent = () => ({ render: () => Promise.reject(new Error('canvas failed')) });
  const failed = buildShareCard('/pages/city/index?id=athens', p); assert.equal((await failed.promise).imageUrl, '/city.jpg');
  fakeTimeout = true; p.selectComponent = () => ({ render: () => new Promise(() => {}) });
  const hung = buildShareCard('/pages/city/index?id=athens', p); timeoutCallback();
  assert.equal((await hung.promise).imageUrl, '/city.jpg'); fakeTimeout = false;
  // 真实绘图函数：5:4尺寸、图文均绘制、中英文长内容不越界。
  const texts = []; const rects = [];
  const ctx = { fillRect: (...args) => rects.push(args), fillText: (text, x, y) => { texts.push({ text, x, y }); },
    measureText: (text) => ({ width: Array.from(text).reduce((sum, c) => sum + (c.charCodeAt(0) > 255 ? 40 : 20), 0) }),
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, drawImage() {}, createLinearGradient: () => ({ addColorStop() {} }) };
  for (const text of ['超长中文'.repeat(30), 'A long English title '.repeat(20), '希臘🏛️'.repeat(20)]) {
    const lines = textLines(ctx, text, 666, 2);
    assert.equal(lines.length, 2); assert.ok(lines.at(-1).endsWith('…'));
    assert.ok(lines.every((line) => ctx.measureText(line).width <= 666));
  }
  const spec = { title: '雅典卫城', summary: '景点概览与参观重点', label: '世界文化遗产', brand: 'BLUE SEACOAST' };
  drawPreview(ctx, spec, { width: 1000, height: 1500 });
  assert.deepEqual(rects[0], [0, 0, 750, 600]);
  assert.ok(texts.some((item) => item.text === spec.title)); assert.ok(texts.some((item) => item.text === spec.summary));
  assert.ok(texts.every((item) => item.y < 600));
  load('components/share-preview/share-preview');
  let exports = 0;
  const canvas = { getContext: () => ctx, createImage: () => { const image = { width: 1000, height: 800 }; Object.defineProperty(image, 'src', { set() { image.onload(); } }); return image; } };
  wx.canvasToTempFilePath = (o) => { assert.equal(o.canvas, canvas); assert.equal(o.destHeight, 600); exports++; o.success({ tempFilePath: '/tmp/card-' + exports + '.jpg' }); };
  const instance = { ...component.methods, createSelectorQuery: () => ({ select() { return this; }, fields() { return this; }, exec(fn) { fn([{ node: canvas }]); } }) };
  const generated = await instance.render({ ...spec, image: '/fixture.jpg' });
  assert.equal(generated, '/tmp/card-1.jpg');
  assert.equal(await instance.render({ ...spec, image: '/fixture.jpg' }), generated, 'same content cached');
  assert.equal(exports, 1);
  await instance.render({ ...spec, title: '新标题', image: '' }); assert.equal(exports, 2, 'changed content invalidates cache');
  component.lifetimes.detached.call(instance);
  await assert.rejects(instance.render({ ...spec, title: '其他页面' }), /unavailable/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).usingComponents['sy-share-preview'], '/components/share-preview/share-preview');
  console.log('PASS: current-page share title/image/summary across 20 public pages, locale + backend overrides, safe encoded routes, no personal/signed content, canvas rendering/cache/error/timeout and 5:4 text wrapping');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
