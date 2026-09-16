// 景点、国家与导游内容服务：优先从后端 /api/content 拉取，仅网络离线时回退本地镜像数据
// 后端字段与本地镜像存在差异，本模块统一适配为页面所需结构
const local = require('./mirror-content');

const COUNTRY_STORAGE_KEY = 'sy_mp_country_id';
const DEFAULT_COUNTRY_ID = 'greece';
let cache = null;          // { countries, guides, cities, attractions, sampleItineraries }
let fetching = null;       // 进行中的请求 Promise（去重）
let remoteLoaded = false;
let loadState = { source: 'local', status: 'initial', reason: '' };
let fallbackNoticeShown = false;

const EMPTY_CONTENT = { countries: [], guides: [], cities: [], attractions: [], sampleItineraries: [], destinations: [] };
const DEFAULT_COUNTRY = { id: DEFAULT_COUNTRY_ID, name: '希腊', nameTw: '希臘', nameEn: 'Greece', enabled: true, sort: 1 };

function hasRemoteContract(data) {
  return Boolean(
    data &&
    Array.isArray(data.cities) &&
    Array.isArray(data.attractions) &&
    Array.isArray(data.sampleItineraries) &&
    Array.isArray(data.routes) &&
    Array.isArray(data.destinations)
  );
}

function notifyFallback(state) {
  if (fallbackNoticeShown) return;
  fallbackNoticeShown = true;
  if (state.reason === 'offline') {
    wx.showToast({ title: '网络异常，当前显示离线内容', icon: 'none', duration: 2600 });
    return;
  }
  wx.showModal({
    title: '内容服务暂不可用',
    content: '线上内容接口字段不完整，当前页面不会使用本地镜像冒充正式数据，请稍后重试。',
    confirmText: '知道了',
    showCancel: false
  });
}

// 后端 image 为 './images/xxx.webp'（相对官网），小程序替换为本地素材映射
const IMAGE_FALLBACK = {
  'athens.webp': '/assets/images/dest/dest-athens.jpg',
  'santorini.webp': '/assets/images/dest/dest-santorini.jpg',
  'mykonos.webp': '/assets/images/dest/dest-mykonos.jpg',
  'delphi.webp': '/assets/images/dest/dest-delphi.jpg',
  'meteora.webp': '/assets/images/dest/dest-meteora.jpg',
  'meteora-square.webp': '/assets/images/dest/dest-meteora.jpg',
  'crete.webp': '/assets/images/dest/dest-crete.jpg',
  'nafplio.webp': '/assets/images/dest/dest-nafplion.jpg',
  'corinth.webp': '/assets/images/dest/dest-peloponnese.jpg',
  'plaka.webp': '/assets/images/dest/dest-athens.jpg'
};

function mapImage(path) {
  if (!path) return '';
  if (path.indexOf('/assets/') === 0) return path; // 已是小程序本地路径
  const file = path.split('/').pop();
  return IMAGE_FALLBACK[file] || '/assets/images/dest/dest-athens.jpg';
}

function mapGuideImage(path, fallback) {
  if (!path) return fallback || '';
  if (path.indexOf('/assets/') === 0 || /^https?:\/\//.test(path)) return path;
  const file = path.split('/').pop();
  if (file === 'richard-avatar.webp') return '/assets/images/guide/richard-avatar.jpg';
  if (file === 'richard-full.webp') return '/assets/images/guide/richard-full.jpg';
  const app = getApp();
  const base = (app && app.globalData && app.globalData.apiBase) || 'https://sy-greece.com';
  return base.replace(/\/$/, '') + '/images/' + file;
}

// 后端 cities：mosaic 为图片路径数组
function adaptCities(remoteCities) {
  return (remoteCities || []).map((city) => ({
    ...city,
    cover: mapImage((city.mosaic || [])[0]),
    mosaic: (city.mosaic || []).map(mapImage)
  }));
}

// 后端 attractions：sizeLabel 可能写作 scale
function adaptAttractions(remoteAttractions) {
  return (remoteAttractions || []).map((item) => ({
    ...item,
    sizeLabel: item.sizeLabel || item.scale || '大型',
    image: mapImage(item.image),
    logo: mapImage(item.logo),
    highlights: (item.highlights || []).map((h) =>
      typeof h === 'string' ? { name: h, desc: '' } : h
    ),
    guide: item.guide || {}
  }));
}

// 后端 sampleItineraries → 页面所需参考行程结构
function adaptSampleTrips(remoteTrips) {
  return (remoteTrips || []).map((trip) => ({
    id: trip.id,
    type: 'reference',
    title: trip.title || trip.name,
    // 首页卡片使用 name；兼容 Website 现有的 title 字段。
    name: trip.name || trip.title,
    img: mapImage(trip.cover),
    days: trip.days,
    highlights: trip.summary,
    tag: trip.tag || (Array.isArray(trip.tags) ? trip.tags.join(' · ') : trip.tags) || '',
    crowd: trip.crowd || '',
    schedule: (trip.itinerary || []).map((day) => ({
      day: day.day,
      city: day.city,
      entries: [{ period: '', text: (day.title ? day.title + '\n' : '') + (day.desc || ''), attractionIds: day.attractionIds || [] }]
    }))
  }));
}

function adaptDestinations(remoteDestinations) {
  return (remoteDestinations || []).map((destination) => ({
    name: destination.name,
    en: destination.en,
    img: mapImage(destination.image),
    type: destination.type || 'culture'
  }));
}

function adaptCountries(remoteCountries) {
  const countries = Array.isArray(remoteCountries) && remoteCountries.length ? remoteCountries : [DEFAULT_COUNTRY];
  return countries.filter((item) => item.enabled !== false).map((item) => ({ ...item, heroImage: mapGuideImage(item.heroImage) }));
}

function adaptGuides(remoteGuides) {
  return (remoteGuides || []).filter((item) => item.enabled !== false).map((item) => ({
    ...item,
    avatar: mapGuideImage(item.avatar, '/assets/images/guide/richard-avatar.jpg'),
    fullImage: mapGuideImage(item.fullImage, '/assets/images/guide/richard-full.jpg'),
    path: '/pages/guide/guide?id=' + encodeURIComponent(item.id)
  }));
}

function getSelectedCountryId() {
  const stored = wx.getStorageSync(COUNTRY_STORAGE_KEY);
  return typeof stored === 'string' && stored ? stored : DEFAULT_COUNTRY_ID;
}

function setSelectedCountryId(countryId) {
  const next = String(countryId || DEFAULT_COUNTRY_ID);
  wx.setStorageSync(COUNTRY_STORAGE_KEY, next);
  const app = getApp();
  if (app && app.globalData) app.globalData.countryId = next;
  cache = null;
  remoteLoaded = false;
  fetching = null;
  loadState = { source: 'local', status: 'initial', reason: '' };
  return next;
}

function countryName(country, locale) {
  if (!country) return '';
  if (locale === 'en') return country.nameEn || country.name || country.id;
  if (locale === 'zh-TW') return country.nameTw || country.name || country.id;
  return country.name || country.nameTw || country.nameEn || country.id;
}

function fetchContent() {
  if (fetching) return fetching;
  const app = getApp();
  const base = (app && app.globalData && app.globalData.apiBase) || 'https://sy-greece.com';
  const countryId = getSelectedCountryId();
  fetching = new Promise((resolve) => {
    wx.request({
      url: base + '/api/content?country=' + encodeURIComponent(countryId),
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        if (res.statusCode === 200 && hasRemoteContract(res.data)) {
          cache = {
            countryId,
            countries: adaptCountries(res.data.countries),
            guides: adaptGuides(res.data.guides),
            cities: adaptCities(res.data.cities),
            attractions: adaptAttractions(res.data.attractions),
            sampleItineraries: adaptSampleTrips(res.data.sampleItineraries),
            destinations: adaptDestinations(res.data.destinations)
          };
          remoteLoaded = true;
          loadState = { source: 'remote', status: 'ready', reason: '' };
          resolve({ data: cache, state: loadState });
          return;
        }
        // HTTP 200 但缺少必需字段是生产契约错误，不能静默使用本地镜像掩盖。
        cache = EMPTY_CONTENT;
        remoteLoaded = false;
        loadState = { source: 'error', status: 'contract-error', reason: 'contract', statusCode: res.statusCode };
        notifyFallback(loadState);
        resolve({ data: EMPTY_CONTENT, state: loadState });
      },
      fail: () => {
        cache = { ...local.getContent(), countryId, countries: [DEFAULT_COUNTRY], guides: [] };
        remoteLoaded = false;
        loadState = { source: 'local', status: 'fallback', reason: 'offline' };
        notifyFallback(loadState);
        resolve({ data: cache, state: loadState });
      }
    });
    // 请求结束后允许下次重试
    setTimeout(() => { fetching = null; }, 0);
  });
  return fetching;
}

// 页面统一入口：options.success 回调形式（与现有页面代码风格一致）
function loadContent(success) {
  if (remoteLoaded && cache) {
    success(cache, loadState);
    return;
  }
  fetchContent().then((result) => success(result.data, result.state));
}

function getContent(source) {
  if (source) return source;
  if (loadState.status === 'contract-error') return EMPTY_CONTENT;
  return remoteLoaded && cache ? cache : { ...local.getContent(), countries: [DEFAULT_COUNTRY], guides: [] };
}

function getCountries(source) {
  return getContent(source).countries || [DEFAULT_COUNTRY];
}

function getGuides(source) {
  return getContent(source).guides || [];
}

function getGuide(id, source) {
  return getGuides(source).find((item) => item.id === id) || null;
}

// ===== 同步查询（本地镜像兜底，接口数据到达后走内存缓存） =====
function getCities(source) {
  const data = getContent(source);
  return data.cities.map((city) => ({
    ...city,
    count: data.attractions.filter((item) => item.city === city.id).length
  }));
}

function getAttractionsByCity(cityId, source) {
  const data = getContent(source);
  if (!cityId || cityId === 'all') return data.attractions;
  return data.attractions.filter((item) => item.city === cityId);
}

function getAttraction(id, source) {
  return getContent(source).attractions.find((item) => item.id === id) || null;
}

function getAttractionNames(ids, source) {
  if (!Array.isArray(ids)) return [];
  const data = getContent(source);
  return ids.map((id) => {
    const item = data.attractions.find((a) => a.id === id);
    return item ? { id, name: item.name } : null;
  }).filter(Boolean);
}

function getReferenceList(source) {
  return getContent(source).sampleItineraries;
}

function getHomeDestinations(source) {
  const destinations = getContent(source).destinations || [];
  const groups = [
    { tab: '文明溯源', type: 'culture' },
    { tab: '海岛度假', type: 'island' }
  ];
  return groups.map((group) => ({
    tab: group.tab,
    tiles: destinations
      .filter((item) => item.type === group.type)
      .map(({ name, en, img }) => ({ name, en, img })),
    chips: []
  }));
}

module.exports = {
  loadContent,
  getCities,
  getAttractionsByCity,
  getAttraction,
  getAttractionNames,
  getReferenceList,
  getHomeDestinations,
  getCountries,
  getGuides,
  getGuide,
  getSelectedCountryId,
  setSelectedCountryId,
  countryName,
  fetchContent,
  getLoadState: () => loadState
};
