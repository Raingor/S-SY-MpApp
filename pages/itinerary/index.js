// 参考行程列表页（页面直接展示的简单版行程）
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');
const { goBack } = require('../../utils/navigation');
const i18n = require('../../utils/i18n');

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    list: []
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      list: content.getReferenceList()
    });
    i18n.apply(this);
    this.reload();
  },

  // 后台补录参考行程后进入或返回本页都重新拉取，避免内存缓存导致新行程不显示。
  reload() {
    content.loadContent((data) => {
      this.setData({ list: content.getReferenceList(data) });
    }, true);
  },

  onShow() {
    i18n.apply(this);
    if (this._hasShown) this.reload();
    this._hasShown = true;
  },

  onShareAppMessage() {
    return buildShareCard('/pages/itinerary/index');
  },

  onBack() {
    goBack();
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/itinerary/detail?id=' + id });
  },

  onConsult() {
    wx.switchTab({ url: '/pages/customize/customize' });
  }
});
