// 本地镜像数据聚合（对齐后端 /api/content 结构）
// 数据源：mirror-attractions.js（cities + attractions）、mirror-itineraries.js（sampleItineraries + customTrips）
const attractionsData = require('./mirror-attractions');
const itinerariesData = require('./mirror-itineraries');
const { asset } = require('../utils/asset-url');

// 镜像数据里的照片可能已迁到官网 CDN，统一在这里解析，页面不必感知来源。
function resolveImages(record) {
  const next = { ...record };
  if (typeof next.cover === 'string') next.cover = asset(next.cover);
  if (typeof next.image === 'string') next.image = asset(next.image);
  if (typeof next.img === 'string') next.img = asset(next.img);
  if (Array.isArray(next.mosaic)) next.mosaic = next.mosaic.map(asset);
  return next;
}

function getContent() {
  return {
    cities: attractionsData.cities.map(resolveImages),
    attractions: attractionsData.attractions.map(resolveImages),
    sampleItineraries: itinerariesData.getReferenceList().map(resolveImages)
  };
}

module.exports = { getContent };
