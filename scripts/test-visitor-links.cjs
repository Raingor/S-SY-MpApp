// Offline contract regression only: no Website requests or clipboard access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const calls = { clipboard: [], toast: [], images: [] };
const wx = {
  getStorageSync: () => 'zh-CN',
  setClipboardData: (options) => calls.clipboard.push(options),
  showToast: (options) => calls.toast.push(options),
  previewImage: (options) => calls.images.push(options)
};
function load(file) {
  const module = { exports: {} };
  vm.runInNewContext(read(file), { module, wx }, { filename: file });
  return module.exports;
}
const links = load('utils/visitor-links.js');
const mapSource = load('utils/map-source.js');
const i18n = load('utils/i18n.js');
function page(file, content = { getAttractions: () => [] }) {
  let config;
  vm.runInNewContext(read(file), {
    Page: (value) => { config = value; }, getApp: () => ({ globalData: {} }), wx,
    require: (id) => {
      if (id.endsWith('/visitor-links')) return links;
      if (id.endsWith('/map-source')) return mapSource;
      if (id.endsWith('/i18n')) return i18n;
      if (id.endsWith('/navigation')) return { goBack() {} };
      if (id.endsWith('/content')) return content;
      return {};
    }
  }, { filename: file });
  return { ...config, data: structuredClone(config.data), requestedKind: 'hours', setData(next) { Object.assign(this.data, next); } };
}
const plain = (value) => JSON.parse(JSON.stringify(value));
const url = 'https://example.com/official?a=1&b=2';
const anchor = { type: 'element', name: 'a', attrs: { href: url }, children: [{ name: 'strong', children: [{ type: 'text', text: '官网' }] }] };
assert.deepEqual(plain(links.getRichLinks([{ name: 'p', children: [anchor] }], '<a href="https://example.com/official?a=1&amp;b=2">重复</a>')), [{ url, label: '官网' }]);
assert.deepEqual(plain(links.getRichLinks('<a href=\'https://example.com/a?x=1&#38;y=2\'><b>Official</b> &amp; tickets</a>')), [{ url: 'https://example.com/a?x=1&y=2', label: 'Official & tickets' }]);
assert.deepEqual(plain(links.getRichLinks('<a href=https://example.com/map>Map</a>')), [{ url: 'https://example.com/map', label: 'Map' }]);
const legacyUrl = 'https://example.com/transport?from=airport&to=center#bus';
assert.deepEqual(plain(links.getRichLinks(`官网：${legacyUrl}，出发前核对。`)), [{ url: legacyUrl, label: legacyUrl }]);
assert.deepEqual(plain(links.getRichLinks(`<p>官网：${legacyUrl.replace('&', '&amp;')}。</p>`)), [{ url: legacyUrl, label: legacyUrl }]);
assert.deepEqual(plain(links.getRichLinks([{ name: 'p', children: [{ type: 'text', text: `交通\n${legacyUrl}\n` }] }])), [{ url: legacyUrl, label: legacyUrl }]);
assert.deepEqual(plain(links.getRichLinks(`(${legacyUrl}). https://example.com/wiki/Bus_(Athens). https://[2001:db8::1]/map`)).map((link) => link.url), [legacyUrl, 'https://example.com/wiki/Bus_(Athens)', 'https://[2001:db8::1]/map']);
assert.deepEqual(plain(links.getRichLinks(`<p>${url.replace('&', '&amp;')}</p>`, [anchor])), [{ url, label: '官网' }], 'explicit anchors retain their label when also present as plain text');
assert.equal(links.getRichLinks('<img src="https://example.com/image.webp"><p style="background:url(https://example.com/bg)">No URL</p><script>https://example.com/script</script>').length, 0, 'HTML attributes and hidden script text are not website actions');
assert.deepEqual(plain(links.getRichLinks('<a href="https://example.com/target">https://example.com/label</a>')).map((link) => link.url), ['https://example.com/target'], 'URL-looking anchor labels are not extra navigation targets');
assert.equal(links.getRichLinks('http://example.com ftp://example.com /relative').length, 0);
assert.equal(i18n.getMessages('zh-CN').heritage.mapViewOnly, '地图仅支持在线查看，可截图保存');
// Private map endpoint: must keep its own path, never become /images/api/... .
const privateMapUrl = 'https://example.com/api/miniprogram/attraction-map/0123456789abcdef0123456789abcdef.png';
assert.equal(mapSource.isPrivateMapUrl(privateMapUrl), true);
assert.equal(mapSource.isPrivateMapUrl('https://example.com/images/map.webp'), false);
assert.equal(mapSource.isPrivateMapUrl('/api/miniprogram/attraction-map/abc.png'), true);
assert.equal(mapSource.isPrivateMapUrl(''), false);
for (const bad of ['', 'http://example.com', 'javascript:alert(1)', '/relative', 'https://', 'https://example.com bad']) {
  links.copyVisitorLink(bad, {});
  assert.equal(links.httpsLink(bad), '');
  assert.equal(links.getRichLinks([{ ...anchor, attrs: { href: bad } }]).length, 0);
}
assert.equal(calls.clipboard.length, 0, 'invalid links never touch the clipboard');

const fixture = {
  id: 'fixture', name: '测试景点', highlights: [], exhibits: [], audioGuides: [],
  // Website projects guide.*Html to visitorInfoSections; raw guide is legacy text only.
  guide: { hours: '旧时间', tickets: '旧票务', transport: '旧交通', map: '旧地图说明' },
  visitorInfoSections: ['hours', 'tickets', 'transport', 'map'].map((kind, index) => ({
    id: kind, kind, title: kind, status: 'published', sort: index + 1,
    bodyHtml: `<p>${kind}：新内容 <a href="${url.replace('&', '&amp;')}">官网</a></p>`,
    bodyHtmlTw: `<p>${kind}：繁體 <a href="https://example.com/tw">官網</a></p>`,
    bodyHtmlEn: `<p>${kind}: English <a href="https://example.com/en">Official site</a></p>`,
    nodes: [{ type: 'element', name: 'p', children: [{ type: 'text', text: `${kind}：新内容` }, anchor] }],
    nodesTw: [], nodesEn: [],
    ...(kind === 'map' ? { map: { image: 'https://example.com/map.webp', url: 'https://example.com/map', description: '<p>南门入口</p>' }, sourceUrl: 'https://example.com/source', sourceTitle: '景点官网', verifiedAt: '2026-10-27' } : {})
  })),
  customSections: [{ id: 'tip', status: 'published', title: '提示', bodyHtml: '<p><a href="https://example.com/tips">更多</a></p>' }]
};
const before = JSON.stringify(fixture);
const visitor = page('pages/attraction/visitor-section.js');
visitor.applySpot(fixture);
assert.deepEqual(Array.from(visitor.data.sections, (s) => s.kind), ['hours', 'tickets', 'transport', 'map']);
for (const section of visitor.data.sections) {
  assert(section.hasContent && Array.isArray(section.richNodes), `${section.kind} renders Website nodes`);
  assert.equal(section.links[0].url, url);
}
assert.equal(visitor.data.customSections[0].links[0].url, 'https://example.com/tips');
for (const [locale, suffix, expected] of [['zh-TW', 'Tw', 'https://example.com/tw'], ['en', 'En', 'https://example.com/en']]) {
  const translated = structuredClone(fixture);
  // Typical Website output has localized nodes as well as HTML.
  translated.visitorInfoSections.forEach((s) => { s['nodes' + suffix] = [{ ...anchor, attrs: { href: expected } }]; });
  visitor.data.locale = locale;
  visitor.applySpot(translated);
  assert(visitor.data.sections.every((s) => s.links[0].url === expected));
}
visitor.data.locale = 'zh-CN';
const htmlOnly = structuredClone(fixture);
htmlOnly.visitorInfoSections.forEach((s) => { s.nodes = []; });
visitor.applySpot(htmlOnly);
assert(visitor.data.sections.every((s) => typeof s.richNodes === 'string' && s.links[0].url === url));
const legacy = structuredClone(fixture);
legacy.visitorInfoSections = [];
visitor.applySpot(legacy);
assert.equal(visitor.data.sections[0].hoursText, '旧时间');
assert.equal(visitor.data.sections[1].richNodes, '旧票务');
assert.equal(visitor.data.sections[2].richNodes, '旧交通');
assert.equal(visitor.data.sections[3].richNodes, '旧地图说明');
const legacyUrls = structuredClone(legacy);
for (const kind of ['hours', 'tickets', 'transport', 'map']) legacyUrls.guide[kind] = `旧内容官网：https://example.com/${kind}。`;
const legacyBefore = JSON.stringify(legacyUrls);
visitor.applySpot(legacyUrls);
for (const section of visitor.data.sections) assert.equal(section.links[0].url, `https://example.com/${section.kind}`, 'legacy guide plain text, including hoursText, yields a copy action');
assert.equal(JSON.stringify(legacyUrls), legacyBefore, 'reading old text never migrates it into *Html');
const serverFallback = structuredClone(legacy);
serverFallback.visitorInfoSections = ['hours', 'tickets', 'transport', 'map'].map((kind) => ({ kind, bodyHtml: `<p>官网：https://example.com/${kind}?x=1&amp;y=2。</p>`, nodes: [{ type: 'element', name: 'p', children: [{ type: 'text', text: `官网：https://example.com/${kind}?x=1&y=2。` }] }] }));
visitor.applySpot(serverFallback);
for (const section of visitor.data.sections) {
  assert.equal(section.links.length, 1, 'plain text in fallback HTML and nodes is deduplicated');
  const expected = `https://example.com/${section.kind}?x=1&y=2`;
  assert.equal(section.links[0].url, expected);
  visitor.onCopyLinkTap({ currentTarget: { dataset: { url: section.links[0].url } } });
  assert.equal(calls.clipboard.at(-1).data, expected);
}
visitor.applySpot(fixture);
visitor.onTabTap({ currentTarget: { dataset: { kind: 'map' } } });
visitor.onMapTap();
assert.equal(calls.images.at(-1).urls[0], 'https://example.com/map.webp');
// Website 私有地图：只在线浏览，不进入可长按保存的系统预览。
const privateMap = structuredClone(fixture);
privateMap.visitorInfoSections.find((s) => s.kind === 'map').map = { image: privateMapUrl, url: 'https://example.com/map' };
visitor.applySpot(privateMap);
visitor.onTabTap({ currentTarget: { dataset: { kind: 'map' } } });
const imageCallsBefore = calls.images.length;
const toastCallsBefore = calls.toast.length;
visitor.onMapTap();
assert.equal(calls.images.length, imageCallsBefore, 'private map is never opened in the save-capable preview');
assert.equal(calls.toast.length, toastCallsBefore, 'opening the viewer shows no toast; the component hint carries the view-only message');
assert.equal(visitor.data.mapZoomOpen, true, 'private map opens the in-app zoom viewer');
assert.equal(visitor.data.mapZoomImage, privateMapUrl);
visitor.onMapZoomClose();
assert.equal(visitor.data.mapZoomOpen, false);
visitor.onMapLinkTap();
assert.equal(calls.clipboard.at(-1).data, 'https://example.com/map', 'private map still allows copying its public map link');
visitor.applySpot(fixture);
visitor.onTabTap({ currentTarget: { dataset: { kind: 'map' } } });
visitor.onMapLinkTap();
assert.equal(calls.clipboard.at(-1).data, 'https://example.com/map', 'map link copies even when an image also exists');
visitor.onSourceTap();
assert.equal(calls.clipboard.at(-1).data, 'https://example.com/source');
visitor.onCopyLinkTap({ currentTarget: { dataset: { url } } });
assert.equal(calls.clipboard.at(-1).data, url);
visitor.onRichTextTap({}); // Native taps without href do not copy or invent a URL.
assert.equal(JSON.stringify(fixture), before, 'rendering never mutates source data');

for (const locale of ['zh-CN', 'zh-TW', 'en']) {
  const messages = i18n.getMessages(locale).heritage;
  assert(messages.copyLink && messages.visitorLinkCopyFailed);
  const priorToasts = calls.toast.length;
  links.copyVisitorLink(url, messages);
  const request = calls.clipboard.at(-1);
  assert.equal(request.showToast, false);
  assert.equal(priorToasts, calls.toast.length, 'no success toast before clipboard callback');
  request.success();
  assert.equal(calls.toast.at(-1).title, messages.visitorLinkCopied);
  request.fail();
  assert.equal(calls.toast.at(-1).title, messages.visitorLinkCopyFailed);
}
assert.equal(i18n.getMessages('zh-CN').heritage.visitorLinkCopied, '已复制，请在浏览器打开');

const detail = page('pages/attraction/detail.js');
detail.data.visitorMap = privateMapUrl;
detail.onMapTap();
assert.equal(calls.images.length, imageCallsBefore, 'attraction detail also skips the save-capable preview for private maps');
assert.equal(detail.data.mapZoomOpen, true, 'detail opens the in-app zoom viewer without a toast');
detail.onMapZoomClose();
detail.data.visitorMap = '';
detail.data.visitorSource = url;
detail.onSourceTap();
calls.clipboard.at(-1).success();
assert.equal(calls.toast.at(-1).title, '已复制，请在浏览器打开');
detail.onRichTextTap({ detail: { href: url } });
assert.equal(calls.clipboard.at(-1).data, url);
detail.data.visitorMapUrl = 'https://example.com/map';
detail.onMapTap();
assert.equal(calls.clipboard.at(-1).data, 'https://example.com/map');
const markup = read('pages/attraction/visitor-section.wxml');
assert(markup.includes('wx:for="{{activeSection.links}}"') && markup.includes('wx:for="{{item.links}}"'));
assert(markup.includes('bindtap="onCopyLinkTap"') && markup.includes('bindtap="onMapLinkTap"'));
assert(markup.includes('!activeSection.mapImage && !activeSection.mapUrl'), 'map-only content does not show a false empty state');
async function replayWebsiteFixture() {
  // Untouched synthetic attachment supplied by Website's real publicHeritage.
  // This is not a captured /api/content response; envelope metadata is synthetic.
  const bytes = fs.readFileSync(path.join(root, 'scripts/fixtures/visitor-guide-public-heritage.json'));
  assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'), 'e43c184bebc189d811fffeeb039037309b53435570fa706533d3520842547957');
  const supplied = JSON.parse(bytes);
  assert.equal(supplied.synthetic, true);
  assert.equal(supplied.source, 'publicHeritage');
  const raw = { id: 'fixture-spot', name: '合成景点', status: 'published', ...supplied.attractionDetails['fixture-spot'] };
  const rawBefore = JSON.stringify(raw);
  let payload = { cities: [], routes: [], destinations: [], sampleItineraries: [], attractions: [raw] };
  const requestPaths = [];
  const adapterModule = { exports: {} };
  const app = { globalData: { apiBase: 'https://fixture.invalid' } };
  vm.runInNewContext(read('data/content.js'), {
    module: adapterModule,
    require: (id) => { assert.equal(id, './mirror-content'); return { getContent: () => ({}) }; },
    getApp: () => app,
    wx: { ...wx, getStorageSync: () => '', request: (options) => {
      assert(options.url.startsWith('https://fixture.invalid/api/content?'), 'all requests are intercepted offline');
      assert.equal(options.method, 'GET');
      requestPaths.push(options.url.slice('https://fixture.invalid'.length));
      options.success({ statusCode: 200, data: payload });
    } }
  }, { filename: 'data/content.js' });
  const adapter = adapterModule.exports;
  const loaded = await new Promise((resolve) => adapter.loadContent((data, state) => resolve({ data, state }), true));
  assert.equal(loaded.state.source, 'remote'); // Simulated HTTP success, NOT a live remote request.
  const adapted = adapter.getAttraction('fixture-spot', loaded.data);
  assert.equal(adapted.visitorInfoSections[3].map.image, 'https://fixture.invalid/images/fixture-map.webp');
  // Website private map endpoint keeps its own path; no /images/ prefix is invented.
  payload = structuredClone(payload);
  payload.attractions[0].visitorInfoSections[3].map.image = '/api/miniprogram/attraction-map/0123456789abcdef0123456789abcdef.png';
  const privateLoaded = await new Promise((resolve) => adapter.loadContent((data, state) => resolve({ data, state }), true));
  const privateAdapted = adapter.getAttraction('fixture-spot', privateLoaded.data);
  assert.equal(privateAdapted.visitorInfoSections[3].map.image, 'https://fixture.invalid/api/miniprogram/attraction-map/0123456789abcdef0123456789abcdef.png');
  assert.equal(privateAdapted.visitorInfoSections[3].map.image.includes('/images/api/'), false);
  // Website promises an absolute /api/ path, but tolerate ./ and // prefixes too.
  for (const prefix of ['./', '//']) {
    payload = structuredClone(payload);
    payload.attractions[0].visitorInfoSections[3].map.image = prefix + 'api/miniprogram/attraction-map/0123456789abcdef0123456789abcdef.png';
    const tolerant = await new Promise((resolve) => adapter.loadContent((data, state) => resolve({ data, state }), true));
    assert.equal(adapter.getAttraction('fixture-spot', tolerant.data).visitorInfoSections[3].map.image, 'https://fixture.invalid/api/miniprogram/attraction-map/0123456789abcdef0123456789abcdef.png');
  }
  payload = structuredClone(payload);
  payload.attractions[0].visitorInfoSections[3].map.image = './images/legacy-a.png';
  const legacyReload = await new Promise((resolve) => adapter.loadContent((data, state) => resolve({ data, state }), true));
  assert.equal(adapter.getAttraction('fixture-spot', legacyReload.data).visitorInfoSections[3].map.image, 'https://fixture.invalid/images/legacy-a.png', 'legacy ./images/ paths keep the public images route');
  payload = { cities: [], routes: [], destinations: [], sampleItineraries: [], attractions: [raw] };
  assert.deepEqual(plain(adapted.hiddenSections), ['route', 'expert']);
  const replay = page('pages/attraction/visitor-section.js', adapter);
  replay.spotId = 'fixture-spot';
  replay.loadSpot();
  await new Promise(setImmediate);
  assert.equal(replay.data.failed, false);
  for (const locale of ['zh-CN', 'zh-TW', 'en']) {
    replay.data.locale = locale;
    replay.data.i18n = i18n.getMessages(locale);
    replay.applySpot(adapted);
    for (const section of replay.data.sections) {
      assert(section.hasContent, `${locale}/${section.kind} retains Website rich content or documented fallback`);
      if (locale === 'zh-CN' || section.kind !== 'hours') {
        assert.equal(section.links[0].url, `https://example.com/${section.kind}`);
        const source = raw.visitorInfoSections.find((s) => s.kind === section.kind);
        if (Array.isArray(section.richNodes)) assert.deepEqual(plain(section.richNodes), source.nodes);
        else assert.equal(section.richNodes, source.bodyHtml);
      } else {
        assert.equal(section.links.length, 0, 'localized hours without a link must not inherit a Chinese link');
      }
    }
    replay.onTabTap({ currentTarget: { dataset: { kind: 'map' } } });
    assert.equal(replay.data.activeSection.sourceTitle, locale === 'en' ? 'Official site' : locale === 'zh-TW' ? '景點官網' : '景点官网');
    replay.onSourceTap();
    assert.equal(calls.clipboard.at(-1).data, 'https://example.com/official');
    calls.clipboard.at(-1).success();
    assert.equal(calls.toast.at(-1).title, i18n.getMessages(locale).heritage.visitorLinkCopied);
    replay.onMapTap();
    assert.equal(calls.images.at(-1).urls[0], 'https://fixture.invalid/images/fixture-map.webp');
    replay.onMapLinkTap();
    assert.equal(calls.clipboard.at(-1).data, 'https://example.com/map');
  }
  assert.equal(JSON.stringify(raw), rawBefore, 'real adapter and pages do not mutate the delivered fixture');

  // Separate proof using Website's full, isolated HTTP output, not our envelope.
  const httpBytes = fs.readFileSync(path.join(root, 'scripts/fixtures/visitor-guide-http.json'));
  assert.equal(require('node:crypto').createHash('sha256').update(httpBytes).digest('hex'), '6528b81428c688d27eb3c17e8db9c4804ceafd8247dcb3c15ccb577153434e6d');
  const http = JSON.parse(httpBytes);
  assert.equal(http.synthetic, true);
  assert.equal(http.schemaVersion, 1);
  assert.equal(http.request.method, 'GET');
  assert.equal(http.request.path, '/api/content?country=greece&includeAttractionDetails=false');
  assert.equal(http.response.status, 200);
  payload = http.response.body;
  assert.equal(payload.attractions.length, 87);
  assert.equal(Object.hasOwn(payload, 'attractionDetails'), false, 'false removes only the redundant top-level detail map');
  const payloadBefore = JSON.stringify(payload);
  const full = await new Promise((resolve) => adapter.loadContent((data, state) => resolve({ data, state }), true));
  assert.equal(requestPaths.at(-1), http.request.path, 'MpApp request matches the actual HTTP fixture path');
  assert.equal(full.state.status, 'ready');
  assert.equal(full.data.attractions.length, 87);
  const target = adapter.getAttraction('acropolis', full.data);
  assert(target && target.visitorInfoSections.length >= 4, 'full response still includes the sight details');
  const targetMap = target.visitorInfoSections.find((s) => s.kind === 'map');
  assert.equal(targetMap.map.image, 'https://fixture.invalid/images/test-only-map.webp');
  const fullVisitor = page('pages/attraction/visitor-section.js', adapter);
  fullVisitor.spotId = 'acropolis';
  fullVisitor.loadSpot();
  await new Promise(setImmediate);
  assert.equal(fullVisitor.data.failed, false);
  assert.equal(fullVisitor.data.spot.id, 'acropolis');
  const fullDetail = page('pages/attraction/detail.js', adapter);
  for (const locale of ['zh-CN', 'zh-TW', 'en']) {
    for (const instance of [fullVisitor, fullDetail]) {
      instance.data.locale = locale;
      instance.data.i18n = i18n.getMessages(locale);
    }
    // All 87 records should render four fixed cards without resurrecting FAQ/expert.
    for (const spot of full.data.attractions) {
      fullVisitor.applySpot(spot);
      assert.deepEqual(Array.from(fullVisitor.data.sections, (s) => s.kind), ['hours', 'tickets', 'transport', 'map']);
      fullDetail.applyPageCopy(full.data.attractionDetailPage, spot);
      fullDetail.applySpot(spot);
      assert.equal(fullDetail.data.pageCopy.sections.expert.hidden, true);
      assert.equal(fullDetail.data.visitorSections.length, 4);
    }
    fullVisitor.applySpot(target);
    for (const section of fullVisitor.data.sections) {
      assert(section.hasContent);
      if (locale === 'zh-TW' && section.kind === 'hours') {
        assert.equal(section.links.length, 0, 'translated hours intentionally contain no website link');
        assert.equal(section.richNodes[0].children[0].text, '保留繁體時間');
      } else {
        assert.equal(section.links[0].url, `https://example.test/${section.kind}`);
        assert.equal(section.links.length, 1, 'nodes and HTML do not create duplicate copy actions');
        const tags = new Set();
        const walk = (nodes) => (Array.isArray(nodes) ? nodes : []).forEach((node) => { if (node.name) tags.add(node.name); walk(node.children); });
        if (Array.isArray(section.richNodes)) {
          walk(section.richNodes);
          for (const tag of ['h3', 'strong', 'ul', 'li', 'a']) assert(tags.has(tag), `${locale}/${section.kind} preserves ${tag}`);
        } else assert.equal(section.richNodes, target.visitorInfoSections.find((s) => s.kind === section.kind).bodyHtml);
        fullVisitor.onCopyLinkTap({ currentTarget: { dataset: { url: section.links[0].url } } });
        assert.equal(calls.clipboard.at(-1).data, `https://example.test/${section.kind}`);
      }
    }
    fullVisitor.onTabTap({ currentTarget: { dataset: { kind: 'map' } } });
    fullVisitor.onMapTap();
    assert.equal(calls.images.at(-1).urls[0], 'https://fixture.invalid/images/test-only-map.webp');
    fullVisitor.onMapLinkTap();
    assert.equal(calls.clipboard.at(-1).data, 'https://example.test/map');
    fullVisitor.onSourceTap();
    assert.equal(calls.clipboard.at(-1).data, 'https://example.test/official');
    calls.clipboard.at(-1).success();
    assert.equal(calls.toast.at(-1).title, i18n.getMessages(locale).heritage.visitorLinkCopied);
  }
  assert.equal(JSON.stringify(payload), payloadBefore, 'full HTTP body stays untouched');
  assert(requestPaths.every((p) => p === http.request.path));
  const ignored = JSON.parse(read('project.config.json')).packOptions.ignore;
  assert(ignored.some((entry) => entry.type === 'folder' && entry.value === 'scripts'), 'large synthetic test fixtures stay out of the Mini Program upload');
}
replayWebsiteFixture().then(() => {
  console.log('PASS: visitor links and SHA-verified Website structure + full includeAttractionDetails=false HTTP fixtures; real adapter/pages, 87 sights x 3 locales, expert hidden, copy hints and map separation (all offline)');
}).catch((error) => { console.error(error); process.exitCode = 1; });
