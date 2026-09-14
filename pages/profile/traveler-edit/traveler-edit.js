// 出行人编辑页：添加 / 修改常用出行人资料
const auth = require('../../../utils/auth');
const { buildShareCard } = require('../../../utils/share');

Page({
  data: {
    statusBarHeight: 20,
    loading: false,
    saving: false,
    itemId: '',
    form: { name: '', relation: '', passportNo: '' }
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    const itemId = options && options.id;
    if (itemId) {
      this.setData({ itemId });
      this.loadItem(itemId);
    }
    wx.setNavigationBarTitle({ title: itemId ? '编辑出行人' : '添加出行人' });
  },

  loadItem(itemId) {
    this.setData({ loading: true });
    auth.fetchMyCollection('travelers', (ok, items, message) => {
      if (!ok || !Array.isArray(items)) {
        this.setData({ loading: false });
        return wx.showToast({ title: message || '加载失败', icon: 'none' });
      }
      const item = items.find((it) => it.id === itemId);
      if (!item) {
        this.setData({ loading: false });
        return wx.showToast({ title: '资料不存在', icon: 'none' });
      }
      this.setData({ loading: false, form: { name: item.name || '', relation: item.relation || '', passportNo: item.passportNo || '' } });
    });
  },

  onShareAppMessage() {
    return buildShareCard('/pages/profile/detail/detail?type=travelers');
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onSave() {
    const form = this.data.form;
    const name = (form.name || '').trim();
    if (!name) return wx.showToast({ title: '请填写姓名或称呼', icon: 'none' });
    if (this.data.saving) return;
    const payload = {
      name,
      relation: (form.relation || '').trim(),
      passportNo: (form.passportNo || '').trim()
    };
    this.setData({ saving: true });
    const done = (ok, unused, message) => {
      this.setData({ saving: false });
      if (!ok) return wx.showToast({ title: message || '保存失败', icon: 'none' });
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 450);
    };
    if (this.data.itemId) {
      auth.updateMyItem('travelers', this.data.itemId, payload, done);
    } else {
      auth.createMyItem('travelers', payload, done);
    }
  }
});
