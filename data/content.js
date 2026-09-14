// 景点与行程内容服务：优先从后端 /api/content 拉取，失败时回退本地镜像数据
// 后端字段与本地镜像存在差异，本模块统一适配为页面所需结构
const local = require('./mirror-content');

let cache = null;          // { cities, attractions, sampleItineraries }
let fetching = null;       // 进行中的请求 Promise（去重）
let remoteLoaded = false;

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
    title: trip.title,
    img: mapImage(trip.cover),
    days: trip.days,
    highlights: trip.summary,
    crowd: '',
    schedule: (trip.itinerary || []).map((day) => ({
      day: day.day,
      city: day.city,
      entries: [{ period: '', text: (day.title ? day.title + '\n' : '') + (day.desc || ''), attractionIds: day.attractionIds || [] }]
    }))
  }));
}

function fetchContent() {
  if (fetching) return fetching;
  const app = getApp();
  const base = (app && app.globalData && app.globalData.apiBase) || 'https://sy-greece.com';
  fetching = new Promise((resolve) => {
    wx.request({
      url: base + '/api/content',
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.attractions)) {
          cache = {
            cities: adaptCities(res.data.cities),
            attractions: adaptAttractions(res.data.attractions),
            sampleItineraries: adaptSampleTrips(res.data.sampleItineraries)
          };
          remoteLoaded = true;
          resolve(cache);
        } else {
          resolve(local.getContent());
        }
      },
      fail: () => resolve(local.getContent())
    });
    // 请求结束后允许下次重试
    setTimeout(() => { fetching = null; }, 0);
  });
  return fetching;
}

// 页面统一入口：options.success 回调形式（与现有页面代码风格一致）
function loadContent(success) {
  if (remoteLoaded && cache) {
    success(cache);
    return;
  }
  fetchContent().then((data) => success(data));
}

function getContent() {
  return remoteLoaded && cache ? cache : local.getContent();
}

// ===== 同步查询（本地镜像兜底，接口数据到达后走内存缓存） =====
function getCities() {
  const data = getContent();
  return data.cities.map((city) => ({
    ...city,
    count: data.attractions.filter((item) => item.city === city.id).length
  }));
}

function getAttractionsByCity(cityId) {
  const data = getContent();
  if (!cityId || cityId === 'all') return data.attractions;
  return data.attractions.filter((item) => item.city === cityId);
}

function getAttraction(id) {
  return getContent().attractions.find((item) => item.id === id) || null;
}

function getAttractionNames(ids) {
  if (!Array.isArray(ids)) return [];
  const data = getContent();
  return ids.map((id) => {
    const item = data.attractions.find((a) => a.id === id);
    return item ? { id, name: item.name } : null;
  }).filter(Boolean);
}

function getReferenceList() {
  return getContent().sampleItineraries;
}

module.exports = {
  loadContent,
  getCities,
  getAttractionsByCity,
  getAttraction,
  getAttractionNames,
  getReferenceList,
  fetchContent
};
