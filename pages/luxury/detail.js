const i18n = require('../../utils/i18n');
const { buildShareCard } = require('../../utils/share');
const { getLuxuryDetail } = require('../../data/luxury');
const CONSULTANT_PHONE = '15071465661';

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
    wx.makePhoneCall({
      phoneNumber: CONSULTANT_PHONE,
      fail: () => wx.showToast({ title: '电话拨打失败，请稍后重试', icon: 'none' })
    });
  },

  onShareAppMessage() {
    return buildShareCard('/pages/luxury/detail?type=' + this.type);
  }
});
