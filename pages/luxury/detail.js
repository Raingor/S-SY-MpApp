const i18n = require('../../utils/i18n');
const { buildShareCard } = require('../../utils/share');
const { goBack } = require('../../utils/navigation');
const { getLuxuryDetail } = require('../../data/luxury');
const CONSULTANT_PHONE = '15071465661';

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    detail: null,
    consultant: {
      avatar: '/assets/images/misc/jenny-avatar.jpg',
      name: 'Jenny',
      title: '希腊行程规划师',
      wechat: 'SYGJ1130',
      slogan: '只为一生美好回忆',
      phone: '15071465661',
      qr: '/assets/images/misc/jenny-wechat-qr.png'
    }
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
    const copy = i18n.apply(this);
    const locale = i18n.getLocale();
    this.setData({
      detail: getLuxuryDetail(this.type, locale),
      consultant: {
        ...this.data.consultant,
        title: locale === 'en' ? 'Greece Trip Planner' : (locale === 'zh-TW' ? '希臘行程規劃師' : '希腊行程规划师'),
        slogan: copy.commonSlogan
      }
    });
  },

  onBack() {
    goBack();
  },

  onConsult() {
    wx.makePhoneCall({
      phoneNumber: this.data.consultant.phone || CONSULTANT_PHONE,
      fail: () => wx.showToast({ title: '电话拨打失败，请稍后重试', icon: 'none' })
    });
  },

  onCopyWechat() {
    wx.setClipboardData({
      data: this.data.consultant.wechat,
      success: () => wx.showToast({ title: this.data.i18n.copySuccess, icon: 'success' })
    });
  },

  onPreviewQr() {
    wx.previewImage({ urls: [this.data.consultant.qr] });
  },

  onCallPhone() {
    wx.makePhoneCall({ phoneNumber: this.data.consultant.phone || CONSULTANT_PHONE });
  },

  onShareAppMessage() {
    return buildShareCard('/pages/luxury/detail?type=' + this.type);
  }
});
