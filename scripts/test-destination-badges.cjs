// Destination badge settings: actual content adapter and homepage, mocked wx only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const modules = new Map();
function loadModule(filename) {
  const resolved = require.resolve(filename);
  if (modules.has(resolved)) return modules.get(resolved).exports;
  const module = { exports: {} };
  modules.set(resolved, module);
  const localRequire = (id) => id.startsWith('.') ? loadModule(path.resolve(path.dirname(resolved), id)) : require(id);
  vm.runInThisContext('(function(require,module,exports){\n' + fs.readFileSync(resolved, 'utf8') + '\n})', { filename: resolved })(localRequire, module, module.exports);
  return module.exports;
}

let locale = 'zh-CN';
const requests = [];
const app = { globalData: { apiBase: 'https://content.example', countryId: 'greece' } };
global.getApp = () => app;
global.wx = {
  getStorageSync: (key) => key === 'sy_mp_locale' ? locale : key === 'sy_mp_country_id' ? 'greece' : '',
  request: (options) => requests.push(options),
  showToast: () => {},
  showModal: () => {}
};
const content = loadModule(path.resolve(__dirname, '../data/content.js'));
const fixture = {
  countries: [], guides: [], attractions: [], routes: [], sampleItineraries: [],
  cities: [{ id: 'city' }],
  destinations: [
    { id: 'hot', cityId: 'city', type: 'culture', featured: true, hiddenGem: true, sort: 2 },
    { id: 'gem', cityId: 'city', type: 'culture', hiddenGem: true, sort: 1 },
    { id: 'plain', cityId: 'city', type: 'culture' }
  ],
  settings: {
    destinationBadges: {
      featured: { text: ' 人气 ', textTw: ' 人氣 ', textEn: ' Trending ', icon: ' ./images/custom-hot.png ' },
      hiddenGem: { text: ' 私藏 ', textTw: ' 私藏景點 ', textEn: ' Hidden treasure ', icon: '' }
    }
  }
};
function tile(data, id, language = 'zh-CN') {
  return content.getHomeDestinations(data, language)[0].tiles.find((item) => item.id === id);
}

async function main() {
  const pending = new Promise((resolve) => content.loadContent(resolve, true));
  assert.equal(requests.length, 1);
  requests.shift().success({ statusCode: 200, data: fixture });
  const data = await pending;
  assert.equal(data.settings.destinationBadges.featured.text, ' 人气 ', 'remote settings remain available to the adapter');
  assert.deepEqual(tile(data, 'hot').badge, { text: '人气', icon: 'https://content.example/images/custom-hot.png' });
  assert.equal(tile(data, 'hot').hiddenGem, false, 'featured still wins if both flags are set');
  assert.equal(tile(data, 'plain').badge, null, 'unclassified destinations have no badge');
  assert.deepEqual(content.getHomeDestinations(data)[0].tiles.map((item) => item.id), ['gem', 'hot', 'plain'], 'badge settings do not change destination sorting');

  const defaults = { 'zh-CN': ['热门', '小众'], 'zh-TW': ['熱門', '小眾'], en: ['Popular', 'Hidden gem'] };
  const translated = { 'zh-CN': ['人气', '私藏'], 'zh-TW': ['人氣', '私藏景點'], en: ['Trending', 'Hidden treasure'] };
  for (const language of Object.keys(defaults)) {
    for (const [index, id] of ['hot', 'gem'].entries()) {
      assert.equal(tile(data, id, language).badge.text, translated[language][index]);
      assert.equal(tile({ ...data, settings: {} }, id, language).badge.text, defaults[language][index], 'old API uses translated defaults');
      assert.equal(tile({ ...data, settings: null }, id, language).badge.icon, '', 'missing settings never manufacture an icon');
    }
  }
  const baseTextOnly = { ...data, settings: { destinationBadges: { featured: { text: ' 推荐 ', textTw: ' ', textEn: '', icon: 'https://cdn.example/badge.png' } } } };
  assert.deepEqual(tile(baseTextOnly, 'hot', 'en').badge, { text: '推荐', icon: 'https://cdn.example/badge.png' }, 'blank translation falls back to primary text and absolute icon URLs stay intact');
  const noText = { ...data, settings: { destinationBadges: { featured: { text: '', textEn: ' ', icon: '/images/athens.webp' } } } };
  assert.deepEqual(tile(noText, 'hot', 'en').badge, { text: 'Popular', icon: 'https://content.example/images/athens.webp' }, 'uploaded icon paths never use old bundled-image filename mappings');

  let definition;
  global.Page = (value) => { definition = value; };
  loadModule(path.resolve(__dirname, '../pages/index/index.js'));
  const home = {
    ...definition,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(patch) {
      for (const [key, value] of Object.entries(patch)) {
        const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.');
        const last = parts.pop();
        const target = parts.reduce((object, part) => object[part], this.data);
        target[last] = value;
      }
    }
  };
  home.destinationContent = data;
  home.applyLocale();
  assert.equal(home.data.destinations[0].tiles[1].badge.text, '人气');
  locale = 'en';
  home.applyLocale();
  assert.equal(home.data.destinations[0].tiles[1].badge.text, 'Trending', 'locale changes rebuild badge text without requesting content');
  home.onDestBadgeIconError({ currentTarget: { dataset: { groupIndex: 0, tileIndex: 1 } } });
  assert.equal(home.data.destinations[0].tiles[1].badge.icon, '', 'failed image switches the affected badge back to text');
  assert.equal(home.data.destinations[0].tiles[1].badge.text, 'Trending');
  assert.equal(data.settings.destinationBadges.featured.icon, ' ./images/custom-hot.png ', 'image failures do not overwrite backend settings');
  home.onDestBadgeIconError({ currentTarget: { dataset: { groupIndex: 99, tileIndex: 99 } } });
  const changed = JSON.parse(JSON.stringify(fixture));
  changed.settings.destinationBadges.featured = { text: '新推荐', textEn: 'New pick', icon: '' };
  home.applyRemoteContent();
  assert.equal(requests.length, 1, 'home refresh fetches updated badge settings');
  requests.shift().success({ statusCode: 200, data: changed });
  await Promise.resolve();
  assert.deepEqual(home.data.destinations[0].tiles[1].badge, { text: 'New pick', icon: '' }, 'fresh backend settings can switch from icon mode to text without a release');
  assert.equal(requests.length, 0, 'all content requests were mocked; no live API calls');
  console.log('PASS: destination badges use backend text/icon, three-language fallback, managed image URLs, featured priority, refresh and image-error fallback; 0 real requests');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
