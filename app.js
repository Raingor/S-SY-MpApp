// SY希腊蔚蓝海岸 · 小程序全局逻辑
// 生产默认使用官网接口；本地联调时可替换为测试环境地址。
const API_BASE = 'https://sy-greece.com';

App({
  onLaunch() {
    this.globalData.auth.accessToken = wx.getStorageSync('sy_mp_access_token') || '';
    this.globalData.auth.user = wx.getStorageSync('sy_mp_user') || null;
  },
  globalData: {
    apiBase: API_BASE,
    auth: {
      accessToken: '',
      user: null
    },
    pendingLeadType: '',
    brand: 'SY希腊蔚蓝海岸',
    site: 'sy-greece.com',
    consultant: {
      name: 'Elena · 希腊行程顾问',
      wechat: 'SY-Greece-Service',
      slogan: '添加微信直接沟通 · 平均3分钟回复'
    }
  }
});
