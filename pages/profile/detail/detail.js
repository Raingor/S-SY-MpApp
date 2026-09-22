// 我的资料详情：预约、行程、优惠券、常用出行人与护照签证资料
const auth = require('../../../utils/auth');
const { buildShareCard } = require('../../../utils/share');
const { goBack } = require('../../../utils/navigation');
const i18n = require('../../../utils/i18n');
const paidContent = require('../../../utils/paid-content');

const TYPE_CONFIG = {
  orders: { title: '我的预约', mode: 'leads', empty: '还没有提交过预约或咨询' },
  trips: { title: '我的行程', mode: 'trips', empty: '暂未安排导游陪同行程' },
  coupons: { title: '优惠券', mode: 'coupons', empty: '当前没有可使用的优惠券' },
  travelers: { title: '常用出行人', mode: 'traveler', empty: '添加常用出行人，填写表单时更方便' },
  visa: { title: '护照签证资料', mode: 'document', empty: '添加资料后可在预约时快速查看' },
  'payment-orders': { title: '我的订单', mode: 'payment-orders', empty: '暂无支付订单' },
  'payment-order': { title: '订单详情', mode: 'payment-order', empty: '暂无支付订单' }
};

function formatDate(value, fallback = '时间待确认') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function leadTitle(item, copy) {
  return (copy.leadTitles && copy.leadTitles[item.leadType]) || copy.leadTitles.fallback;
}

function leadStatus(status, copy) {
  return (copy.statuses && copy.statuses[status]) || copy.statuses.fallback;
}

function paymentStatus(status, copy) {
  return (copy && copy[status]) || status || copy.pending;
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

function paymentOrderView(item, copy) {
  return {
    ...item,
    displayTitle: item.name || (item.productType === 'membership' ? copy.paidContent.member : copy.paidContent.video),
    displayStatus: paymentStatus(item.status, copy.profileDetail),
    displayCreated: formatDateTime(item.createdAt),
    displayPaid: formatDateTime(item.paidAt),
    displayAmount: item.price === undefined || item.price === null ? '—' : `¥${item.price}`
  };
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
    items: [],
    order: null,
    locale: 'zh-CN',
    i18n: i18n.getMessages()
  },

  onShareAppMessage() {
    return buildShareCard('/pages/index/index');
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    i18n.apply(this);
    const type = options && TYPE_CONFIG[options.type] ? options.type : 'orders';
    this.orderId = options && options.id ? decodeURIComponent(options.id) : '';
    const copy = this.data.i18n.profileDetail;
    const config = {
      orders: { title: copy.orders, mode: 'leads', empty: copy.noOrders },
      trips: { title: copy.trips, mode: 'trips', empty: copy.noTrips },
      coupons: { title: copy.coupons, mode: 'coupons', empty: copy.noCoupons },
      travelers: { title: copy.travelers, mode: 'traveler', empty: copy.noTravelers },
      visa: { title: copy.visa, mode: 'document', empty: copy.noVisa },
      'payment-orders': { title: copy.myOrders, mode: 'payment-orders', empty: copy.noPaymentOrders },
      'payment-order': { title: copy.paymentOrder, mode: 'payment-order', empty: copy.noPaymentOrders }
    }[type];
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
        wx.showToast({ title: this.data.i18n.validation.loginRequired, icon: 'none' });
        return wx.switchTab({ url: '/pages/profile/profile' });
      }
      if (config.mode === 'leads' || config.mode === 'trips') this.loadLeads();
      else if (config.mode === 'coupons') this.loadCoupons();
      else if (config.mode === 'payment-orders') this.loadPaymentOrders();
      else if (config.mode === 'payment-order') this.loadPaymentOrder();
      else this.loadProfileItems();
    });
  },

  onShow() {
    i18n.apply(this);
    if (this.data.mode === 'leads' || this.data.mode === 'trips') this.loadLeads();
    else if (this.data.mode === 'coupons') this.loadCoupons();
    else if (this.data.mode === 'payment-orders') this.loadPaymentOrders();
    else if (this.data.mode === 'payment-order') this.loadPaymentOrder();
    else this.loadProfileItems();
  },

  onBack() {
    goBack('/pages/profile/profile');
  },

  loadLeads() {
    this.setData({ loading: true });
    auth.fetchMyLeads({}, (ok, leads, message) => {
      if (!ok) {
        this.setData({ loading: false });
        return wx.showToast({ title: message || this.data.i18n.profileDetail.loadRecordsFailed, icon: 'none' });
      }
      let items = leads;
      if (this.data.mode === 'trips') items = items.filter((item) => item.leadType === 'guide-booking');
      const copy = this.data.i18n.profileDetail;
      this.setData({
        loading: false,
        items: items.map((item) => ({
          ...item,
          displayTitle: leadTitle(item, copy),
          displayStatus: leadStatus(item.status, copy),
          displayDate: item.bookingDate || item.date || copy.timePending,
          displayCreated: formatDate(item.createdAt, copy.timePending),
          displayRoute: item.route || item.description || copy.requestSubmitted
        }))
      });
    });
  },

  loadCoupons() {
    this.setData({ loading: true });
    auth.fetchMyCoupons((ok, items, message) => {
      if (!ok) {
        this.setData({ loading: false });
        return wx.showToast({ title: message || this.data.i18n.profileDetail.loadCouponsFailed, icon: 'none' });
      }
      this.setData({ loading: false, items: items.map((item) => ({
        ...item,
        displayTitle: item.title || item.name || this.data.i18n.profileDetail.exclusiveBenefit,
        displayDesc: item.description || item.desc || this.data.i18n.profileDetail.couponRules,
        displayExpiry: item.expiresAt ? `${this.data.i18n.profileDetail.expiryPrefix} ${formatDate(item.expiresAt, '')}` : this.data.i18n.profileDetail.expiryFallback
      })) });
    });
  },

  loadPaymentOrders() {
    this.setData({ loading: true });
    paidContent.fetchOrders((ok, items, message) => {
      if (!ok) {
        this.setData({ loading: false });
        return wx.showToast({ title: message || this.data.i18n.profileDetail.loadRecordsFailed, icon: 'none' });
      }
      this.setData({
        loading: false,
        items: items.map((item) => paymentOrderView(item, this.data.i18n))
      });
    });
  },

  loadPaymentOrder() {
    if (!this.orderId) {
      return this.setData({ loading: false, order: null });
    }
    this.setData({ loading: true });
    paidContent.fetchOrder(this.orderId, (ok, item, message) => {
      if (!ok) {
        this.setData({ loading: false, order: null });
        return wx.showToast({ title: message || this.data.i18n.profileDetail.loadRecordsFailed, icon: 'none' });
      }
      this.setData({ loading: false, order: paymentOrderView(item, this.data.i18n) });
    });
  },

  loadProfileItems() {
    const collection = this.data.mode === 'traveler' ? 'travelers' : 'documents';
    this.setData({ loading: true });
    auth.fetchMyCollection(collection, (ok, items, message) => {
      if (!ok) {
        this.setData({ loading: false });
        return wx.showToast({ title: message || this.data.i18n.profileDetail.loadProfileFailed, icon: 'none' });
      }
      this.setData({ loading: false, items });
    });
  },

  onPaymentOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return wx.showToast({ title: this.data.i18n.profileDetail.invalidId, icon: 'none' });
    wx.navigateTo({ url: '/pages/profile/detail/detail?type=payment-order&id=' + encodeURIComponent(id) });
  },

  // 添加出行人 → 独立编辑页，保存后 onShow 自动刷新列表
  onAddItem() {
    const type = this.data.mode === 'traveler' ? 'travelers' : 'visa';
    wx.navigateTo({ url: '/pages/profile/traveler-edit/traveler-edit?type=' + type });
  },

  // 编辑出行人 → 独立编辑页，保存后 onShow 自动刷新列表
  onEditItem(e) {
    const item = this.data.items[Number(e.currentTarget.dataset.index)];
    if (!item || !item.id) return wx.showToast({ title: this.data.i18n.profileDetail.invalidId, icon: 'none' });
    const type = this.data.mode === 'traveler' ? 'travelers' : 'visa';
    wx.navigateTo({ url: '/pages/profile/traveler-edit/traveler-edit?type=' + type + '&id=' + item.id });
  },

  onDeleteProfile(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.items[index];
    if (!item || !item.id) return wx.showToast({ title: this.data.i18n.profileDetail.invalidId, icon: 'none' });
    const collection = this.data.mode === 'traveler' ? 'travelers' : 'documents';
    wx.showModal({
      title: this.data.i18n.profileDetail.deleteTitle,
      content: this.data.i18n.profileDetail.deleteContent,
      confirmText: this.data.i18n.profileDetail.delete,
      success: (res) => {
        if (!res.confirm) return;
        auth.deleteMyItem(collection, item.id, (ok, unused, message) => {
          if (!ok) return wx.showToast({ title: message || this.data.i18n.submitFailed, icon: 'none' });
          this.loadProfileItems();
          wx.showToast({ title: this.data.i18n.profileDetail.deleted, icon: 'success' });
        });
      }
    });
  }
});
