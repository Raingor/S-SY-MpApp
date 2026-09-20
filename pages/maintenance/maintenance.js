const app = getApp();

Page({
  data: {
    title: '正在升级中',
    message: '小程序正在升级中，请稍后再试。'
  },

  onLoad() {
    const access = app.globalData.miniprogramAccess || {};
    this.setData({
      title: access.title || '正在升级中',
      message: access.message || '小程序正在升级中，请稍后再试。'
    });
  }
});
