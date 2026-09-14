// 服务4：景点区（城市选择层 → 城市介绍页 → 城市景点列表 → 景点详情）
const app = getApp();
const { getCities } = require('../../data/attractions');
const { getReferenceList } = require('../../data/itineraries');
const { buildShareCard } = require('../../utils/share');

Page({
  data: {
    statusBarHeight: 20,
    cities: [],
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
      sampleTrips: getReferenceList()
    });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  // 城市卡 → 城市介绍页
  onCityTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/city/index?id=' + id });
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
