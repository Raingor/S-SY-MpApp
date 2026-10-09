// VIP 会员选购页：商品和价格均来自 Website 的会员配置
const auth = require('../../utils/auth');
const i18n = require('../../utils/i18n');
const paidContent = require('../../utils/paid-content');
const { goBack } = require('../../utils/navigation');

Page({
  data: {
    statusBarHeight: 20,
    i18n: i18n.getMessages(),
    loading: true,
    membershipLoading: false,
    membershipConfigured: false,
    membershipCanRenew: true,
    memberActive: false,
    phoneBound: false,
    plans: []
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    i18n.apply(this);
    this.loadPlans();
  },

  onShow() {
    i18n.apply(this);
    auth.getUserState((loggedIn, user) => {
      if (!this || !this.setData) return;
      this.setData({ phoneBound: Boolean(loggedIn && user && user.phoneBound) });
    });
    paidContent.fetchEntitlements((ok, entitlements) => {
      if (!this || !this.setData) return;
      this.setData({
        memberActive: Boolean(entitlements && entitlements.member),
        membershipCanRenew: !entitlements || entitlements.membershipCanRenew !== false
      });
    });
  },

  loadPlans() {
    const copy = this.data.i18n.paidContent || {};
    this.setData({ loading: true });
    paidContent.fetchConfig((ok, config) => {
      const plans = Object.values(config && config.products || {})
        .filter((product) => product && product.enabled !== false && ['membership', 'annualMembership'].includes(product.productType))
        .map((product) => {
          const priceConfigured = product.price !== undefined && product.price !== null && String(product.price).trim() !== '';
          const price = priceConfigured ? String(product.price).replace(/^¥\s*/, '') : '';
          return {
            productType: product.productType,
            displayName: product.productType === 'annualMembership' ? (copy.memberAnnual || product.name || copy.member) : (product.name || copy.memberAnnual || copy.member),
            description: product.description || copy.memberDesc || '',
            displayPrice: priceConfigured ? `${product.currency === 'CNY' || !product.currency ? '¥' : `${product.currency} `}${price}` : copy.vipShopPriceUnavailable,
            durationDays: Number(product.durationDays) || 0,
            durationLabel: Number(product.durationDays) > 0 ? (copy.vipShopDuration || '').replace('{days}', String(Number(product.durationDays))) : '',
            priceConfigured
          };
        });
      this.setData({
        loading: false,
        membershipConfigured: Boolean((ok || config && config.configured) && plans.length),
        plans
      });
    });
  },

  onBack() { goBack('/pages/profile/profile'); },

  onPlanTap(e) {
    const productType = e && e.currentTarget && e.currentTarget.dataset.productType;
    const plan = this.data.plans.find((item) => item.productType === productType);
    if (!plan || this.data.membershipLoading) return;
    if (!auth.getAccessToken()) return this.promptProfile('login');
    if (!this.data.phoneBound) return this.promptProfile('phone');
    if (!plan.priceConfigured) return wx.showToast({ title: this.data.i18n.paidContent.vipShopPriceUnavailable, icon: 'none' });
    if (!this.data.membershipCanRenew) return wx.showToast({ title: this.data.i18n.paidContent.paymentPending, icon: 'none' });

    this.setData({ membershipLoading: true });
    paidContent.createOrder(productType, '', (ok, data) => {
      this.setData({ membershipLoading: false });
      if (!ok) {
        if (data && data.code === 'PAYMENT_CANCELLED') return;
        if (data && data.code === 'PHONE_BIND_REQUIRED') this.setData({ phoneBound: false });
        return wx.showModal({
          title: this.data.i18n.submitFailed,
          content: (data && (data.error || data.message)) || this.data.i18n.paidContent.payUnavailable,
          confirmText: this.data.i18n.know,
          showCancel: false
        });
      }
      paidContent.fetchEntitlements((success, entitlements) => {
        if (success) this.setData({ memberActive: Boolean(entitlements.member), membershipCanRenew: entitlements.membershipCanRenew !== false });
      });
      if (data && data.paymentStatus === 'pending') {
        return wx.showToast({ title: this.data.i18n.paidContent.paymentPending, icon: 'none' });
      }
      wx.showToast({ title: this.data.i18n.paidContent.memberUnlocked, icon: 'success' });
    });
  },

  promptProfile(kind) {
    const copy = this.data.i18n.paidContent;
    wx.showModal({
      title: kind === 'phone' ? copy.vipShopPhoneTitle : copy.vipShopLoginTitle,
      content: copy.vipShopLoginDesc,
      confirmText: copy.vipShopGoProfile,
      cancelText: this.data.i18n.know,
      success: (res) => {
        if (res.confirm) wx.switchTab({ url: '/pages/profile/profile' });
      }
    });
  }
});
