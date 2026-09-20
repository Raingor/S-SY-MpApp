// 景点详情页（参考博物旅人：中英文名 / 必看亮点 / 参观指南 / 深度文史讲解）
const app = getApp();
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');
const i18n = require('../../utils/i18n');
const paidContent = require('../../utils/paid-content');
const auth = require('../../utils/auth');

// guide 12 键 -> 默认中文标签（空键不展示）
const GUIDE_LABELS = {
  hours: '开放时间', tickets: '门票信息', transport: '交通信息', worth: '值得一去',
  services: '馆内服务', family: '亲子参观', map: '馆内地图', shop: '博物馆商店',
  accessibility: '无障碍服务', exhibitions: '临时展览', faq: '常见问题', notices: '临时通知'
};

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    spot: null,
    showAllHighlights: false,
    guideTabs: [],
    guideIndex: 0
    ,related: []
    ,paidConfig: { trialSeconds: 0, configured: false }
    ,entitlements: { member: false, purchases: [] }
    ,isVideoUnlocked: false
    ,trialEnded: false
    ,showPurchaseModal: false
    ,trialLabel: ''
    ,purchaseLoading: false
    ,simulationMode: false
    ,pendingSimulationOrder: null
    ,simulationLoading: false
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    i18n.apply(this);
    this.spotId = (options && options.id) || '';
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    const spot = content.getAttraction(this.spotId);
    if (spot) { this.applySpot(spot); if (spot.videoUrl) this.loadPaidState(); }
  },

  loadSpot() {
    if (!this.spotId) return;
    content.loadContent((data) => {
      const fresh = content.getAttraction(this.spotId, data);
      if (fresh) { this.applySpot(fresh); if (fresh.videoUrl) this.loadPaidState(); }
      else {
        this.setData({ spot: null, guideTabs: [] });
        wx.showToast({ title: '未找到该景点', icon: 'none' });
        setTimeout(() => wx.navigateBack({ delta: 1 }), 800);
      }
    }, true);
  },

  onShow() {
    i18n.apply(this);
    this.loadSpot();
  },

  applySpot(spot, statusBarHeight) {
    const labels = (this.data.i18n && this.data.i18n.contentPage && this.data.i18n.contentPage.guideLabels) || GUIDE_LABELS;
    const guideTabs = Object.keys(spot.guide || {})
      .filter((key) => spot.guide[key])
      .map((key) => ({ key, label: labels[key] || key, text: spot.guide[key] }));
    this.setData({
      statusBarHeight: statusBarHeight || this.data.statusBarHeight,
      spot,
      guideTabs,
      guideIndex: 0,
      showAllHighlights: false
      ,related: content.getAttractions().filter((item) => item.id !== spot.id && item.city === spot.city).slice(0, 3)
    });
  },

  loadPaidState() {
    paidContent.fetchConfig((ok, config) => this.setData({ paidConfig: config, simulationMode: Boolean(config.simulation), trialLabel: config.configured ? this.data.i18n.paidContent.trialConfigured.replace('{seconds}', config.trialSeconds) : this.data.i18n.paidContent.trialUnavailable }));
    paidContent.fetchEntitlements((ok, entitlements) => this.setData({ entitlements, isVideoUnlocked: paidContent.isUnlocked(entitlements, this.spotId) }));
  },

  onShareAppMessage() {
    const spot = this.data.spot;
    const id = this.spotId || (spot && spot.id);
    if (!id) return buildShareCard('/pages/index/index');
    return {
      title: (spot && spot.shareTitle) || (spot ? spot.name + ' · ' : '') + this.data.i18n.commonSlogan,
      path: '/pages/attraction/detail?id=' + encodeURIComponent(id),
      imageUrl: spot ? (spot.shareImage || spot.image) : undefined
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

  onVideoPlay() {
    if (this.data.isVideoUnlocked) return;
    if (!this.data.paidConfig.configured) {
      wx.createVideoContext('knowledge-video', this).pause();
      return wx.showToast({ title: this.data.i18n.paidContent.trialUnavailable, icon: 'none' });
    }
    if (this.data.trialEnded) wx.createVideoContext('knowledge-video', this).pause();
  },

  onVideoTimeUpdate(e) {
    if (this.data.isVideoUnlocked || this.data.trialEnded || !this.data.paidConfig.configured) return;
    if (Number(e.detail.currentTime || 0) >= this.data.paidConfig.trialSeconds) {
      wx.createVideoContext('knowledge-video', this).pause();
      this.setData({ trialEnded: true, showPurchaseModal: true });
    }
  },

  onVideoError() { wx.showToast({ title: this.data.i18n.networkError, icon: 'none' }); },

  onUnlock() {
    this.setData({ showPurchaseModal: true });
  },

  closePurchase() { this.setData({ showPurchaseModal: false }); },

  onPurchase(e) {
    if (this.data.purchaseLoading) return;
    const productType = e.currentTarget.dataset.product;
    const token = auth.getAccessToken();
    if (!token) return wx.switchTab({ url: '/pages/profile/profile' });
    this.setData({ purchaseLoading: true });
    paidContent.createOrder(productType, productType === 'attraction' ? this.spotId : '', (ok, data) => {
      this.setData({ purchaseLoading: false });
      if (data && data.pendingSimulation && data.order) {
        return this.setData({ pendingSimulationOrder: data.order });
      }
      if (!ok) return wx.showModal({ title: this.data.i18n.submitFailed, content: data.error || this.data.i18n.paidContent.payUnavailable, confirmText: this.data.i18n.know, showCancel: false });
      if (data && data.paymentStatus === 'pending') {
        this.setData({ showPurchaseModal: false, pendingSimulationOrder: null });
        this.loadPaidState();
        return wx.showToast({ title: this.data.i18n.paidContent.paymentPending, icon: 'none' });
      }
      this.setData({ showPurchaseModal: false, trialEnded: false, pendingSimulationOrder: null });
      this.loadPaidState();
      wx.showToast({ title: productType === 'membership' ? this.data.i18n.paidContent.memberUnlocked : this.data.i18n.paidContent.purchased, icon: 'success' });
    });
  },

  onSimulationPay(e) {
    const outcome = e.currentTarget.dataset.outcome;
    const order = this.data.pendingSimulationOrder;
    if (!order || this.data.simulationLoading) return;
    this.setData({ simulationLoading: true });
    paidContent.simulateOrderResult(order.id, outcome, (ok, data) => {
      this.setData({ simulationLoading: false });
      if (!ok) return wx.showModal({ title: this.data.i18n.submitFailed, content: (data && (data.error || data.message)) || this.data.i18n.paidContent.payUnavailable, confirmText: this.data.i18n.know, showCancel: false });
      if (outcome === 'failed') {
        this.setData({ pendingSimulationOrder: null });
        return wx.showToast({ title: this.data.i18n.paidContent.simulationFailed, icon: 'none' });
      }
      this.setData({ showPurchaseModal: false, trialEnded: false, pendingSimulationOrder: null });
      this.loadPaidState();
      wx.showToast({ title: order.productType === 'membership' ? this.data.i18n.paidContent.memberUnlocked : this.data.i18n.paidContent.purchased, icon: 'success' });
    });
  },

  onLiveBooking() { wx.navigateTo({ url: '/pages/live-booking/live-booking?attractionId=' + encodeURIComponent(this.spotId) }); },

  onRelatedTap(e) { const id = e.currentTarget.dataset.id; if (id) wx.redirectTo({ url: '/pages/attraction/detail?id=' + encodeURIComponent(id) }); },

  onConsult() {
    app.globalData.pendingLeadType = 'knowledge-base';
    wx.switchTab({ url: '/pages/customize/customize' });
  }
});
