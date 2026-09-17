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
  },
  onShow() {
    // 小程序回到前台时让内容缓存失效，后台改动（导游/目的地/路线等）下次进入页面即同步。
    try {
      const content = require('./data/content');
      if (content && typeof content.invalidate === 'function') content.invalidate();
    } catch (e) { /* 内容模块尚未加载则忽略 */ }
  },
  globalData: {
    apiBase: API_BASE,
    auth: {
      accessToken: '',
      user: null
    },
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
