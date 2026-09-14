// 城市介绍页（截图2：深色背景 + 拼贴 Mosaic + 统计 + 购买/查看双 CTA）
const app = getApp();
const { cities } = require('../../data/attractions');
const { buildShareCard } = require('../../utils/share');

Page({
  data: {
    statusBarHeight: 20,
    city: null,
    stats: []
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const city = cities.find((item) => item.id === (options && options.id)) || cities[0];
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      city,
      stats: [
        { value: city.museumCount, label: '座博物馆' },
        { value: city.guidePointCount.toLocaleString(), label: '个讲解点' },
        { value: city.audioMinutes.toLocaleString(), label: '分钟语音' }
      ]
    });
  },

  onShareAppMessage() {
    const city = this.data.city;
    return {
      title: (city ? city.name + ' · ' : '') + '只为一生美好回忆',
      path: '/pages/city/index?id=' + (city ? city.id : ''),
      imageUrl: city ? city.cover : undefined
    };
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  // 了解导览讲解的不同之处
  onAboutGuide() {
    wx.showModal({
      title: '导览讲解的不同之处',
      content: '专业编写的图文与语音讲解，按景点逐层展开：先看亮点，再看参观指南，最后深入历史、神话与建筑。内容由常驻希腊的人文顾问编写，区别于机器翻译的景点介绍。',
      confirmText: '知道了',
      showCancel: false
    });
  },

  // 购买：城市导览讲解包（支付接入前为说明弹窗）
  onBuy() {
    const city = this.data.city;
    wx.showModal({
      title: city.name + ' · 导览讲解包',
      content: city.purchaseNote + '\n价格：' + city.price + '（含 ' + city.museumCount + ' 座博物馆、' + city.guidePointCount + ' 个讲解点、' + city.audioMinutes + ' 分钟语音）\n\n支付与会员权限接入中，当前可免费浏览景点亮点与参观指南。',
      confirmText: '知道了',
      showCancel: false
    });
  },

  // 查看：进入城市景点列表
  onView() {
    wx.navigateTo({ url: '/pages/city/spots?id=' + this.data.city.id });
  }
});
