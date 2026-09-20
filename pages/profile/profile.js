// P3 我的页面：微信登录 / 手机号绑定 / 会员信息 / 服务单元格
const auth = require('../../utils/auth');
const { buildShareCard } = require('../../utils/share');
const i18n = require('../../utils/i18n');
const app = getApp();
const paidContent = require('../../utils/paid-content');
const content = require('../../data/content');

Page({
  data: {
    statusBarHeight: 20,
    loggedIn: false,
    phoneBound: false,
    authLoading: false,
    membershipConfigured: false,
    simulationEnabled: false,
    simulationPhone: '13800138000',
    simulationLoading: false,
    memberStatus: '',
    purchasedCount: 0,
    favoriteCount: 0,
    liveBookingCount: 0,
    historyCount: 0,
    purchasedCourses: [],
    knowledgeOrders: [],
    avatarUploading: false,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    languageOptions: i18n.languageOptions(),
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
    this.refreshLocale();
  },

  refreshLocale() {
    const copy = i18n.apply(this);
    const stats = this.data.stats || [];
    this.setData({
      languageOptions: i18n.languageOptions(),
      stats: [
        { label: copy.profile.appointments, value: Number(stats[0] && stats[0].value) || 0 },
        { label: copy.profile.trips, value: Number(stats[1] && stats[1].value) || 0 },
        { label: copy.profile.coupons, value: Number(stats[2] && stats[2].value) || 0 },
        { label: copy.profile.records, value: Number(stats[3] && stats[3].value) || 0 }
      ],
      services: [
        { key: 'orders', label: copy.profile.appointments, badge: '' },
        { key: 'trips', label: copy.profile.trips, badge: '' },
        { key: 'coupons', label: copy.profile.coupons, badge: '' }
      ],
      helps: [
        { key: 'travelers', label: copy.profile.travelers },
        { key: 'visa', label: copy.profile.visa },
        { key: 'service', label: copy.profile.service },
        { key: 'about', label: copy.profile.about }
      ]
    });
    return copy;
  },

  onShow() {
    this.refreshLocale();
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
      this.loadKnowledgeState();
      if (loggedIn) this.refreshStats();
    });
    paidContent.fetchConfig((ok, config) => this.setData({ simulationEnabled: Boolean(config.simulation), membershipConfigured: ok || config.configured }));
  },

  loadKnowledgeState() {
    paidContent.fetchConfig((ok, config) => this.setData({ membershipConfigured: ok || config.configured }));
    paidContent.fetchEntitlements((ok, entitlements) => {
      const copy = this.data.i18n.paidContent;
      this.setData({
        memberStatus: entitlements.member ? copy.memberUnlocked : '',
        purchasedCount: (entitlements.purchases || []).length,
        favoriteCount: (entitlements.favorites || []).length,
        historyCount: (entitlements.history || []).length
      });
      const purchases = entitlements.purchases || [];
      const purchasedCourses = purchases.map((item) => {
        const attraction = item.attractionId ? content.getAttraction(item.attractionId) : null;
        return {
          id: item.orderId || item.attractionId || item.productType,
          title: item.productType === 'membership' ? copy.member : (attraction && attraction.name) || item.attractionId || copy.video,
          status: item.status || 'paid',
          purchasedAt: item.purchasedAt || ''
        };
      });
      this.setData({ purchasedCourses, knowledgeOrders: (entitlements.orders || []).slice().reverse().slice(0, 8) });
    });
    auth.fetchMyLeads({ leadType: 'live-booking' }, (ok, items) => this.setData({ liveBookingCount: ok ? items.length : 0 }));
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
        if (!ok) wx.showToast({ title: message || this.data.i18n.profile.loginFailed, icon: 'none' });
      }, profile);
    };
    // 昵称/头像需要用户主动授权；拒绝时仍允许登录，并使用“用户+随机数”作为昵称。
    if (wx.getUserProfile) {
      wx.getUserProfile({
        desc: this.data.i18n.profile.profileIntro,
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

  onKnowledgeTap() {
    if (!this.data.membershipConfigured) return wx.showToast({ title: this.data.i18n.paidContent.payUnavailable, icon: 'none' });
    wx.showModal({ title: this.data.i18n.paidContent.member, content: this.data.i18n.paidContent.memberDesc, confirmText: this.data.i18n.paidContent.member, cancelText: this.data.i18n.know });
  },

  onSimulationPhoneInput(e) { this.setData({ simulationPhone: e.detail.value }); },

  onSimulationLogin() {
    if (this.data.simulationLoading) return;
    this.setData({ simulationLoading: true });
    paidContent.startSimulationSession(this.data.simulationPhone, (ok, user, data) => {
      this.setData({ simulationLoading: false });
      if (!ok) return wx.showToast({ title: (data && (data.error || data.message)) || this.data.i18n.paidContent.simulationLoginFailed, icon: 'none' });
      this.setData({ loggedIn: true, phoneBound: true, user: { ...this.data.user, ...user } });
      this.refreshStats();
      this.loadKnowledgeState();
      wx.showToast({ title: this.data.i18n.paidContent.simulationLoginSuccess, icon: 'success' });
    });
  },

  onLanguageTap(e) {
    const locale = e.currentTarget.dataset.locale;
    if (!locale || locale === i18n.getLocale()) return;
    i18n.setLocale(locale);
    wx.reLaunch({ url: '/pages/profile/profile' });
  },

  onAvatarTap() {
    if (this.data.avatarUploading) return;
    const choose = (filePath) => this.uploadAvatarFile(filePath);
    if (wx.chooseMedia) {
      return wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => choose(res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath)
      });
    }
    wx.chooseImage({ count: 1, sourceType: ['album', 'camera'], success: (res) => choose(res.tempFilePaths && res.tempFilePaths[0]) });
  },

  uploadAvatarFile(filePath) {
    if (!filePath || this.data.avatarUploading) return;
    const previousAvatar = this.data.user.avatar;
    this.setData({ avatarUploading: true, 'user.avatar': filePath });
    const upload = (path) => auth.uploadAvatar(path, (ok, user, message) => {
      this.setData({
        avatarUploading: false,
        ...(ok && user ? { user: { ...this.data.user, ...user } } : { 'user.avatar': previousAvatar })
      });
      wx.showToast({ title: ok ? this.data.i18n.profile.avatarUpdated : (message || this.data.i18n.profile.avatarUploadFailed), icon: ok ? 'success' : 'none' });
    });
    if (wx.compressImage) {
      wx.compressImage({
        src: filePath,
        quality: 85,
        success: (res) => upload(res.tempFilePath || filePath),
        fail: () => upload(filePath)
      });
    } else {
      upload(filePath);
    }
  },

  onGetPhoneNumber(e) {
    const code = e.detail && e.detail.code;
    if (!code || !/^getPhoneNumber:ok/.test(e.detail.errMsg || '')) {
      return wx.showToast({ title: this.data.i18n.validation.phoneAuthRequired, icon: 'none' });
    }
    this.setData({ authLoading: true });
    auth.bindPhone(code, (ok, user, message) => {
      this.setData({
        authLoading: false,
        loggedIn: ok || this.data.loggedIn,
        phoneBound: Boolean(user && user.phoneBound),
        ...(ok && user ? { user: { ...this.data.user, ...user } } : {})
      });
      wx.showToast({ title: ok ? this.data.i18n.profile.phoneUpdated : (message || this.data.i18n.profile.phoneBindFailed), icon: ok ? 'success' : 'none' });
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
    if (key === 'language') return;
    if (key === 'travelers' || key === 'visa') {
      if (!this.data.loggedIn) return this.onWechatLogin();
      return wx.navigateTo({ url: `/pages/profile/detail/detail?type=${key}` });
    }
    if (key === 'service') return wx.switchTab({ url: '/pages/customize/customize' });
    if (key === 'about') {
      wx.showModal({
        title: this.data.i18n.profile.aboutTitle,
        content: this.data.i18n.commonSlogan + '\nsy-greece.com',
        confirmText: this.data.i18n.profile.copyWebsite,
        cancelText: this.data.i18n.profile.close,
        success: (res) => {
          if (!res.confirm) return;
          wx.setClipboardData({
            data: 'sy-greece.com',
            success: () => wx.showToast({ title: this.data.i18n.profile.websiteCopied, icon: 'success' })
          });
        }
      });
    }
  }
});
