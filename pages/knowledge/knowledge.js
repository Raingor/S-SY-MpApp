// 服务4：景点区（城市选择层 → 城市介绍页 → 城市景点列表 → 景点详情）
// 数据：优先后端 /api/content，失败回退本地镜像（data/content.js）
const app = getApp();
const content = require('../../data/content');
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
      cities: content.getCities(),
      sampleTrips: content.getReferenceList()
    });
    // 异步拉取后端数据；仅网络离线时显示明确标记的本地镜像，契约错误不伪装为成功
    content.loadContent((data) => {
      this.setData({
        cities: content.getCities(data),
        sampleTrips: content.getReferenceList(data)
      });
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
