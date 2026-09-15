// P3 我的页面：微信登录 / 手机号绑定 / 会员信息 / 服务单元格
const auth = require('../../utils/auth');
const { buildShareCard } = require('../../utils/share');
const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    loggedIn: false,
    phoneBound: false,
    authLoading: false,
    user: {
      nickname: '希腊旅人',
      avatar: '/assets/images/misc/consultant-avatar.png',
      member: ''
    },
    stats: [
      { label: '预约', value: 0 },
      { label: '行程', value: 0 },
      { label: '优惠券', value: 0 },
      { label: '资料', value: 0 }
    ],
    // 服务单元格卡
    services: [
      { key: 'orders', label: '我的预约', badge: '' },
      { key: 'trips', label: '我的行程', badge: '' },
      { key: 'coupons', label: '优惠券', badge: '' }
    ],
    // 资料与帮助卡
    helps: [
      { key: 'travelers', label: '常用出行人' },
      { key: 'visa', label: '护照签证资料' },
      { key: 'service', label: '联系客服' },
      { key: 'about', label: '关于我们 · 只为一生美好回忆' }
    ]
  },

  onShareAppMessage() {
    return buildShareCard('/pages/profile/profile');
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    // tab 切换进入时回到顶部（从子页返回不触发）
    if (app.globalData.pendingTabReset) {
      app.globalData.pendingTabReset = false;
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }
    auth.getUserState((loggedIn, user) => {
      if (!this || !this.setData) return;
      this.setData({
        loggedIn,
        phoneBound: Boolean(user && user.phoneBound),
        ...(loggedIn && user ? { user: { ...this.data.user, ...user } } : {})
      });
      if (loggedIn) this.refreshStats();
    });
  },

  refreshStats() {
    auth.fetchProfile((ok, profile) => {
      if (!ok) return;
      const user = profile.user || {};
      this.setData({
        user: {
          ...this.data.user,
          ...user,
          avatar: user.avatar || user.avatarUrl || this.data.user.avatar
        },
        stats: [
          { label: '预约', value: Number(profile.stats.appointments) || 0 },
          { label: '行程', value: Number(profile.stats.trips) || 0 },
          { label: '优惠券', value: Number(profile.stats.coupons) || 0 },
          { label: '资料', value: Number(profile.stats.profiles) || 0 }
        ]
      });
    });
  },

  onWechatLogin() {
    if (this.data.authLoading) return;
    this.setData({ authLoading: true });
    const completeLogin = (profile) => {
      auth.login((ok, user, message) => {
        this.setData({
          authLoading: false,
          loggedIn: ok,
          phoneBound: Boolean(user && user.phoneBound),
          ...(ok && user ? { user: { ...this.data.user, ...user } } : {})
        });
        if (!ok) wx.showToast({ title: message || '微信登录失败', icon: 'none' });
      }, profile);
    };
    // 昵称/头像需要用户主动授权；拒绝时仍允许登录，并使用“用户+随机数”作为昵称。
    if (wx.getUserProfile) {
      wx.getUserProfile({
        desc: '用于展示您的微信昵称和头像',
        success: (res) => completeLogin(res.userInfo),
        fail: () => completeLogin(null)
      });
    } else {
      completeLogin(null);
    }
  },

  onEditProfile() {
    if (!this.data.loggedIn) return this.onWechatLogin();
    wx.navigateTo({ url: '/pages/profile/edit/edit' });
  },

  onGetPhoneNumber(e) {
    const code = e.detail && e.detail.code;
    if (!code || !/^getPhoneNumber:ok/.test(e.detail.errMsg || '')) {
      return wx.showToast({ title: '需要授权手机号后才能提交', icon: 'none' });
    }
    this.setData({ authLoading: true });
    auth.bindPhone(code, (ok, user, message) => {
      this.setData({
        authLoading: false,
        loggedIn: ok || this.data.loggedIn,
        phoneBound: Boolean(user && user.phoneBound),
        ...(ok && user ? { user: { ...this.data.user, ...user } } : {})
      });
      wx.showToast({ title: ok ? '手机号绑定成功' : (message || '绑定失败'), icon: ok ? 'success' : 'none' });
    });
  },

  onServiceTap(e) {
    const key = e.currentTarget.dataset.key;
    if (!this.data.loggedIn) return this.onWechatLogin();
    const type = key === 'orders' ? 'orders' : key === 'trips' ? 'trips' : 'coupons';
    wx.navigateTo({ url: `/pages/profile/detail/detail?type=${type}` });
  },

  onHelpTap(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'travelers' || key === 'visa') {
      if (!this.data.loggedIn) return this.onWechatLogin();
      return wx.navigateTo({ url: `/pages/profile/detail/detail?type=${key}` });
    }
    if (key === 'service') return wx.switchTab({ url: '/pages/customize/customize' });
    if (key === 'about') {
      wx.showModal({
        title: '关于 SY 希旅人',
        content: '只为一生美好回忆\nsy-greece.com',
        confirmText: '复制官网',
        cancelText: '关闭',
        success: (res) => {
          if (!res.confirm) return;
          wx.setClipboardData({
            data: 'sy-greece.com',
            success: () => wx.showToast({ title: '官网已复制', icon: 'success' })
          });
        }
      });
    }
  }
});
