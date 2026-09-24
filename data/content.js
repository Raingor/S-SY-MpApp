// 景点、国家与导游内容服务：优先从后端 /api/content 拉取，仅网络离线时回退本地镜像数据
// 后端字段与本地镜像存在差异，本模块统一适配为页面所需结构
const local = require('./mirror-content');

const COUNTRY_STORAGE_KEY = 'sy_mp_country_id';
const DEFAULT_COUNTRY_ID = 'greece';
let cache = null;          // { countries, guides, cities, attractions, sampleItineraries, home }
let fetching = null;       // 进行中的请求 Promise（去重）
let remoteLoaded = false;
let loadState = { source: 'local', status: 'initial', reason: '' };
let fallbackNoticeShown = false;

const EMPTY_CONTENT = { settings: {}, countries: [], guides: [], cities: [], attractions: [], audioAlbums: [], sampleItineraries: [], destinations: [], destinationCategories: [], home: { eyebrow: '', title: '', description: '', banners: [] } };
const DEFAULT_COUNTRY = { id: DEFAULT_COUNTRY_ID, name: '希腊', nameTw: '希臘', nameEn: 'Greece', enabled: true, sort: 1 };
const FALLBACK_DESTINATION_CATEGORIES = [
  { key: 'culture', name: '文明溯源', nameTw: '文明溯源', nameEn: 'Heritage' },
  { key: 'island', name: '海岛度假', nameTw: '海島度假', nameEn: 'Island escapes' }
];

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
  return IMAGE_FALLBACK[file] || mapManagedImage(path);
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

// 后台上传的图片保持远程地址，不套用旧素材文件名映射。
function mapManagedImage(path) {
  if (typeof path !== 'string' || !path.trim()) return '';
  const value = path.trim();
  if (/^https?:\/\//i.test(value) || value.indexOf('/assets/') === 0) return value;
  const app = getApp();
  const base = (app && app.globalData && app.globalData.apiBase) || 'https://sy-greece.com';
  const relative = value.replace(/^(?:\.\/|\/)+/, '').replace(/^(?:images\/)+/, '');
  return base.replace(/\/$/, '') + '/images/' + relative;
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
function isPublished(item) {
  return item && item.enabled !== false && item.published !== false && !['draft', 'disabled', 'inactive', 'archived', 'unpublished'].includes(String(item.status || '').toLowerCase());
}

function adaptAudioAlbums(albums) {
  return (Array.isArray(albums) ? albums : []).filter(isPublished).map((album) => ({
    ...album,
    cover: mapManagedImage(album.cover || album.image),
    episodes: (Array.isArray(album.episodes) ? album.episodes : []).filter((episode) => isPublished(episode) && episode.id && episode.previewUrl).map((episode) => ({ ...episode, cover: mapManagedImage(episode.cover) }))
  })).filter((album) => album.episodes.length > 0);
}

function adaptAttractions(remoteAttractions) {
  return (remoteAttractions || []).map((item) => ({
    ...item,
    sizeLabel: item.sizeLabel || item.scale || '大型',
    image: mapImage(item.image),
    shareTitle: typeof item.shareTitle === 'string' ? item.shareTitle.trim() : '',
    shareImage: mapManagedImage(item.shareImage),
    videoUrl: item.videoUrl || item.video || '',
    videoDuration: Number(item.videoDuration || item.durationSeconds || 0) || 0,
    videoTrialSeconds: Number(item.videoTrialSeconds || item.trialSeconds || 0) || 0,
    paidContent: item.paidContent || {},
    logo: mapImage(item.logo),
    highlights: (item.highlights || []).map((h) =>
      typeof h === 'string' ? { name: h, desc: '', image: '' } : { ...h, image: mapManagedImage(h.image) }
    ),
    visitorInfo: { ...(item.visitorInfo || {}), mapImage: mapManagedImage(item.visitorInfo && item.visitorInfo.mapImage) },
    visitorInfoSections: (Array.isArray(item.visitorInfoSections) ? item.visitorInfoSections : []).map((section, index) => ({
      ...section,
      sort: Number.isFinite(Number(section && section.sort)) ? Number(section.sort) : index,
      map: section && section.map && typeof section.map === 'object' ? { ...section.map, image: mapManagedImage(section.map.image) } : {}
    })).sort((a, b) => a.sort - b.sort),
    customSections: (Array.isArray(item.customSections) ? item.customSections : []).filter(isPublished).map((section, index) => ({
      ...section,
      sort: Number.isFinite(Number(section && section.sort)) ? Number(section.sort) : index,
      map: section && section.map && typeof section.map === 'object' ? { ...section.map, image: mapManagedImage(section.map.image) } : {}
    })).sort((a, b) => a.sort - b.sort),
    guide: { ...(item.guide || {}), mapImage: mapManagedImage(item.guide && item.guide.mapImage) },
    exhibits: (Array.isArray(item.exhibits) ? item.exhibits : []).filter(isPublished).map((point) => ({ ...point, image: mapManagedImage(point.image) })),
    routes: (Array.isArray(item.routes) ? item.routes : []).filter(isPublished),
    audioGuides: (Array.isArray(item.audioGuides) ? item.audioGuides : []).filter((track) => isPublished(track) && track.id && track.previewUrl).map((track) => ({ ...track, cover: mapManagedImage(track.cover) }))
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

function adaptDestinationCategories(remoteCategories) {
  if (!Array.isArray(remoteCategories) || !remoteCategories.length) return [];
  return remoteCategories
    .filter((category) => category && category.enabled !== false && typeof category.key === 'string' && category.key.trim())
    .map((category, index) => ({
      key: category.key.trim(),
      name: category.name || '',
      nameTw: category.nameTw || '',
      nameEn: category.nameEn || '',
      sort: Number.isFinite(Number(category.sort)) ? Number(category.sort) : index
    }))
    .sort((a, b) => a.sort - b.sort);
}

// 首页 Hero：图片、眉标题、主标题和描述全部来自后端 home，不使用本地文案/图片。
function adaptHome(remoteHome) {
  const home = remoteHome && typeof remoteHome === 'object' ? remoteHome : {};
  const banners = Array.isArray(home.banners) ? home.banners : [];
  return {
    eyebrow: typeof home.eyebrow === 'string' ? home.eyebrow.trim() : '',
    title: typeof home.title === 'string' ? home.title.trim() : '',
    description: typeof home.description === 'string' ? home.description.trim() : '',
    banners: banners
      .filter((item) => item && item.enabled === true && typeof item.image === 'string' && item.image.trim())
      .map((item, index) => ({
        id: String(item.id || 'home-hero-' + index),
        img: mapManagedImage(item.image),
        title: typeof item.title === 'string' ? item.title.trim() : '',
        description: typeof item.description === 'string' ? item.description.trim() : '',
        alt: typeof item.alt === 'string' ? item.alt.trim() : '',
        sort: Number.isFinite(Number(item.sort)) ? Number(item.sort) : index
      }))
      .filter((item) => item.img)
      .sort((a, b) => a.sort - b.sort)
  };
}

function adaptDestinations(remoteDestinations) {
  return (remoteDestinations || []).map((destination) => ({
    id: destination.id,
    cityId: typeof destination.cityId === 'string' ? destination.cityId.trim() : '',
    attractionId: typeof destination.attractionId === 'string' ? destination.attractionId.trim() : '',
    attractionIds: Array.isArray(destination.attractionIds)
      ? destination.attractionIds.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim())
      : (typeof destination.attractionId === 'string' && destination.attractionId.trim() ? [destination.attractionId.trim()] : []),
    name: destination.name,
    en: destination.en,
    img: mapManagedImage(destination.image),
    type: typeof destination.type === 'string' ? destination.type.trim() : ''
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
          if (res.data.settings && res.data.settings.miniprogramAccess === false) {
            cache = EMPTY_CONTENT;
            remoteLoaded = false;
            loadState = { source: 'remote', status: 'maintenance', reason: 'maintenance' };
            const app = getApp();
            if (app && typeof app.enterMaintenance === 'function') app.enterMaintenance(res.data.settings);
            resolve({ data: EMPTY_CONTENT, state: loadState });
            return;
          }
          cache = {
            countryId,
            settings: res.data.settings || {},
            countries: adaptCountries(res.data.countries),
            guides: adaptGuides(res.data.guides),
            cities: adaptCities(res.data.cities),
            attractions: adaptAttractions(res.data.attractions),
            audioAlbums: adaptAudioAlbums(res.data.audioAlbums),
            sampleItineraries: adaptSampleTrips(res.data.sampleItineraries),
            destinations: adaptDestinations(res.data.destinations),
            destinationCategories: adaptDestinationCategories(res.data.destinationCategories),
            home: adaptHome(res.data.home)
          };
          if (app && app.globalData) app.globalData.contentSettings = res.data.settings || {};
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
  });
  // 完成后再释放去重锁，不能在请求尚未完成时用零延时定时器释放。
  const pending = fetching;
  pending.then(() => { if (fetching === pending) fetching = null; });
  return pending;
}

// 页面统一入口：options.success 回调形式（与现有页面代码风格一致）
// forceRefresh=true 时忽略内存缓存，重新拉取后端最新内容（后台修改导游信息后即时同步）。
function loadContent(success, forceRefresh) {
  if (!forceRefresh && remoteLoaded && cache) {
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
const INACTIVE_CITY_STATUSES = new Set(['disabled', 'inactive', 'archived', 'draft']);

function isActiveCity(city) {
  if (!city || city.enabled === false) return false;
  const status = String(city.status || '').trim().toLowerCase();
  return !INACTIVE_CITY_STATUSES.has(status);
}

function getCities(source) {
  const data = getContent(source);
  return data.cities.filter(isActiveCity).map((city) => ({
    ...city,
    count: data.attractions.filter((item) => item.city === city.id).length
  }));
}

function getAttractionsByCity(cityId, source) {
  const data = getContent(source);
  if (!cityId || cityId === 'all') return data.attractions;
  return data.attractions.filter((item) => item.city === cityId);
}

function getAttractions(source) {
  return getAttractionsByCity('all', source);
}

function getAttractionsByIds(ids, source) {
  if (!Array.isArray(ids)) return [];
  const byId = new Map(getContent(source).attractions.map((item) => [item.id, item]));
  return ids
    .filter((id) => typeof id === 'string' && id)
    .map((id) => byId.get(id) || null)
    .filter(Boolean);
}

function getDestinationByCity(cityId, source) {
  const data = getContent(source);
  if (!cityId) return null;
  const explicit = (data.destinations || []).find((item) => item && item.cityId === cityId);
  if (explicit) return explicit;
  // 兼容旧接口：仅接受目的地 id 与城市 id 完全一致，不按名称或数组位置猜测。
  const cityIds = new Set(getCities(data).map((city) => city.id));
  return (data.destinations || []).find((item) => item && !item.cityId && item.id === cityId && cityIds.has(item.id)) || null;
}

function getAttraction(id, source) {
  return getContent(source).attractions.find((item) => item.id === id) || null;
}

function getAudioAlbums(source) {
  return getContent(source).audioAlbums || [];
}

// 景点关联条目：带出封面图，供行程页渲染缩略图；找不到的 id 直接丢弃。
function getAttractionNames(ids, source) {
  if (!Array.isArray(ids)) return [];
  const data = getContent(source);
  return ids.map((id) => {
    const item = data.attractions.find((a) => a.id === id);
    return item ? { id, name: item.name, image: item.image || '' } : null;
  }).filter(Boolean);
}

function getReferenceList(source) {
  return getContent(source).sampleItineraries;
}

function getHomeDestinations(source, locale, fallbackLabels) {
  const data = getContent(source);
  const destinations = data.destinations || [];
  const remoteCategories = Array.isArray(data.destinationCategories) && data.destinationCategories.length
    ? data.destinationCategories
    : FALLBACK_DESTINATION_CATEGORIES;
  const labels = fallbackLabels || { culture: '文明溯源', island: '海岛度假' };
  // 防御性过滤：无论缓存是否经历过 adaptDestinationCategories，都在此排除禁用分类，
  // 确保禁用分类在任何代码路径都会从 Tab 列表消失。
  const activeCategories = remoteCategories
    .filter((category) => category && category.enabled !== false)
    .slice()
    .sort((a, b) => {
      const sa = Number.isFinite(Number(a.sort)) ? Number(a.sort) : 0;
      const sb = Number.isFinite(Number(b.sort)) ? Number(b.sort) : 0;
      return sa - sb;
    });
  const groups = activeCategories
    .map((category) => {
      const cityIds = new Set(getCities(data).map((city) => city.id));
      const tiles = destinations
        .filter((item) => item.type === category.key)
        .map((item) => {
          // 新接口优先使用显式 cityId；兼容旧数据时仅接受“目的地 id 与城市 id 完全一致”，不按名称或数组位置猜测。
          const candidateCityId = item.cityId || (cityIds.has(item.id) ? item.id : '');
          const cityId = cityIds.has(candidateCityId) ? candidateCityId : '';
          return cityId ? {
            id: item.id,
            cityId,
            attractionIds: item.attractionIds || (item.attractionId ? [item.attractionId] : []),
            name: item.name,
            en: item.en,
            img: item.img
          } : null;
        })
        .filter(Boolean);
      const tab = locale === 'en'
        ? (category.nameEn || labels[category.key] || category.name || category.key)
        : locale === 'zh-TW'
          ? (category.nameTw || labels[category.key] || category.name || category.key)
          : (category.name || labels[category.key] || category.nameTw || category.key);
      return { key: category.key, tab, tiles, chips: [] };
    })
    .filter(Boolean);
  // Unknown destination types (those without a matching category.key) remain hidden
  // rather than being misclassified into the first tab.
  return groups;
}

module.exports = {
  loadContent,
  getCities,
  getAttractionsByCity,
  getAttractionsByIds,
  getAttractions,
  getDestinationByCity,
  getAttraction,
  getAudioAlbums,
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
  invalidate,
  getLoadState: () => loadState
};

// 让缓存失效：后台修改内容后，下次 loadContent 会重新拉取而非使用内存缓存。
function invalidate() {
  cache = null;
  remoteLoaded = false;
  loadState = { source: 'local', status: 'initial', reason: '' };
}
