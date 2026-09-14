// 本地镜像数据聚合（对齐后端 /api/content 结构）
// 数据源：mirror-attractions.js（cities + attractions）、mirror-itineraries.js（sampleItineraries + customTrips）
const attractionsData = require('./mirror-attractions');
const itinerariesData = require('./mirror-itineraries');

function getContent() {
  return {
    cities: attractionsData.cities,
    attractions: attractionsData.attractions,
    sampleItineraries: itinerariesData.getReferenceList()
  };
}

module.exports = { getContent };
