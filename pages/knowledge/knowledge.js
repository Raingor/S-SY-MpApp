// 服务4：景点区（参考博物旅人：精选城市 → 景点列表，点击进入景点详情）
const app = getApp();
const { getCities, getAttractionsByCity } = require('../../data/attractions');
const { getReferenceList } = require('../../data/itineraries');
const { buildShareCard } = require('../../utils/share');

Page({
  data: {
    statusBarHeight: 20,
    cities: [],
    activeCity: 'all',
    spots: [],
    sampleTrips: []
  },

  onShareAppMessage() {
    return buildShareCard('/pages/knowledge/knowledge');
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      cities: getCities(),
      activeCity: 'all',
      spots: getAttractionsByCity('all'),
      sampleTrips: getReferenceList()
    });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onCityTap(e) {
    const id = e.currentTarget.dataset.id || 'all';
    this.setData({ activeCity: id, spots: getAttractionsByCity(id) });
  },

  onSpotTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/attraction/detail?id=' + id });
  },

  onTripTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/itinerary/detail?id=' + id });
  },

  onMoreTrips() {
    wx.navigateTo({ url: '/pages/itinerary/index' });
  },

  onConsult() {
    app.globalData.pendingLeadType = 'knowledge-base';
    wx.switchTab({ url: '/pages/customize/customize' });
  }
});
