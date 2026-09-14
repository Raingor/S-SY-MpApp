// 参考行程列表页（页面直接展示的简单版行程）
const { getReferenceList } = require('../../data/itineraries');
const { buildShareCard } = require('../../utils/share');

Page({
  data: {
    statusBarHeight: 20,
    list: []
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      list: getReferenceList()
    });
  },

  onShareAppMessage() {
    return buildShareCard('/pages/itinerary/index');
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/itinerary/detail?id=' + id });
  },

  onConsult() {
    wx.switchTab({ url: '/pages/customize/customize' });
  }
});
