// 修改个人资料：昵称由用户主动编辑，手机号只读展示
const auth = require('../../../utils/auth');
const { buildShareCard } = require('../../../utils/share');

Page({
  data: {
    statusBarHeight: 20,
    loading: true,
    saving: false,
    loggedIn: false,
    nickname: '',
    avatar: '/assets/images/misc/consultant-avatar.png',
    phoneMasked: ''
  },

  onShareAppMessage() {
    return buildShareCard('/pages/profile/edit/edit');
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    auth.getUserState((loggedIn, user) => {
      if (!loggedIn || !user) {
        this.setData({ loading: false });
        wx.showToast({ title: '请先微信登录', icon: 'none' });
        return wx.switchTab({ url: '/pages/profile/profile' });
      }
      this.setData({
        loading: false,
        loggedIn: true,
        nickname: user.nickname || '',
        avatar: user.avatar || user.avatarUrl || '/assets/images/misc/consultant-avatar.png',
        phoneMasked: user.phoneMasked || ''
      });
    });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onSave() {
    const nickname = String(this.data.nickname || '').trim();
    if (!nickname) return wx.showToast({ title: '请输入昵称', icon: 'none' });
    if (nickname === '微信用户') return wx.showToast({ title: '请使用其他昵称', icon: 'none' });
    if (this.data.saving) return;
    this.setData({ saving: true });
    auth.updateProfile({ nickname }, (ok, user, message) => {
      this.setData({ saving: false });
      if (!ok) return wx.showToast({ title: message || '保存失败', icon: 'none' });
      this.setData({ nickname: user.nickname || nickname });
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 450);
    });
  }
});
