// 出行指南：覆盖希腊旅行出发前最需要确认的实用信息
const app = getApp();
const { buildShareCard } = require('../../utils/share');

Page({
  data: {
    statusBarHeight: 20,
    guides: [
      {
        key: 'visa',
        mark: '签',
        title: '签证与入境准备',
        desc: '护照、签证材料、入境卡与海关准备，出发前一次确认。'
      },
      {
        key: 'airport',
        mark: '✈',
        title: '雅典机场交通',
        desc: '机场快线、地铁、出租车与接送机，按抵达时间选择更安心。'
      },
      {
        key: 'island',
        mark: '↔',
        title: '岛间船票与航班',
        desc: '船票预订、登船流程与航班衔接，减少海岛行程的等待和折返。'
      },
      {
        key: 'season',
        mark: '☀',
        title: '希腊最佳旅行季节',
        desc: '雅典、圣托里尼、克里特的季节节奏与穿衣建议，按月份规划。'
      },
      {
        key: 'daily',
        mark: '€',
        title: '换汇、网络、插座',
        desc: '欧元现金、电话卡、Wi-Fi、插座与日常支付，落地就能用。'
      },
      {
        key: 'etiquette',
        mark: '✓',
        title: '旅行避坑与当地礼仪',
        desc: '营业时间、小费、教堂礼仪与海岛租车提醒，少走弯路更从容。'
      }
    ]
  },

  onShareAppMessage() {
    return buildShareCard('/pages/travel-guide/travel-guide');
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onConsult() {
    app.globalData.pendingLeadType = 'customization';
    wx.switchTab({ url: '/pages/customize/customize' });
  }
});
