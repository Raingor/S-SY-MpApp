// 城市景点列表页（截图1：深色卡片 + 规模标签 + 馆徽 + 中文名/希腊原名/简介）
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');
const { goBack } = require('../../utils/navigation');
const i18n = require('../../utils/i18n');

Page({
  data: {
    statusBarHeight: 20,
    menuRightSpace: 112,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    city: null,
    spots: []
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    const windowWidth = sys.windowWidth || (wx.getSystemInfoSync && wx.getSystemInfoSync().windowWidth) || 375;
    const menuRightSpace = menu ? Math.max(88, windowWidth - menu.left + 12) : 112;
    i18n.apply(this);
    this.setData({ statusBarHeight: sys.statusBarHeight || 20, menuRightSpace });
    const cities = content.getCities();
    const city = cities.find((item) => item.id === (options && options.id)) || cities[0];
    this.applyCity(city, sys.statusBarHeight || 20);
    content.loadContent((data) => {
      const fresh = content.getCities(data);
      const updated = fresh.find((item) => item.id === (this.data.city && this.data.city.id)) || fresh[0];
      if (updated) this.applyCity(updated, undefined, data);
      else this.setData({ city: null, spots: [] });
    });
  },

  onShow() {
    i18n.apply(this);
  },

  applyCity(city, statusBarHeight, source) {
    this.setData({
      statusBarHeight: statusBarHeight || this.data.statusBarHeight,
      city,
      spots: content.getAttractionsByCity(city.id, source).map((spot) => ({
        ...spot,
        // 馆徽兜底：无独立 logo 时用景点封面
        logoSrc: spot.logo || spot.image
      }))
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

  // 右上购买：与城市介绍页一致
  onBuy() {
    const city = this.data.city;
    wx.showModal({
      title: city.name + ' · 导览讲解包',
      content: city.purchaseNote + '\n价格：' + city.price + '（含 ' + city.museumCount + ' 座博物馆、' + city.guidePointCount + ' 个讲解点、' + city.audioMinutes + ' 分钟语音）\n\n支付与会员权限接入中，当前可免费浏览景点亮点与参观指南。',
      confirmText: '知道了',
      showCancel: false
    });
  },

  onSpotTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/attraction/detail?id=' + id });
  }
});
