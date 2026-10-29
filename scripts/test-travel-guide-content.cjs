// Website 合成 HTTP fixture → 真实 data/content → 真实页面；不访问网络或其他仓库。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const bytes = fs.readFileSync(path.join(__dirname, 'fixtures/travel-guide-public.json'));
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), '463097dca924e214a6be79f0015a317f9e004f71e9696e9a4bd89ae53306e79f');
const fixtures = JSON.parse(bytes).cases;
const app = { globalData: { apiBase: 'https://fixture.invalid', contentSettings: { travelGuideDocs: { visa: '/docs/STALE.pdf' } } } };
let response, offline = false, contractError = false, downloads = [], opened = [], toasts = [], requests = 0;
const pending = [];
const storage = new Map();
const cache = new Map();
let config;
const wx = {
  getStorageSync: (key) => storage.get(key) || '', setStorageSync(key, value) { storage.set(key, value); }, removeStorageSync(key) { storage.delete(key); },
  getWindowInfo: () => ({ statusBarHeight: 20 }), showToast: (o) => toasts.push(o), showModal() {},
  showLoading() {}, hideLoading() {}, switchTab() {},
  downloadFile(o) { downloads.push(o); }, openDocument(o) { opened.push(o); },
  request(o) { requests++; pending.push(() => offline ? o.fail({}) : o.success({ statusCode: 200, data: contractError ? {} : {
    countries: [], cities: [], attractions: [], sampleItineraries: [], routes: [], destinations: [], ...response
  } })); }
};
function load(rel) {
  const file = path.resolve(ROOT, rel.endsWith('.js') ? rel : rel + '.js');
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module, exports: module.exports,
    require: (id) => load(path.resolve(path.dirname(file), id)), wx, getApp: () => app,
    Page: (page) => { config = page; }, console, setTimeout, clearTimeout
  }, { filename: file });
  return module.exports;
}
const content = load('data/content');
const i18n = load('utils/i18n');
const { documentUrl, guideView } = load('utils/travel-guide');
load('pages/travel-guide/travel-guide');
const createPage = () => ({ ...config, data: structuredClone(config.data), setData(next) { Object.assign(this.data, next); } });
async function flush() { while (pending.length) pending.shift()(); await Promise.resolve(); await Promise.resolve(); }
async function main() {
  let total = 0;
  for (const item of fixtures) {
    for (const locale of ['zh-CN', 'zh-TW', 'en']) {
      i18n.setLocale(locale);
      content.invalidate(); response = item.content;
      const page = createPage(); page.onLoad(); page.onShow();
      assert.equal(page.data.loading, true, 'direct entry fetches content, not stale globals');
      await flush();
      assert.equal(page.data.loading, false);
      const remote = response.travelGuide;
      const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : '';
      if (remote) {
        assert.equal(page.data.guideTitle, remote['title' + suffix] || remote.title);
        assert.deepEqual(JSON.parse(JSON.stringify(page._guideContent.travelGuide)), remote, 'adapter preserves top-level guide');
        assert.equal(page.data.guideEnabled, remote.enabled !== false);
        const expected = remote.enabled === false ? [] : remote.sections;
        assert.deepEqual(Array.from(page.data.sections, (s) => s.key), expected.map((s) => s.key));
        expected.forEach((section, n) => {
          const actual = page.data.sections[n];
          assert.equal(actual.title, section['title' + suffix] || section.title);
          assert.equal(actual.kicker, section.kicker);
          assert.deepEqual(Array.from(actual.guides, (g) => g.key), section.cards.map((c) => c.key));
          section.cards.forEach((card, index) => {
            const guide = actual.guides[index];
            assert.equal(guide.title, card['title' + suffix] || card.title);
            assert.equal(guide.desc, card['desc' + suffix] || card.desc);
            const points = card['points' + suffix];
            assert.deepEqual(Array.from(guide.points), points && points.length ? points : card.points);
            assert.equal(guide.docUrl, documentUrl(response.settings.travelGuideDocs[card.key], app.globalData.apiBase));
          });
        });
      } else {
        assert.equal(page.data.guideConfigured, false);
        assert.equal(page.data.sections.length, i18n.getMessages(locale).travel.sections.length, 'old API explicitly falls back to local copy');
        assert.ok(!JSON.stringify(page.data.sections).includes('STALE'), 'no global settings reuse');
      }
      total++;
    }
  }
  // 每次返回强制刷新，覆盖新增/删除/排序/关闭；语言切换不能重新盖回静态默认卡。
  i18n.setLocale('zh-CN');
  const page = createPage(); page.onLoad(); response = fixtures[0].content; page.onShow(); await flush();
  const before = requests;
  response = fixtures[2].content; page.onShow(); await flush();
  assert.equal(requests, before + 1);
  assert.equal(page.data.sections.length, response.travelGuide.sections.length);
  i18n.setLocale('en'); page.applyLocale();
  assert.equal(page.data.guideTitle, response.travelGuide.titleEn);
  assert.equal(page.data.sections[0].key, response.travelGuide.sections[0].key);
  // settings 空映射应清掉旧文档，即使 travelGuide.docs 尚残留。
  const conflict = structuredClone(fixtures[0].content); conflict.settings.travelGuideDocs = {};
  assert.ok(guideView(conflict, i18n.getMessages().travel, 'en', app.globalData.apiBase).sections.every((s) => s.guides.every((g) => !g.docUrl)));
  response = fixtures[0].content; page.onShow(); await flush();
  const section = page.data.sections[0]; const guide = section.guides.find((g) => g.docUrl);
  page.onDocReadTap({ currentTarget: { dataset: { section: section.key, guide: guide.key } } });
  assert.equal(downloads.at(-1).url, guide.docUrl);
  downloads.at(-1).success({ statusCode: 200, tempFilePath: '/tmp/fixture.pdf' });
  assert.equal(opened.at(-1).filePath, '/tmp/fixture.pdf');
  assert.equal(opened.at(-1).showMenu, false, 'guide documents open without the system menu: no forward/save-to-phone download path');
  downloads.at(-1).success({ statusCode: 404 }); assert.equal(toasts.at(-1).title, page.data.i18n.travel.docFailed);
  downloads.at(-1).fail(); assert.equal(toasts.at(-1).title, page.data.i18n.travel.docFailed);
  opened.at(-1).fail(); assert.equal(toasts.at(-1).title, page.data.i18n.travel.docFailed);
  response = fixtures[3].content; page.onShow(); await flush();
  assert.ok(page.data.sections.every((s) => s.guides.every((g) => !g.docUrl)));
  response = fixtures[4].content; page.onShow(); await flush();
  assert.equal(page.data.guideEnabled, false); assert.equal(page.data.sections.length, 0);
  offline = true; page.onShow(); await flush(); assert.equal(page.data.guideEnabled, false, 'offline must not reopen disabled page');
  offline = false; contractError = true; page.onShow(); await flush();
  assert.equal(page.data.contentError, true); assert.equal(page.data.sections.length, 0);
  contractError = false; response = fixtures[0].content; page.onShow(); page.onUnload(); await flush();
  assert.equal(page.data.sections.length, 0, 'ignore responses after unload');
  for (const url of ['javascript:bad', '//evil.invalid/a', 'http://evil.invalid/a', '/images/a.pdf', '']) assert.equal(documentUrl(url, app.globalData.apiBase), '');
  assert.equal(documentUrl(' /docs/a.pdf ', app.globalData.apiBase), 'https://fixture.invalid/docs/a.pdf');
  const wxml = fs.readFileSync(path.join(ROOT, 'pages/travel-guide/travel-guide.wxml'), 'utf8');
  for (const binding of ['guideTitle', 'guideSubtitle', 'guideKicker', 'guideEnabled', 'contentError', 'guide.docUrl']) assert.ok(wxml.includes(binding));
  console.log(`PASS: ${total} Website fixture/locale replays; direct entry + forced refresh, dynamic groups/cards/docs, disabled/empty/legacy, translations, offline/error, openDocument success/fail, unload and URL safety`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
