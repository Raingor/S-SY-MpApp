// 城市介绍页（截图2：深色背景 + 拼贴 Mosaic + 统计 + 购买/查看双 CTA）
const app = getApp();
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');
const { goBack } = require('../../utils/navigation');
const i18n = require('../../utils/i18n');
const { formatCnyPrice } = require('../../utils/price');

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    city: null,
    stats: []
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    i18n.apply(this);
    this.cityId = String((options && options.id) || '').trim();
    const cities = content.getCities();
    const city = cities.find((item) => item.id === this.cityId) || null;
    if (city) this.applyCity(city, sys.statusBarHeight || 20);
    else this.setData({ city: null, stats: [] });
    content.loadContent((data) => {
      const fresh = content.getCities(data);
      const updated = fresh.find((item) => item.id === this.cityId) || null;
      if (updated) this.applyCity(updated);
      else this.setData({ city: null, stats: [] });
    });
  },

  onShow() {
    i18n.apply(this);
  },

  applyCity(city, statusBarHeight) {
    const locale = this.data.locale || i18n.getLocale();
    const labels = locale === 'en' ? ['museums', 'guide points', 'audio minutes'] : (locale === 'zh-TW' ? ['座博物館', '個講解點', '分鐘語音'] : ['座博物館', '個講解點', '分鐘語音']);
    this.setData({
      statusBarHeight: statusBarHeight || this.data.statusBarHeight,
      city: { ...city, priceDisplay: formatCnyPrice(city) },
      stats: [
        { value: String(city.museumCount), label: labels[0] },
        { value: Number(city.guidePointCount).toLocaleString(), label: labels[1] },
        { value: Number(city.audioMinutes).toLocaleString(), label: labels[2] }
      ]
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
    if (!city) return;
    const price = city.priceDisplay || this.data.i18n.contentPage.priceUnavailable;
    wx.showModal({
      title: city.name + ' · 导览讲解包',
      content: city.purchaseNote + '\n价格：' + price + '（含 ' + city.museumCount + ' 座博物馆、' + city.guidePointCount + ' 个讲解点、' + city.audioMinutes + ' 分钟语音）\n\n支付与会员权限接入中，当前可免费浏览景点亮点与参观指南。',
      confirmText: '知道了',
      showCancel: false
    });
  },

  // 查看：进入城市景点列表
  onView() {
    if (!this.data.city || !this.data.city.id) return;
    wx.navigateTo({ url: '/pages/city/spots?id=' + encodeURIComponent(this.data.city.id) });
  }
});
