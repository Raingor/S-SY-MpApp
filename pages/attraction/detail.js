// 景点详情页（参考博物旅人：中英文名 / 必看亮点 / 参观指南 / 深度文史讲解）
const app = getApp();
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');

// guide 12 键 -> 中文标签（空键不展示）
const GUIDE_LABELS = {
  hours: '开放时间', tickets: '门票信息', transport: '交通信息', worth: '值得一去',
  services: '馆内服务', family: '亲子参观', map: '馆内地图', shop: '博物馆商店',
  accessibility: '无障碍服务', exhibitions: '临时展览', faq: '常见问题', notices: '临时通知'
};

Page({
  data: {
    statusBarHeight: 20,
    spot: null,
    showAllHighlights: false,
    guideTabs: [],
    guideIndex: 0
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const spotId = options.id || '';
    const spot = content.getAttraction(spotId);
    if (spot) this.applySpot(spot, sys.statusBarHeight || 20);
    content.loadContent((data) => {
      const fresh = content.getAttraction(spotId, data);
      if (fresh) this.applySpot(fresh);
      else {
        this.setData({ spot: null, guideTabs: [] });
        wx.showToast({ title: '未找到该景点', icon: 'none' });
        setTimeout(() => wx.navigateBack({ delta: 1 }), 800);
      }
    });
  },

  applySpot(spot, statusBarHeight) {
    const guideTabs = Object.keys(spot.guide || {})
      .filter((key) => spot.guide[key])
      .map((key) => ({ key, label: GUIDE_LABELS[key] || key, text: spot.guide[key] }));
    this.setData({
      statusBarHeight: statusBarHeight || this.data.statusBarHeight,
      spot,
      guideTabs,
      guideIndex: 0,
      showAllHighlights: false
    });
  },

  onShareAppMessage() {
    const spot = this.data.spot;
    return {
      title: (spot ? spot.name + ' · ' : '') + '只为一生美好回忆',
      path: '/pages/attraction/detail?id=' + (spot ? spot.id : ''),
      imageUrl: spot ? spot.image : undefined
    };
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onToggleHighlights() {
    this.setData({ showAllHighlights: !this.data.showAllHighlights });
  },

  onGuideTap(e) {
    this.setData({ guideIndex: Number(e.currentTarget.dataset.index) });
  },

  onPreviewAudio() {
    wx.showToast({ title: '1分钟试听片段待上传', icon: 'none' });
  },

  onUnlock() {
    wx.showModal({
      title: '付费解锁功能开发中',
      content: '当前仅开放文字预览，支付与会员权限尚未接入，请勿在此页面付款。',
      confirmText: '知道了',
      showCancel: false
    });
  },

  onConsult() {
    app.globalData.pendingLeadType = 'knowledge-base';
    wx.switchTab({ url: '/pages/customize/customize' });
  }
});
