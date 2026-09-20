// 希腊旅行管家 · 小程序全局逻辑
// 生产默认使用官网接口；本地联调时可替换为测试环境地址。
const API_BASE = 'https://sy-greece.com';
const i18n = require('./utils/i18n');

App({
  onLaunch() {
    this.globalData.locale = i18n.getLocale();
    this.globalData.countryId = wx.getStorageSync('sy_mp_country_id') || 'greece';
    this.globalData.auth.accessToken = wx.getStorageSync('sy_mp_access_token') || '';
    this.globalData.auth.user = wx.getStorageSync('sy_mp_user') || null;
    this.checkMiniprogramAccess();
    this._accessTimer = setInterval(() => this.checkMiniprogramAccess(), 30 * 1000);
  },
  onShow() {
    // 小程序回到前台时让内容缓存失效，后台改动（导游/目的地/路线等）下次进入页面即同步。
    try {
      const content = require('./data/content');
      if (content && typeof content.invalidate === 'function') content.invalidate();
    } catch (e) { /* 内容模块尚未加载则忽略 */ }
    this.checkMiniprogramAccess();
  },
  checkMiniprogramAccess() {
    if (this._accessRequest) return this._accessRequest;
    const base = (this.globalData && this.globalData.apiBase) || API_BASE;
    this._accessRequest = new Promise((resolve) => {
      wx.request({
        url: base.replace(/\/$/, '') + '/api/miniprogram/access',
        method: 'GET',
        timeout: 5000,
        success: (res) => {
          const payload = res && res.data ? res.data : {};
          // 访问控制接口暂时不可用时保持当前页面，避免一次网络抖动把用户误判为升级状态。
          if (res.statusCode !== 200 || typeof payload.accessEnabled !== 'boolean') return resolve(true);
          this.globalData.miniprogramAccess = payload;
          if (!payload.accessEnabled) {
            this.enterMaintenance(payload);
            return resolve(false);
          }
          const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
          if (pages.length && pages[pages.length - 1].route === 'pages/maintenance/maintenance') {
            wx.reLaunch({ url: '/pages/index/index' });
          }
          resolve(true);
        },
        fail: () => resolve(true),
        complete: () => { this._accessRequest = null; }
      });
    });
    return this._accessRequest;
  },
  enterMaintenance(payload = {}) {
    this.globalData.miniprogramAccess = {
      accessEnabled: false,
      title: payload.title || '正在升级中',
      message: payload.message || '小程序正在升级中，请稍后再试。'
    };
    if (this.globalData.maintenanceRedirecting) return;
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    if (pages.length && pages[pages.length - 1].route === 'pages/maintenance/maintenance') return;
    this.globalData.maintenanceRedirecting = true;
    wx.reLaunch({
      url: '/pages/maintenance/maintenance',
      complete: () => { this.globalData.maintenanceRedirecting = false; }
    });
  },
  globalData: {
    apiBase: API_BASE,
    auth: {
      accessToken: '',
      user: null
    },
    miniprogramAccess: {
      accessEnabled: true,
      title: '',
      message: ''
    },
    contentSettings: {},
    maintenanceRedirecting: false,
    pendingLeadType: '',
    locale: 'zh-CN',
    countryId: 'greece',
    brand: '希腊旅行管家',
    brandEn: 'Greece Travel Butler',
    site: 'sy-greece.com',
    consultant: {
      name: 'Elena · 希腊行程顾问',
      wechat: 'SY-Greece-Service',
      slogan: '只为一生美好回忆'
    }
  }
});
