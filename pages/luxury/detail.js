const app = getApp();
const i18n = require('../../utils/i18n');
const { buildShareCard } = require('../../utils/share');
const { getLuxuryDetail } = require('../../data/luxury');

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    detail: null
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.type = options && options.type === 'yacht' ? 'yacht' : 'jet';
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    this.applyLocale();
  },

  onShow() {
    this.applyLocale();
  },

  applyLocale() {
    i18n.apply(this);
    this.setData({ detail: getLuxuryDetail(this.type, i18n.getLocale()) });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onConsult() {
    app.globalData.pendingLeadType = 'customization';
    wx.switchTab({ url: '/pages/customize/customize' });
  },

  onShareAppMessage() {
    return buildShareCard('/pages/luxury/detail?type=' + this.type);
  }
});
