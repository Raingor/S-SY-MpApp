// 补录链路验证：模拟管理员在后台新增内容后，小程序真实适配层与真实页面能否正确加载新增数据。
// 全部使用本地 fixture 拦截 wx.request，不访问网络、不写任何数据。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'http://fixture.invalid';
const requests = [];
const navigation = [];
const moduleCache = new Map();

function loadModule(filename, overrides = {}) {
  const candidate = fs.existsSync(filename) ? filename : `${filename}.js`;
  const resolved = path.resolve(candidate);
  if (moduleCache.has(resolved)) return moduleCache.get(resolved).exports;
  const module = { exports: {} };
  moduleCache.set(resolved, module);
  const localRequire = (id) => Object.prototype.hasOwnProperty.call(overrides, id) ? overrides[id]
    : id.startsWith('.') ? loadModule(path.resolve(path.dirname(resolved), id)) : require(id);
  vm.runInThisContext('(function(require,module,exports){\n' + fs.readFileSync(resolved, 'utf8') + '\n})', { filename: resolved })(localRequire, module, module.exports);
  return module.exports;
}

// ---------- 后台内容基线 ----------
const PAGE_COPY = {
  sections: {
    overview: { label: { zh: '概况' }, subtitle: { zh: 'OVERVIEW' } },
    visitor: { label: { zh: '参观指南' }, subtitle: { zh: 'VISITOR' } },
    highlights: { label: { zh: '必看亮点' }, subtitle: { zh: 'HIGHLIGHTS' } },
    audioHow: { label: { zh: '如何使用语音导览' }, subtitle: { zh: 'AUDIO' } },
    route: { label: { zh: '路线导览' }, subtitle: { zh: 'ROUTE' } },
    online: { label: { zh: '线上预览' }, subtitle: { zh: 'ONLINE' } },
    expert: { label: { zh: '名导讲解' }, subtitle: { zh: 'EXPERT' } }
  },
  audioHow: { steps: [{ zh: '点按节目试听' }], note: { zh: '以现场公告为准' } }
};

// 后台「补录」新增的一套完整内容：新城市 + 新目的地 + 新景点（含讲解点/路线/音频/亮点）
const NEW_CITY = { id: 'newcity', name: '新城市', nameEn: 'New City', status: 'published', countryId: 'greece', mosaic: ['newcity.webp'], subtitle: '新目的地', description: '补录测试', price: '¥0.01' };
const NEW_SPOT = {
  id: 'newspot', name: '新景点', en: 'New Spot', city: 'newcity', status: 'published',
  image: 'newspot.jpg', summary: '新景点简介', category: '古迹', sizeLabel: '大型',
  highlights: [{ name: '新亮点一', desc: '亮点说明', image: 'h1.jpg' }],
  exhibits: [{ id: 'newpoint', name: '新讲解点', description: '讲解点说明', image: 'p1.jpg', status: 'published' }],
  routes: [{ id: 'newroute', title: '新路线', description: '路线说明', pointIds: ['newpoint'], durationLabel: '40 分钟' }],
  audioGuides: [
    { id: 'new-expert', category: 'expert', attractionId: 'newspot', albumId: null, exhibitId: null, title: '新名导讲解', previewUrl: '/api/miniprogram/audio/new-expert/preview', accessUrl: '/api/miniprogram/audio/new-expert/access', previewSeconds: 30, unlockMode: 'attraction', status: 'published' },
    { id: 'new-online', category: 'online', attractionId: 'newspot', albumId: null, exhibitId: 'newpoint', title: '新线上讲解', previewUrl: '/api/miniprogram/audio/new-online/preview', accessUrl: '/api/miniprogram/audio/new-online/access', previewSeconds: 30, unlockMode: 'free', status: 'published' },
    { id: 'new-routeaudio', category: 'route', attractionId: 'newspot', albumId: null, routeId: 'newroute', exhibitId: 'newpoint', title: '新路线讲解', previewUrl: '/api/miniprogram/audio/new-routeaudio/preview', accessUrl: '/api/miniprogram/audio/new-routeaudio/access', previewSeconds: 30, unlockMode: 'free', status: 'published' }
  ],
  visitorInfo: {}, visitorInfoSections: [{ kind: 'hours', title: '开放时间', bodyHtml: '<p>09:00-17:00</p>' }],
  customSections: [], guide: {}
};
const NEW_DESTINATION = { id: 'newcity', name: '新城市', en: 'New City', type: 'culture', status: 'published', cityId: 'newcity', attractionIds: ['newspot'], image: 'newcity.jpg' };
const NEW_ALBUM = { id: 'newalbum', title: '新专辑', status: 'published', cover: 'album.jpg', episodes: [{ id: 'new-episode', title: '新节目', category: 'heritage', albumId: 'newalbum', attractionId: null, previewUrl: '/api/miniprogram/audio/new-episode/preview', accessUrl: '/api/miniprogram/audio/new-episode/access', previewSeconds: 30, durationSeconds: 300, status: 'published' }] };
const NEW_TRIP = { id: 'newtrip', title: '新参考行程', name: '新参考行程', days: 3, cover: 'trip.jpg', summary: '行程摘要', tag: 'NEW', crowd: '2 人', itinerary: [] };

// 后台「未发布/未绑定」的草稿内容：绝不应出现在前台
const DRAFT_SPOT = { id: 'draftspot', name: '草稿景点', city: 'newcity', status: 'draft', image: '', summary: 'x', highlights: [], exhibits: [], routes: [], audioGuides: [] };
const DRAFT_AUDIO = { id: 'draft-audio', category: 'expert', attractionId: 'newspot', albumId: null, exhibitId: null, title: '草稿音频', previewUrl: '/x', status: 'draft' };
const UNBOUND_DESTINATION = { id: 'nodest', name: '未绑定目的地', type: 'culture', status: 'published', cityId: '', attractionIds: [] };
const DRAFT_CITY = { id: 'draftcity', name: '草稿城市', status: 'draft', countryId: 'greece', mosaic: [] };
const DRAFT_EPISODE = { id: 'draft-episode', title: '草稿节目', category: 'heritage', albumId: 'newalbum', attractionId: null, previewUrl: '', status: 'published' };

function contentPayload(extra = {}) {
  return {
    settings: {}, countries: [{ id: 'greece', name: '希腊', enabled: true }], guides: [],
    cities: [], attractions: [], routes: [], destinations: [], sampleItineraries: [], audioAlbums: [],
    destinationCategories: [
      { key: 'culture', name: '文明溯源', nameEn: 'Heritage', sort: 1, enabled: true },
      { key: 'island', name: '海岛度假', nameEn: 'Islands', sort: 2, enabled: true }
    ],
    attractionDetailPage: PAGE_COPY,
    heritageGuideBanners: [], miniprogramServiceEntries: [], vehicleService: null, home: { banners: [] },
    ...extra
  };
}

let response = contentPayload();
let offline = false;

global.getApp = () => ({ globalData: { apiBase: ORIGIN } });
global.wx = {
  getStorageSync: () => '', getSystemInfoSync: () => ({ statusBarHeight: 20, windowWidth: 375 }),
  getWindowInfo: () => ({ statusBarHeight: 20, windowWidth: 375 }), getMenuButtonBoundingClientRect: () => ({ left: 281 }),
  showToast() {}, showModal() {}, switchTab() {}, previewImage() {}, setClipboardData() {}, pageScrollTo() {},
  navigateTo({ url }) { navigation.push(url); },
  createInnerAudioContext() { return { autoplay: false, currentTime: 0, onTimeUpdate() {}, onSeeking() {}, onEnded() {}, onError() {}, play() {}, pause() {}, stop() {}, destroy() {} }; },
  request(options) {
    assert(options.url.startsWith(ORIGIN + '/'), `非 fixture 请求：${options.url}`);
    requests.push({ url: options.url, at: Date.now() });
    if (offline) return options.fail({ errMsg: 'fixture offline' });
    if (options.url.includes('/api/content')) return options.success({ statusCode: 200, data: response });
    throw new Error(`未预期的 fixture 请求：${options.url}`);
  }
};

const content = loadModule(path.join(ROOT, 'data/content.js'));

// 简易 i18n 桩：任意属性链都能取值，避免测试被文案细节干扰
function deepStub() {
  const fn = function () {};
  return new Proxy(fn, {
    get(t, k) {
      if (k === 'then' || k === 'catch' || k === 'finally') return undefined;
      if (k === Symbol.toPrimitive || k === 'toString') return () => '';
      if (k === 'length') return 0;
      if (k === Symbol.iterator) return function* () {};
      return deepStub();
    },
    apply() { return deepStub(); }
  });
}
const i18nStub = { getMessages: () => deepStub(), apply(p) { const m = deepStub(); p.setData({ locale: 'zh-CN' }); return m; }, getLocale: () => 'zh-CN', setLocale: () => {} };

function resolveModule(id) {
  if (id.includes('data/content')) return content;
  if (id.includes('utils/i18n')) return i18nStub;
  if (id.includes('utils/navigation')) return { goBack() {} };
  if (id.includes('utils/share')) return { buildShareCard: () => ({}) };
  if (id.includes('utils/auth')) return { getAccessToken: () => '', isSimulationToken: () => false, ensurePhoneBound() {}, clearSession() {} };
  if (id.includes('utils/paid-content')) return {};
  if (id.includes('utils/audio-access')) return {
    getAccess(id, cb) {
      // 播放地址由 /access 回查下发；这里直接给出可播放的试听地址。
      cb(true, { mode: 'attraction', access: 'preview', reason: '', previewUrl: `${ORIGIN}/api/miniprogram/audio/${id}/preview`, fullUrl: '', previewSeconds: 30 }, 200);
    }
  };
  if (id.includes('utils/price')) return { formatCnyPrice: (c) => (c && c.price) || '' };
  if (id.includes('utils/lead-api')) return { submitLead: () => {} };
  if (id.includes('data/mirror-itineraries')) return { SERVICE_KEYS: [], getItinerary: () => NEW_TRIP, getReferenceList: () => [] };
  if (id.includes('data/luxury')) return { getLuxuryCards: () => [] };
  return {};
}

function pageFrom(rel) {
  let def;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), {
    Page(c) { def = c; }, wx: global.wx, getApp: global.getApp, require: resolveModule, setTimeout
  }, { filename: rel });
  return { ...def, data: { ...def.data }, setData(n) { Object.assign(this.data, n); } };
}
const tick = () => new Promise((r) => setImmediate(r));
async function settle(page, tries = 120) { for (let i = 0; i < tries && page.data.loading; i++) await tick(); for (let i = 0; i < 40; i++) await tick(); }
// 小程序页面普遍在 onShow 里发起加载，测试统一按真实生命周期启动。
async function boot(page, args) {
  if (typeof page.onLoad === 'function') page.onLoad(args || {});
  await tick();
  if (typeof page.onShow === 'function') page.onShow();
  await settle(page);
}

(async () => {
  // ===== 阶段 0：基线（后台还没有这套内容）=====
  response = contentPayload();
  let page = pageFrom('pages/attraction/detail.js');
  await boot(page, { id: 'newspot' });
  assert.equal(page.data.spot, null, '基线：新景点还不存在');

  // ===== 阶段 1：模拟管理员补录 =====
  response = contentPayload({
    cities: [NEW_CITY, DRAFT_CITY],
    destinations: [NEW_DESTINATION, UNBOUND_DESTINATION],
    attractions: [
      { ...NEW_SPOT, audioGuides: [...NEW_SPOT.audioGuides, DRAFT_AUDIO] },
      DRAFT_SPOT
    ],
    audioAlbums: [{ ...NEW_ALBUM, episodes: [...NEW_ALBUM.episodes, DRAFT_EPISODE] }],
    sampleItineraries: [NEW_TRIP]
  });

  // 模拟管理员补录后，原先停留在空状态的详情页返回前台，必须拿到刚新增的数据。
  page.onShow();
  await settle(page);
  assert.equal(page.data.spot && page.data.spot.id, 'newspot', '管理员新增景点后，已打开的详情页重新显示该景点');
  assert.equal(page.data.exhibits.length, 1, '同一次刷新拿到新增讲解点');

  // --- 适配层 ---
  const result = await content.fetchContent();
  assert.equal(result.state.source, 'remote');
  const data = result.data;
  const cities = content.getCities(data);
  assert(cities.some((c) => c.id === 'newcity'), '新城市进入城市列表');
  assert(!cities.some((c) => c.id === 'draftcity'), '草稿城市不得出现');
  assert.equal(cities.find((c) => c.id === 'newcity').count, 1, '新城市统计到 1 个已发布景点');

  const spots = content.getAttractionsByCity('newcity', data);
  assert.deepEqual(spots.map((s) => s.id), ['newspot'], '新景点按城市可见，且草稿景点被过滤');
  assert(content.getAttraction('newspot', data), '新景点可被详情页取到');
  assert.equal(content.getAttraction('draftspot', data), null, '草稿景点取不到');

  const groups = content.getHomeDestinations(data, 'zh-CN');
  const tiles = groups.flatMap((g) => g.tiles);
  assert(tiles.some((t) => t.cityId === 'newcity'), '新目的地进入首页分组');
  assert(!tiles.some((t) => t.id === 'nodest'), '缺少 cityId/attractionIds 的目的地不展示');

  // --- 首页 ---
  const home = pageFrom('pages/index/index.js');
  await boot(home, {});
  const homeDest = (home.data.destinations || []).flatMap((g) => g.tiles || []);
  assert(homeDest.some((t) => t.cityId === 'newcity'), '首页渲染出新目的地');

  // --- 知识库 ---
  const knowledge = pageFrom('pages/knowledge/knowledge.js');
  await boot(knowledge, {});
  assert(knowledge.data.cities.some((c) => c.id === 'newcity'), '知识库城市筛选出现新城市');
  assert(knowledge.data.hotSpots.some((s) => s.id === 'newspot'), '知识库景点列表出现新景点');
  assert(knowledge.data.visibleAlbums.some((a) => a.id === 'newalbum'), '知识库专辑列表出现新专辑');

  // --- 城市页 / 城市景点页 ---
  const cityPage = pageFrom('pages/city/index.js');
  await boot(cityPage, { id: 'newcity' });
  assert(cityPage.data.city && cityPage.data.city.id === 'newcity', '城市页加载新城市');

  const spotsPage = pageFrom('pages/city/spots.js');
  await boot(spotsPage, { id: 'newcity' });
  assert(spotsPage.data.spots.some((s) => s.id === 'newspot'), '城市景点列表出现新景点');

  // --- 景点详情：亮点 / 讲解点 / 三路音频 / 路线 ---
  const detail = pageFrom('pages/attraction/detail.js');
  await boot(detail, { id: 'newspot' });
  assert(detail.data.spot && detail.data.spot.id === 'newspot', '景点详情加载新景点');
  assert.equal(detail.data.spot.highlights.length, 1, '新亮点渲染');
  assert.equal(detail.data.exhibits.length, 1, '新讲解点渲染');
  assert.deepEqual(detail.data.expertGuides.map((t) => t.id), ['new-expert'], '名导讲解出现在详情页');
  assert.deepEqual(detail.data.onlineGuides.map((t) => t.id), ['new-online'], '线上讲解出现在详情页');
  assert.deepEqual(detail.data.routes.map((r) => r.id), ['newroute'], '新路线出现在详情页');
  assert.equal(detail.data.onlineDemo, false, '真实音频不标记演示');
  assert.equal(detail.data.expertDemo, false, '真实音频不标记演示');

  // --- 讲解点列表（线上 / 名导）---
  const onlineList = pageFrom('pages/audio/collection.js');
  await boot(onlineList, { attractionId: 'newspot', category: 'online' });
  assert.deepEqual(onlineList.data.visibleItems.map((i) => i.id), ['new-online'], '线上讲解列表出现新音轨');
  assert.equal(onlineList.data.visibleItems[0].pointId, 'newpoint', '线上音轨绑定到新讲解点');
  assert.equal(onlineList.data.visibleItems[0].hasAudio, true, '线上音轨标记为可播放');

  const expertList = pageFrom('pages/audio/collection.js');
  await boot(expertList, { attractionId: 'newspot', category: 'expert' });
  assert.deepEqual(expertList.data.visibleItems.map((i) => i.id), ['new-expert'], '名导讲解列表出现新音轨（草稿音频被过滤）');
  assert.equal(expertList.data.demoData, false, '无演示数据标记');

  // --- 路线详情页 ---
  const routePage = pageFrom('pages/audio/route.js');
  await boot(routePage, { attractionId: 'newspot', id: 'newroute' });
  assert.equal(routePage.data.title, '新路线', '路线详情加载新路线');
  assert.deepEqual(routePage.data.points.map((p) => p.id), ['newpoint'], '路线点位解析自新讲解点');

  // --- 播放页：名导 / 线上 / 专辑节目均可播放 ---
  for (const [params, expected] of [
    [{ attractionId: 'newspot', trackId: 'new-expert', category: 'expert' }, 'new-expert'],
    [{ attractionId: 'newspot', trackId: 'new-online', category: 'online', pointId: 'newpoint' }, 'new-online'],
    [{ attractionId: 'newspot', trackId: 'new-routeaudio', category: 'route', pointId: 'newpoint' }, 'new-routeaudio']
  ]) {
    const player = pageFrom('pages/audio/detail.js');
    await boot(player, params);
    assert.equal(player.data.unavailable, false, `${expected} 可打开`);
    assert(player.data.track && player.data.track.id === expected, `${expected} 播放页命中正确音轨`);
    player.playPreview();
    assert.equal(player.data.playing, true, `${expected} 可播放试听`);
    player.onUnload();
  }

  // --- 专辑与节目 ---
  assert.equal(content.getAudioAlbums(data).length, 1, '新专辑可见（草稿节目不足以让专辑出现）');
  const albumPage = pageFrom('pages/audio/album.js');
  await boot(albumPage, { id: 'newalbum' });
  assert.equal(albumPage.data.album && albumPage.data.album.id, 'newalbum', '专辑页加载新专辑');
  assert.deepEqual(albumPage.data.episodes.map((e) => e.id), ['new-episode'], '专辑只展示有试听地址的节目');
  const albumPlayer = pageFrom('pages/audio/detail.js');
  await boot(albumPlayer, { albumId: 'newalbum', episodeId: 'new-episode' });
  assert.equal(albumPlayer.data.unavailable, false, '专辑节目可打开');
  albumPlayer.playPreview();
  assert.equal(albumPlayer.data.playing, true, '专辑节目可播放');
  albumPlayer.onUnload();

  // --- 参考行程 ---
  const itinerary = pageFrom('pages/itinerary/index.js');
  await boot(itinerary, {});
  assert(itinerary.data.list.some((t) => t.id === 'newtrip'), '参考行程列表出现新行程');

  const visitorPage = pageFrom('pages/attraction/visitor-section.js');
  await boot(visitorPage, { id: 'newspot', kind: 'hours' });
  assert.equal(visitorPage.data.spot && visitorPage.data.spot.id, 'newspot', '参观指南详情加载新景点');

  const liveBooking = pageFrom('pages/live-booking/live-booking.js');
  await boot(liveBooking, {});
  assert(liveBooking.data.spots.some((s) => s.id === 'newspot'), '实时预约选择器加载新景点');

  // ===== 阶段 2：补录后再次进入页面必须重新拉取（不得一直吃内存缓存）=====
  const refreshCases = [
    ['首页', 'pages/index/index.js', {}, 'onShow'],
    ['知识库', 'pages/knowledge/knowledge.js', {}, 'onShow'],
    ['目的地城市页', 'pages/city/index.js', { id: 'newcity' }, 'onShow'],
    ['城市景点页', 'pages/city/spots.js', { id: 'newcity' }, 'onShow'],
    ['参考行程列表', 'pages/itinerary/index.js', {}, 'onShow'],
    ['景点详情', 'pages/attraction/detail.js', { id: 'newspot' }, 'onShow'],
    ['参观指南详情', 'pages/attraction/visitor-section.js', { id: 'newspot', kind: 'hours' }, 'onShow'],
    ['讲解点列表', 'pages/audio/collection.js', { attractionId: 'newspot', category: 'expert' }, 'onShow'],
    ['路线详情', 'pages/audio/route.js', { attractionId: 'newspot', id: 'newroute' }, 'onShow'],
    ['音频播放页', 'pages/audio/detail.js', { attractionId: 'newspot', trackId: 'new-online', category: 'online', pointId: 'newpoint' }, 'onShow'],
    ['专辑页', 'pages/audio/album.js', { id: 'newalbum' }, 'onShow'],
    ['行程详情', 'pages/itinerary/detail.js', { id: 'newtrip' }, 'onShow'],
    ['导游页', 'pages/guide/guide.js', { id: 'richard-li' }, 'onShow'],
    ['用车页', 'pages/vehicle/vehicle.js', {}, 'onShow'],
    ['实时预约', 'pages/live-booking/live-booking.js', {}, 'onShow']
  ];
  for (const [label, file, args, phase] of refreshCases) {
    const p = pageFrom(file);
    await boot(p, args);
    const before = requests.length;
    if (phase === 'onShow') { if (typeof p.onShow === 'function') p.onShow(); } else { if (typeof p.onLoad === 'function') p.onLoad(args); if (typeof p.onShow === 'function') p.onShow(); }
    await settle(p);
    assert(requests.length > before, `${label} 在补录后再次进入会重新拉取 /api/content，不会吃内存缓存`);
  }

  // ===== 阶段 3：断网回退仍可用（离线镜像无 status 字段，不得被发布状态过滤误伤）=====
  offline = true;
  const fallback = await content.fetchContent();
  offline = false;
  assert.equal(fallback.state.source, 'local', '断网时回退本地镜像');
  assert(content.getAttractions(fallback.data).length > 0, '离线镜像景点仍可见');
  assert(content.getCities(fallback.data).length > 0, '离线镜像城市仍可见');

  console.log('PASS: 补录链路 — 新增城市/目的地/景点/亮点/讲解点/三路音频/路线/专辑节目/参考行程均可被小程序正确加载；草稿景点、草稿音频、草稿城市、无绑定目的地、无试听节目一律不展示；各页再次进入会重新拉取最新数据；断网回退本地镜像仍可用；0 真实网络请求');
})().catch((error) => { console.error(error); process.exitCode = 1; });
