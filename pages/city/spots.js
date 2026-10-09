// 城市景点列表页（截图1：深色卡片 + 规模标签 + 馆徽 + 中文名/希腊原名/简介）
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
    menuRightSpace: 112,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    city: null,
    spots: [],
    cityPriceDisplay: '',
    cityUnlocked: false,
    cityMember: false,
    purchaseLoading: false,
    simulationMode: false,
    pendingSimulationOrder: null
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    const windowWidth = sys.windowWidth || (wx.getSystemInfoSync && wx.getSystemInfoSync().windowWidth) || 375;
    const menuRightSpace = menu ? Math.max(88, windowWidth - menu.left + 12) : 112;
    i18n.apply(this);
    this.setData({ statusBarHeight: sys.statusBarHeight || 20, menuRightSpace });
    this.cityId = String((options && options.id) || '').trim();
    const cities = content.getCities();
    const city = cities.find((item) => item.id === this.cityId) || null;
    if (city) this.applyCity(city, sys.statusBarHeight || 20);
    else this.setData({ city: null, spots: [] });
    this.refreshCityCommerce();
    this.reload();
  },

  // 后台补录景点/讲解点后进入或返回本页都重新拉取，避免内存缓存导致新景点不显示。
  reload() {
    content.loadContent((data) => {
      const fresh = content.getCities(data);
      const updated = fresh.find((item) => item.id === this.cityId) || null;
      if (updated) this.applyCity(updated, undefined, data);
      else this.setData({ city: null, spots: [] });
      this.refreshCityCommerce();
    }, true);
  },

  onShow() {
    i18n.apply(this);
    if (this._hasShown) { this.reload(); this.refreshCityCommerce(); }
    this._hasShown = true;
  },

  applyCity(city, statusBarHeight, source) {
    if (!city || !city.id) {
      this.setData({ city: null, spots: [] });
      return;
    }
    this.contentSource = source || this.contentSource;
    const destination = content.getDestinationByCity(city.id, this.contentSource);
    const attractionIds = destination && Array.isArray(destination.attractionIds)
      ? destination.attractionIds
      : null;
    const featuredSpots = attractionIds && attractionIds.length
      ? content.getAttractionsByIds(attractionIds, this.contentSource)
      : [];
    const spots = featuredSpots.length
      ? featuredSpots
      : content.getAttractionsByCity(city.id, this.contentSource);
    this.setData({
      statusBarHeight: statusBarHeight || this.data.statusBarHeight,
      city,
      spots: spots.map((spot) => ({
        ...spot,
        // 馆徽兜底：无独立 logo 时用景点封面
        logoSrc: spot.logo || spot.image
      }))
    });
  },

  refreshCityCommerce() {
    if (!this.cityId) return;
    const cityId = this.cityId;
    cityCommerce.loadCityState(cityId, (state) => {
      if (this.cityId !== cityId) return;
      this.setData({ cityPriceDisplay: state.priceDisplay, cityUnlocked: state.unlocked, cityMember: state.member, simulationMode: state.simulation });
    });
  },

  onShareAppMessage() {
    const city = this.data.city;
    return {
      title: (city ? city.name + ' · ' : '') + this.data.i18n.commonSlogan,
      path: '/pages/city/spots?id=' + (city ? city.id : ''),
      imageUrl: city ? city.cover : undefined
    };
  },

  onBack() {
    goBack();
  },

  onBackToDestinations() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 城市导览包由服务端按 cityId 计价。
  onBuy() {
    const city = this.data.city;
    if (!city) return;
    if (this.data.cityUnlocked) return wx.showToast({ title: this.data.i18n.contentPage.cityUnlocked, icon: 'none' });
    if (this.data.purchaseLoading) return;
    auth.ensurePhoneBound(() => {
      this.setData({ purchaseLoading: true });
      paid.fetchConfig((ok, config) => {
        const product = config && config.products && config.products.city;
        if (!ok || !product || product.enabled === false) {
          this.setData({ purchaseLoading: false });
          return wx.showToast({ title: this.data.i18n.paidContent.payUnavailable, icon: 'none' });
        }
        paid.createOrder('city', { cityId: city.id }, (created, result) => {
          this.setData({ purchaseLoading: false, simulationMode: Boolean(config.simulation) });
          if (result && result.pendingSimulation && result.order) return this.setData({ pendingSimulationOrder: result.order });
          if (!created) return wx.showModal({ title: this.data.i18n.submitFailed, content: result && (result.error || result.message) || this.data.i18n.contentPage.cityPurchaseFailed, confirmText: this.data.i18n.know, showCancel: false });
          if (result && result.paymentStatus === 'pending') {
            this.refreshCityCommerce();
            return wx.showToast({ title: this.data.i18n.paidContent.paymentPending, icon: 'none' });
          }
          this.setData({ pendingSimulationOrder: null });
          this.refreshCityCommerce();
          wx.showToast({ title: this.data.i18n.paidContent.purchased, icon: 'success' });
        });
      });
    });
  },

  onSimulationPay(e) {
    const order = this.data.pendingSimulationOrder;
    const outcome = e.currentTarget.dataset.outcome;
    if (!order || !this.data.simulationMode || this.data.purchaseLoading) return;
    this.setData({ purchaseLoading: true });
    paid.simulateOrderResult(order.id, outcome, (ok) => {
      this.setData({ purchaseLoading: false });
      if (!ok) return wx.showToast({ title: this.data.i18n.submitFailed, icon: 'none' });
      this.setData({ pendingSimulationOrder: null });
      if (outcome === 'failed') return wx.showToast({ title: this.data.i18n.paidContent.simulationFailure, icon: 'none' });
      this.refreshCityCommerce();
      wx.showToast({ title: this.data.i18n.paidContent.purchased, icon: 'success' });
    });
  },

  noop() {},

  onSpotTap(e) {
    const id = String(e.currentTarget.dataset.id || '').trim();
    const spot = id ? content.getAttraction(id, this.contentSource) : null;
    if (!spot || !this.data.city || !this.data.spots.some((item) => item.id === id)) {
      wx.showToast({ title: this.data.locale === 'en' ? 'This sight is unavailable' : '该景点暂不可用', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/attraction/detail?id=' + encodeURIComponent(spot.id) });
  }
});
