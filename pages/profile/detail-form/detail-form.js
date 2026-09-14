// 出行人/护照签证资料 · 添加与编辑表单页
// type=travelers：常用出行人（姓名*、关系、护照号）
// type=visa：护照签证资料（姓名*、护照号、有效期、签证备注）
// 保存成功后返回列表页（列表页 onShow 自动刷新）
const auth = require('../../../utils/auth');
const { buildShareCard } = require('../../../utils/share');

const TYPE_CONFIG = {
  travelers: { title: '添加出行人', editTitle: '编辑出行人', collection: 'travelers' },
  visa: { title: '添加资料', editTitle: '编辑资料', collection: 'documents' }
};

Page({
  data: {
    statusBarHeight: 20,
    type: 'travelers',
    isEdit: false,
    saving: false,
    itemId: '',
    form: { name: '', relation: '', passportNo: '', expiry: '', visaStatus: '' }
  },

  onShareAppMessage() {
    return buildShareCard('/pages/index/index');
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const type = options && TYPE_CONFIG[options.type] ? options.type : 'travelers';
    const isEdit = !!(options && options.id);
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      type,
      isEdit,
      itemId: (options && options.id) || ''
    });
    wx.setNavigationBarTitle({ title: isEdit ? TYPE_CONFIG[type].editTitle : TYPE_CONFIG[type].title });

    // 登录校验 + 编辑模式预填
    auth.getUserState((loggedIn, user) => {
      if (!loggedIn || !user || !user.id) {
        wx.showToast({ title: '请先微信登录', icon: 'none' });
        return setTimeout(() => wx.navigateBack({ delta: 1 }), 800);
      }
      if (!isEdit) return;
      const collection = TYPE_CONFIG[type].collection;
      auth.fetchMyCollection(collection, (ok, items, message) => {
        if (!ok) return wx.showToast({ title: message || '资料加载失败', icon: 'none' });
        const item = (items || []).find((entry) => entry.id === this.data.itemId);
        if (!item) {
          wx.showToast({ title: '未找到该资料', icon: 'none' });
          return setTimeout(() => wx.navigateBack({ delta: 1 }), 800);
        }
        this.setData({ form: {
          name: item.name || '',
          relation: item.relation || '',
          passportNo: item.passportNo || '',
          expiry: item.expiry || '',
          visaStatus: item.visaStatus || ''
        } });
      });
    });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onSave() {
    const { form, type, isEdit, itemId } = this.data;
    if (!form.name.trim()) return wx.showToast({ title: '请填写姓名或称呼', icon: 'none' });
    const collection = TYPE_CONFIG[type].collection;
    const payload = type === 'travelers'
      ? { name: form.name.trim(), relation: form.relation.trim(), passportNo: form.passportNo.trim() }
      : { name: form.name.trim(), passportNo: form.passportNo.trim(), expiry: form.expiry.trim(), visaStatus: form.visaStatus.trim() };
    this.setData({ saving: true });
    const done = (ok, item, message) => {
      this.setData({ saving: false });
      if (!ok) return wx.showToast({ title: message || '保存失败', icon: 'none' });
      wx.showToast({ title: '已保存', icon: 'success' });
      // 保存成功后返回列表（列表页 onShow 会重新拉取）
      setTimeout(() => wx.navigateBack({ delta: 1 }), 600);
    };
    if (isEdit && itemId) auth.updateMyItem(collection, itemId, payload, done);
    else auth.createMyItem(collection, payload, done);
  }
});
