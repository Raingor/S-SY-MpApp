// 我的资料详情：预约、行程、优惠券、常用出行人与护照签证资料
const auth = require('../../../utils/auth');
const { buildShareCard } = require('../../../utils/share');

const TYPE_CONFIG = {
  orders: { title: '我的预约', mode: 'leads', empty: '还没有提交过预约或咨询' },
  trips: { title: '我的行程', mode: 'trips', empty: '暂未安排导游陪同行程' },
  coupons: { title: '优惠券', mode: 'coupons', empty: '当前没有可使用的优惠券' },
  travelers: { title: '常用出行人', mode: 'traveler', empty: '添加常用出行人，填写表单时更方便' },
  visa: { title: '护照签证资料', mode: 'document', empty: '添加资料后可在预约时快速查看' }
};

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
    saving: false,
    statusBarHeight: 20,
    items: []
  },

  onShareAppMessage() {
    return buildShareCard('/pages/index/index');
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const type = options && TYPE_CONFIG[options.type] ? options.type : 'orders';
    const config = TYPE_CONFIG[type];
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      type,
      title: config.title,
      mode: config.mode,
      empty: config.empty
    });
    wx.setNavigationBarTitle({ title: config.title });
    auth.getUserState((loggedIn, user) => {
      if (!loggedIn || !user || !user.id) {
        wx.showToast({ title: '请先微信登录', icon: 'none' });
        return wx.switchTab({ url: '/pages/profile/profile' });
      }
      if (config.mode === 'leads' || config.mode === 'trips') this.loadLeads();
      else if (config.mode === 'coupons') this.loadCoupons();
      else this.loadProfileItems();
    });
  },

  onShow() {
    if (this.data.mode === 'leads' || this.data.mode === 'trips') this.loadLeads();
    else if (this.data.mode === 'coupons') this.loadCoupons();
    else this.loadProfileItems();
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

  loadCoupons() {
    this.setData({ loading: true });
    auth.fetchMyCoupons((ok, items, message) => {
      if (!ok) {
        this.setData({ loading: false });
        return wx.showToast({ title: message || '优惠券加载失败', icon: 'none' });
      }
      this.setData({ loading: false, items: items.map((item) => ({
        ...item,
        displayTitle: item.title || item.name || '专属权益',
        displayDesc: item.description || item.desc || '使用规则请以顾问说明为准',
        displayExpiry: item.expiresAt ? `有效期至 ${formatDate(item.expiresAt)}` : '有效期以券面为准'
      })) });
    });
  },

  loadProfileItems() {
    const collection = this.data.mode === 'traveler' ? 'travelers' : 'documents';
    this.setData({ loading: true });
    auth.fetchMyCollection(collection, (ok, items, message) => {
      if (!ok) {
        this.setData({ loading: false });
        return wx.showToast({ title: message || '资料加载失败', icon: 'none' });
      }
      this.setData({ loading: false, items });
    });
  },

  // 添加出行人 → 独立编辑页，保存后 onShow 自动刷新列表
  onAddItem() {
    const type = this.data.mode === 'traveler' ? 'travelers' : 'visa';
    wx.navigateTo({ url: '/pages/profile/traveler-edit/traveler-edit?type=' + type });
  },

  // 编辑出行人 → 独立编辑页，保存后 onShow 自动刷新列表
  onEditItem(e) {
    const item = this.data.items[Number(e.currentTarget.dataset.index)];
    if (!item || !item.id) return wx.showToast({ title: '资料编号无效，请刷新后重试', icon: 'none' });
    const type = this.data.mode === 'traveler' ? 'travelers' : 'visa';
    wx.navigateTo({ url: '/pages/profile/traveler-edit/traveler-edit?type=' + type + '&id=' + item.id });
  },

  onDeleteProfile(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.items[index];
    if (!item || !item.id) return wx.showToast({ title: '资料编号无效，请刷新后重试', icon: 'none' });
    const collection = this.data.mode === 'traveler' ? 'travelers' : 'documents';
    wx.showModal({
      title: '删除这条资料？',
      content: '删除后无法恢复，请确认。',
      confirmText: '删除',
      success: (res) => {
        if (!res.confirm) return;
        auth.deleteMyItem(collection, item.id, (ok, unused, message) => {
          if (!ok) return wx.showToast({ title: message || '删除失败', icon: 'none' });
          this.loadProfileItems();
          wx.showToast({ title: '已删除', icon: 'success' });
        });
      }
    });
  }
});
