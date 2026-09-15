// 修改个人资料：昵称、头像和手机号均支持用户主动更新
const auth = require('../../../utils/auth');
const { buildShareCard } = require('../../../utils/share');

Page({
  data: {
    statusBarHeight: 20,
    loading: true,
    saving: false,
    avatarUploading: false,
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
    const previousAvatar = this.data.avatar;
    this.setData({ avatarUploading: true, avatar: filePath });
    const upload = (path) => auth.uploadAvatar(path, (ok, user, message) => {
      this.setData({
        avatarUploading: false,
        ...(ok && user ? {
          avatar: user.avatar || user.avatarUrl || filePath,
          phoneMasked: user.phoneMasked || this.data.phoneMasked
        } : { avatar: previousAvatar })
      });
      wx.showToast({ title: ok ? '头像已更新' : (message || '头像上传失败'), icon: ok ? 'success' : 'none' });
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
      return wx.showToast({ title: '需要授权手机号后才能修改', icon: 'none' });
    }
    if (this.data.saving) return;
    this.setData({ saving: true });
    auth.bindPhone(code, (ok, user, message) => {
      this.setData({
        saving: false,
        ...(ok && user ? { phoneMasked: user.phoneMasked || '' } : {})
      });
      wx.showToast({ title: ok ? '手机号已更新' : (message || '手机号更新失败'), icon: ok ? 'success' : 'none' });
    });
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
