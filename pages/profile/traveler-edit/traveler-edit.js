// 出行人/护照签证资料编辑页：添加 / 修改，保存后返回列表（列表 onShow 自动刷新）
// type=travelers（默认）：常用出行人（姓名*/关系/护照号）
// type=visa：护照签证资料（姓名*/护照号/有效期/签证备注）
const auth = require('../../../utils/auth');
const { buildShareCard } = require('../../../utils/share');

const TYPE_CONFIG = {
  travelers: { collection: 'travelers', addTitle: '添加出行人', editTitle: '编辑出行人' },
  visa: { collection: 'documents', addTitle: '添加资料', editTitle: '编辑资料' }
};

Page({
  data: {
    statusBarHeight: 20,
    type: 'travelers',
    loading: false,
    saving: false,
    itemId: '',
    form: { name: '', relation: '', passportNo: '', expiry: '', visaStatus: '' }
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    const type = options && TYPE_CONFIG[options.type] ? options.type : 'travelers';
    const itemId = options && options.id;
    this.setData({ type, itemId: itemId || '' });
    wx.setNavigationBarTitle({ title: itemId ? TYPE_CONFIG[type].editTitle : TYPE_CONFIG[type].addTitle });
    if (itemId) this.loadItem(type, itemId);
  },

  loadItem(type, itemId) {
    this.setData({ loading: true });
    auth.fetchMyCollection(TYPE_CONFIG[type].collection, (ok, items, message) => {
      if (!ok || !Array.isArray(items)) {
        this.setData({ loading: false });
        return wx.showToast({ title: message || '加载失败', icon: 'none' });
      }
      const item = items.find((it) => it.id === itemId);
      if (!item) {
        this.setData({ loading: false });
        return wx.showToast({ title: '资料不存在', icon: 'none' });
      }
      this.setData({ loading: false, form: {
        name: item.name || '',
        relation: item.relation || '',
        passportNo: item.passportNo || '',
        expiry: item.expiry || '',
        visaStatus: item.visaStatus || ''
      } });
    });
  },

  onShareAppMessage() {
    return buildShareCard('/pages/profile/detail/detail?type=travelers');
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onSave() {
    const form = this.data.form;
    const name = (form.name || '').trim();
    if (!name) return wx.showToast({ title: '请填写姓名或称呼', icon: 'none' });
    if (this.data.saving) return;
    const collection = TYPE_CONFIG[this.data.type].collection;
    const payload = this.data.type === 'travelers'
      ? { name, relation: (form.relation || '').trim(), passportNo: (form.passportNo || '').trim() }
      : { name, passportNo: (form.passportNo || '').trim(), expiry: (form.expiry || '').trim(), visaStatus: (form.visaStatus || '').trim() };
    this.setData({ saving: true });
    const done = (ok, unused, message) => {
      this.setData({ saving: false });
      if (!ok) return wx.showToast({ title: message || '保存失败', icon: 'none' });
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 450);
    };
    if (this.data.itemId) {
      auth.updateMyItem(collection, this.data.itemId, payload, done);
    } else {
      auth.createMyItem(collection, payload, done);
    }
  }
});
