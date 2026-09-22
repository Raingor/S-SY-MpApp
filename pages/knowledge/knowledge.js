// 服务4：景点区（城市选择层 → 城市介绍页 → 城市景点列表 → 景点详情）
// 数据：优先后端 /api/content，失败回退本地镜像（data/content.js）
const app = getApp();
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');
const { goBack } = require('../../utils/navigation');
const i18n = require('../../utils/i18n');
const auth = require('../../utils/auth');
const paidContent = require('../../utils/paid-content');

const PRODUCT_CATEGORY_ALIASES = [
  ['athens', '雅典', '雅典区域'],
  ['santorini', '圣托里尼', '聖托里尼'],
  ['crete', '克里特'],
  ['peloponnese', '伯罗奔尼撒', '伯羅奔尼撒', 'nafplio', '纳夫普利翁', '纳夫普里奥', 'corinth', '科林斯'],
  ['zakynthos', '扎金索斯'],
];

function spotSearchText(spot) {
  return [
    spot && spot.name,
    spot && spot.en,
    spot && spot.summary,
    spot && spot.category,
    spot && spot.city,
    spot && spot.cityName,
    spot && spot.region,
    spot && spot.destination,
    ...((spot && spot.highlights) || []).map((item) => typeof item === 'string' ? item : item && item.name)
  ].filter(Boolean).join(' ').toLowerCase();
}

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    activePanel: 0,
    panelTabs: [],
    cities: [],
    sampleTrips: [],
    allHotSpots: [],
    searchQuery: '',
    searchResults: [],
    hotSpots: [],
    productHome: i18n.getMessages().productHome,
    categoryIndex: 0,
    membershipConfigured: false,
    membershipLoading: false
  },

  onShareAppMessage() {
    return buildShareCard('/pages/knowledge/knowledge');
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const localHotSpots = content.getAttractions();
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      cities: content.getCities(),
      sampleTrips: content.getReferenceList(),
      allHotSpots: localHotSpots,
      hotSpots: this.filterHotSpots(localHotSpots, 0)
    });
    this.applyLocale();
    // 异步拉取后端数据；仅网络离线时显示明确标记的本地镜像，契约错误不伪装为成功
    content.loadContent((data) => {
      this.setData({
        cities: content.getCities(data),
        sampleTrips: content.getReferenceList(data),
        allHotSpots: content.getAttractions(data),
        hotSpots: this.filterHotSpots(content.getAttractions(data), this.data.categoryIndex)
      });
    });
  },

  onShow() {
    this.applyLocale();
    paidContent.fetchConfig((ok, config) => this.setData({ membershipConfigured: ok || config.configured }));
  },

  applyLocale() {
    const copy = i18n.apply(this);
    this.setData({
      panelTabs: [copy.knowledgePage.originalTab, copy.knowledgePage.newTab],
      productHome: copy.productHome
    });
    return copy;
  },

  onPanelTap(e) {
    this.setData({ activePanel: Number(e.currentTarget.dataset.index) || 0 });
  },

  filterHotSpots(spots, categoryIndex) {
    const list = Array.isArray(spots) ? spots : [];
    const index = Number(categoryIndex);
    if (!Number.isInteger(index) || index < 0 || index > 5) return list.slice(0, 6);
    if (index === 5) {
      return list.filter((spot) => !PRODUCT_CATEGORY_ALIASES.some((aliases) => aliases.some((alias) => spotSearchText(spot).includes(alias.toLowerCase())))).slice(0, 6);
    }
    const aliases = PRODUCT_CATEGORY_ALIASES[index] || [];
    return list.filter((spot) => aliases.some((alias) => spotSearchText(spot).includes(alias.toLowerCase()))).slice(0, 6);
  },

  filterSearchResults(query, spots) {
    const normalized = String(query || '').trim().toLowerCase();
    if (!normalized) return [];
    return (spots || []).filter((spot) => spotSearchText(spot).includes(normalized)).slice(0, 5);
  },

  onCategoryTap(e) {
    const categoryIndex = Number(e.currentTarget.dataset.index);
    if (!Number.isInteger(categoryIndex)) return;
    const hotSpots = this.filterHotSpots(this.data.allHotSpots, categoryIndex);
    this.setData({
      categoryIndex,
      hotSpots,
      searchResults: this.filterSearchResults(this.data.searchQuery, hotSpots)
    });
  },

  onSearchInput(e) {
    const value = e.detail.value || '';
    this.setData({ searchQuery: value, searchResults: this.filterSearchResults(value, this.data.hotSpots) });
  },

  onSearchConfirm(e) {
    const query = String(e.detail.value || '').trim();
    if (!query) return;
    const spot = (this.data.searchResults || [])[0];
    if (spot) return wx.navigateTo({ url: '/pages/attraction/detail?id=' + encodeURIComponent(spot.id) });
    wx.showToast({ title: this.data.locale === 'en' ? 'No matching sight' : this.data.locale === 'zh-TW' ? '沒有找到相關景點' : '没有找到相关景点', icon: 'none' });
  },

  onHotSpotTap(e) {
    const spot = this.data.hotSpots[Number(e.currentTarget.dataset.index)];
    if (spot) wx.navigateTo({ url: '/pages/attraction/detail?id=' + encodeURIComponent(spot.id) });
  },

  onCampaignTap(e) {
    const type = e.currentTarget.dataset.type;
    if (type === 'live') return wx.navigateTo({ url: '/pages/live-booking/live-booking' });
    if (type === 'member') return this.openMember();
    const spot = this.data.hotSpots[0];
    if (spot) wx.navigateTo({ url: '/pages/attraction/detail?id=' + encodeURIComponent(spot.id) });
  },

  onLiveTap() { wx.navigateTo({ url: '/pages/live-booking/live-booking' }); },
  onMemberTap() { this.openMember(); },
  openMember() {
    if (this.data.membershipLoading) return;
    if (!this.data.membershipConfigured) {
      return paidContent.fetchConfig((ok, config) => {
        const configured = ok || config.configured;
        this.setData({ membershipConfigured: configured });
        if (configured) return this.openMember();
        wx.showToast({ title: this.data.i18n.paidContent.payUnavailable, icon: 'none' });
      });
    }
    const token = auth.getAccessToken();
    if (!token || auth.isSimulationToken(token)) {
      if (token && auth.isSimulationToken(token)) auth.clearSession();
      return wx.switchTab({ url: '/pages/profile/profile' });
    }
    auth.getUserState((loggedIn, user) => {
      if (!loggedIn) return wx.switchTab({ url: '/pages/profile/profile' });
      if (!user || !user.phoneBound) {
        return wx.showModal({
          title: this.data.i18n.profile.bindPhone,
          content: this.data.i18n.profile.bindPhoneDesc,
          confirmText: this.data.i18n.profile.bind,
          cancelText: this.data.i18n.know,
          success: (res) => { if (res.confirm) wx.switchTab({ url: '/pages/profile/profile' }); }
        });
      }
      this.setData({ membershipLoading: true });
      paidContent.createOrder('membership', '', (ok, data) => {
        this.setData({ membershipLoading: false });
        if (!ok) {
          return wx.showModal({
            title: this.data.i18n.submitFailed,
            content: (data && (data.error || data.message)) || this.data.i18n.paidContent.payUnavailable,
            confirmText: this.data.i18n.know,
            showCancel: false
          });
        }
        if (data && data.paymentStatus === 'pending') {
          return wx.showToast({ title: this.data.i18n.paidContent.paymentPending, icon: 'none' });
        }
        wx.showToast({ title: this.data.i18n.paidContent.memberUnlocked, icon: 'success' });
      });
    });
  },

  onBack() {
    goBack();
  },

  // 城市卡 → 城市介绍页
  onCityTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/city/index?id=' + id });
  },

  onTripTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/itinerary/detail?id=' + id });
  },

  onMoreTrips() {
    wx.navigateTo({ url: '/pages/itinerary/index' });
  },

  onConsult() {
    app.globalData.pendingLeadType = 'knowledge-base';
    wx.switchTab({ url: '/pages/customize/customize' });
  }
});
