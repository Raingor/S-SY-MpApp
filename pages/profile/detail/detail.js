// 我的资料详情：预约、行程、优惠券、常用出行人与护照签证资料
const auth = require('../../../utils/auth');

const TYPE_CONFIG = {
  orders: { title: '我的预约', mode: 'leads', empty: '还没有提交过预约或咨询' },
  trips: { title: '我的行程', mode: 'trips', empty: '暂未安排导游陪同行程' },
  coupons: { title: '优惠券', mode: 'coupons', empty: '当前没有可使用的优惠券' },
  travelers: { title: '常用出行人', mode: 'traveler', empty: '添加常用出行人，填写表单时更方便' },
  visa: { title: '护照签证资料', mode: 'document', empty: '添加资料后可在本机快速查看' }
};

function storageKey(userId, type) {
  return `sy_profile_${userId}_${type}`;
}

function formatDate(value) {
  if (!value) return '时间待确认';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function leadTitle(item) {
  const names = {
    customization: '行程资讯咨询',
    'guide-booking': 'Richard 预约',
    'vehicle-consultation': '用车资源咨询',
    'knowledge-base': '文史知识咨询',
    'business-travel': '商旅随行咨询'
  };
  return names[item.leadType] || '咨询记录';
}

function leadStatus(status) {
  return { new: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消' }[status] || '待确认';
}

Page({
  data: {
    type: 'orders',
    title: '我的预约',
    mode: 'leads',
    empty: '还没有提交过预约或咨询',
    loading: false,
    items: [],
    form: { name: '', relation: '', passportNo: '', expiry: '', visaStatus: '' },
    editingIndex: -1,
    userId: ''
  },

  onLoad(options) {
    const type = options && TYPE_CONFIG[options.type] ? options.type : 'orders';
    const config = TYPE_CONFIG[type];
    this.setData({ type, title: config.title, mode: config.mode, empty: config.empty });
    wx.setNavigationBarTitle({ title: config.title });
    auth.getUserState((loggedIn, user) => {
      if (!loggedIn || !user || !user.id) {
        wx.showToast({ title: '请先微信登录', icon: 'none' });
        return wx.switchTab({ url: '/pages/profile/profile' });
      }
      this.setData({ userId: user.id });
      if (config.mode === 'leads' || config.mode === 'trips') this.loadLeads();
      else this.loadLocalItems();
    });
  },

  onShow() {
    if (this.data.userId && (this.data.mode === 'traveler' || this.data.mode === 'document')) this.loadLocalItems();
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  loadLeads() {
    this.setData({ loading: true });
    auth.fetchMyLeads({}, (ok, leads, message) => {
      if (!ok) {
        this.setData({ loading: false });
        return wx.showToast({ title: message || '记录加载失败', icon: 'none' });
      }
      let items = leads;
      if (this.data.mode === 'trips') items = items.filter((item) => item.leadType === 'guide-booking');
      this.setData({
        loading: false,
        items: items.map((item) => ({
          ...item,
          displayTitle: leadTitle(item),
          displayStatus: leadStatus(item.status),
          displayDate: item.bookingDate || item.date || '时间待确认',
          displayCreated: formatDate(item.createdAt),
          displayRoute: item.route || item.description || '需求已提交，等待顾问确认'
        }))
      });
    });
  },

  loadLocalItems() {
    const items = wx.getStorageSync(storageKey(this.data.userId, `${this.data.mode}s`)) || [];
    this.setData({ items });
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onSaveLocal() {
    const form = this.data.form;
    if (!form.name.trim()) return wx.showToast({ title: '请填写姓名或称呼', icon: 'none' });
    const storageType = `${this.data.mode}s`;
    const items = (wx.getStorageSync(storageKey(this.data.userId, storageType)) || []).slice();
    const item = { ...form, name: form.name.trim(), updatedAt: new Date().toISOString() };
    if (this.data.editingIndex >= 0) items.splice(this.data.editingIndex, 1, item);
    else items.push(item);
    wx.setStorageSync(storageKey(this.data.userId, storageType), items);
    this.setData({ items, form: { name: '', relation: '', passportNo: '', expiry: '', visaStatus: '' }, editingIndex: -1 });
    wx.showToast({ title: '已保存到本机', icon: 'success' });
  },

  onEditLocal(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ form: { ...this.data.items[index] }, editingIndex: index });
    wx.pageScrollTo({ scrollTop: 0, duration: 240 });
  },

  onDeleteLocal(e) {
    const index = Number(e.currentTarget.dataset.index);
    wx.showModal({
      title: '删除这条资料？',
      content: '删除后无法恢复，请确认。',
      confirmText: '删除',
      success: (res) => {
        if (!res.confirm) return;
        const storageType = `${this.data.mode}s`;
        const items = (wx.getStorageSync(storageKey(this.data.userId, storageType)) || []).slice();
        items.splice(index, 1);
        wx.setStorageSync(storageKey(this.data.userId, storageType), items);
        this.setData({ items });
      }
    });
  }
});
