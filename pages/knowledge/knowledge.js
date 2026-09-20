// 服务4：景点区（城市选择层 → 城市介绍页 → 城市景点列表 → 景点详情）
// 数据：优先后端 /api/content，失败回退本地镜像（data/content.js）
const app = getApp();
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');
const i18n = require('../../utils/i18n');

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    activePanel: 0,
    panelTabs: [],
    cities: [],
    sampleTrips: [],
    searchQuery: '',
    searchResults: [],
    hotSpots: [],
    productHome: i18n.getMessages().productHome,
    categoryIndex: 0
  },

  onShareAppMessage() {
    return buildShareCard('/pages/knowledge/knowledge');
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      cities: content.getCities(),
      sampleTrips: content.getReferenceList(),
      hotSpots: content.getAttractions().slice(0, 6)
    });
    this.applyLocale();
    // 异步拉取后端数据；仅网络离线时显示明确标记的本地镜像，契约错误不伪装为成功
    content.loadContent((data) => {
      this.setData({
        cities: content.getCities(data),
        sampleTrips: content.getReferenceList(data),
        hotSpots: content.getAttractions(data).slice(0, 6)
      });
    });
  },

  onShow() {
    this.applyLocale();
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

  onSearchInput(e) {
    const query = String(e.detail.value || '').trim().toLowerCase();
    const spots = this.data.hotSpots || [];
    const results = query ? spots.filter((spot) => [spot.name, spot.en, spot.summary, spot.category, ...(spot.highlights || []).map((item) => item.name)].join(' ').toLowerCase().includes(query)) : [];
    this.setData({ searchQuery: e.detail.value, searchResults: results.slice(0, 5) });
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
    wx.showModal({ title: this.data.productHome.memberTitle, content: this.data.productHome.memberDesc, confirmText: this.data.productHome.openMember, cancelText: this.data.i18n.know });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
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
