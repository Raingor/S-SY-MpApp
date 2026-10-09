// 城市介绍页（截图2：深色背景 + 拼贴 Mosaic + 统计 + 购买/查看双 CTA）
const app = getApp();
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');
const { goBack } = require('../../utils/navigation');
const i18n = require('../../utils/i18n');
const auth = require('../../utils/auth');
const paid = require('../../utils/paid-content');
const cityCommerce = require('../../utils/city-commerce');

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    city: null,
    stats: [],
    cityPriceDisplay: '',
    cityUnlocked: false,
    cityMember: false,
    cityPurchaseOptions: [],
    showCityPaywall: false,
    selectedCityProductTitle: '',
    purchaseLoading: false,
    simulationMode: false,
    pendingSimulationOrder: null
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    i18n.apply(this);
    this.cityId = String((options && options.id) || '').trim();
    const cities = content.getCities();
    const city = cities.find((item) => item.id === this.cityId) || null;
    if (city) this.applyCity(city, sys.statusBarHeight || 20);
    else this.setData({ city: null, stats: [] });
    this.refreshCityCommerce();
    this.reload();
  },

  // 后台补录后进入或返回本页都重新拉取，避免内存缓存导致新城市/新统计不显示。
  reload() {
    content.loadContent((data) => {
      const fresh = content.getCities(data);
      const updated = fresh.find((item) => item.id === this.cityId) || null;
      if (updated) this.applyCity(updated);
      else this.setData({ city: null, stats: [] });
      this.refreshCityCommerce();
    }, true);
  },

  onShow() {
    i18n.apply(this);
    if (this._hasShown) { this.reload(); this.refreshCityCommerce(); }
    this._hasShown = true;
  },

  applyCity(city, statusBarHeight) {
    const locale = this.data.locale || i18n.getLocale();
    const labels = locale === 'en' ? ['museums', 'guide points', 'audio minutes'] : (locale === 'zh-TW' ? ['座博物館', '個講解點', '分鐘語音'] : ['座博物館', '個講解點', '分鐘語音']);
    this.setData({
      statusBarHeight: statusBarHeight || this.data.statusBarHeight,
      city,
      stats: [
        { value: String(city.museumCount), label: labels[0] },
        { value: Number(city.guidePointCount).toLocaleString(), label: labels[1] },
        { value: Number(city.audioMinutes).toLocaleString(), label: labels[2] }
      ]
    });
  },

  refreshCityCommerce() {
    if (!this.cityId) return;
    const cityId = this.cityId;
    cityCommerce.loadCityState(cityId, (state) => {
      if (this.cityId !== cityId) return;
      this.setData({ cityPriceDisplay: state.priceDisplay, cityUnlocked: state.unlocked, cityMember: state.member, simulationMode: state.simulation, cityPurchaseOptions: cityCommerce.buildPurchaseOptions(state.products, this.data.city && this.data.city.name, this.data.i18n.contentPage) });
    });
  },

  onShareAppMessage() {
    const city = this.data.city;
    return {
      title: (city ? city.name + ' · ' : '') + this.data.i18n.commonSlogan,
      path: '/pages/city/index?id=' + (city ? city.id : ''),
      imageUrl: city ? city.cover : undefined
    };
  },

  onBack() {
    goBack();
  },

  onBackToDestinations() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  noop() {},

  // 了解导览讲解的不同之处
  onAboutGuide() {
    wx.showModal({
      title: '导览讲解的不同之处',
      content: '专业编写的图文与语音讲解，按景点逐层展开：先看亮点，再看参观指南，最后深入历史、神话与建筑。内容由常驻希腊的人文顾问编写，区别于机器翻译的景点介绍。',
      confirmText: '知道了',
      showCancel: false
    });
  },

  // 先展示城市包和年会员权益，再由用户选择购买方案。
  onBuy() {
    const city = this.data.city;
    if (!city) return;
    if (this.data.cityUnlocked) return wx.showToast({ title: this.data.i18n.contentPage.cityUnlocked, icon: 'none' });
    if (this.data.purchaseLoading) return;
    const fallbackOptions = cityCommerce.buildPurchaseOptions({}, city.name, this.data.i18n.contentPage);
    this.setData({ showCityPaywall: true, pendingSimulationOrder: null, cityPurchaseOptions: this.data.cityPurchaseOptions.length ? this.data.cityPurchaseOptions : fallbackOptions });
    cityCommerce.loadCityState(city.id, (state) => {
      const cityPurchaseOptions = cityCommerce.buildPurchaseOptions(state.products, city.name, this.data.i18n.contentPage);
      this.setData({ cityPurchaseOptions, simulationMode: state.simulation });
    });
  },

  onCityProductTap(e) {
    const productType = e.currentTarget.dataset.product;
    if (!this.data.cityPurchaseOptions.some((item) => item.product === productType && item.available) || this.data.purchaseLoading) {
      return wx.showToast({ title: this.data.i18n.paidContent.payUnavailable, icon: 'none' });
    }
    auth.ensurePhoneBound(() => {
      const city = this.data.city;
      if (!city) return;
      const selectedOption = this.data.cityPurchaseOptions.find((item) => item.product === productType);
      this.setData({ purchaseLoading: true, selectedCityProductTitle: selectedOption.title });
      paid.fetchConfig((ok, config) => {
        const product = config && config.products && config.products[productType];
        if (!ok || !product || product.enabled === false) {
          this.setData({ purchaseLoading: false });
          return wx.showToast({ title: this.data.i18n.paidContent.payUnavailable, icon: 'none' });
        }
        const target = productType === 'city' ? { cityId: city.id } : '';
        paid.createOrder(productType, target, (created, result) => {
          this.setData({ purchaseLoading: false, simulationMode: Boolean(config.simulation) });
          if (result && result.pendingSimulation && result.order) return this.setData({ pendingSimulationOrder: result.order });
          if (result && result.code === 'PAYMENT_CANCELLED') return;
          if (!created) return wx.showModal({ title: this.data.i18n.submitFailed, content: result && (result.error || result.message) || this.data.i18n.contentPage.cityPurchaseFailed, confirmText: this.data.i18n.know, showCancel: false });
          if (result && result.paymentStatus === 'pending') {
            this.setData({ showCityPaywall: false });
            this.refreshCityCommerce();
            return wx.showToast({ title: this.data.i18n.paidContent.paymentPending, icon: 'none' });
          }
          this.setData({ showCityPaywall: false, pendingSimulationOrder: null });
          this.refreshCityCommerce();
          wx.showToast({ title: productType === 'annualMembership' ? this.data.i18n.paidContent.memberUnlocked : this.data.i18n.paidContent.purchased, icon: 'success' });
        });
      });
    });
  },

  onCityPaywallClose() {
    if (!this.data.purchaseLoading) this.setData({ showCityPaywall: false, pendingSimulationOrder: null });
  },

  onSimulationPay(e) {
    const order = this.data.pendingSimulationOrder;
    const outcome = e.currentTarget.dataset.outcome;
    if (!order || !this.data.simulationMode || this.data.purchaseLoading) return;
    this.setData({ purchaseLoading: true });
    paid.simulateOrderResult(order.id, outcome, (ok, result) => {
      this.setData({ purchaseLoading: false });
      if (!ok) return wx.showToast({ title: this.data.i18n.submitFailed, icon: 'none' });
      this.setData({ pendingSimulationOrder: null });
      if (outcome === 'failed') return wx.showToast({ title: this.data.i18n.paidContent.simulationFailure, icon: 'none' });
      this.setData({ showCityPaywall: false });
      this.refreshCityCommerce();
      wx.showToast({ title: order.productType === 'annualMembership' ? this.data.i18n.paidContent.memberUnlocked : this.data.i18n.paidContent.purchased, icon: 'success' });
    });
  },

  // 查看：进入城市景点列表
  onView() {
    if (!this.data.city || !this.data.city.id) return;
    wx.navigateTo({ url: '/pages/city/spots?id=' + encodeURIComponent(this.data.city.id) });
  }
});
