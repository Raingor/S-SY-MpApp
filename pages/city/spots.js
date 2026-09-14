// 城市景点列表页（截图1：深色卡片 + 规模标签 + 馆徽 + 中文名/希腊原名/简介）
const { cities, getAttractionsByCity } = require('../../data/attractions');
const { buildShareCard } = require('../../utils/share');

Page({
  data: {
    statusBarHeight: 20,
    city: null,
    spots: []
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const city = cities.find((item) => item.id === (options && options.id)) || cities[0];
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      city,
      spots: getAttractionsByCity(city.id).map((spot) => ({
        ...spot,
        // 馆徽兜底：无独立 logo 时用景点封面
        logoSrc: spot.logo || spot.image
      }))
    });
  },

  onShareAppMessage() {
    const city = this.data.city;
    return {
      title: (city ? city.name + ' · ' : '') + '只为一生美好回忆',
      path: '/pages/city/spots?id=' + (city ? city.id : ''),
      imageUrl: city ? city.cover : undefined
    };
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
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
