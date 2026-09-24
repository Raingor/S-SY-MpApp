// 景点详情页（参考博物旅人：中英文名 / 必看亮点 / 参观指南 / 深度文史讲解）
const app = getApp();
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');
const { goBack } = require('../../utils/navigation');
const i18n = require('../../utils/i18n');
const paidContent = require('../../utils/paid-content');
const auth = require('../../utils/auth');

// guide 12 键 -> 默认中文标签（空键不展示）
const GUIDE_LABELS = {
  hours: '开放时间', tickets: '门票信息', transport: '交通信息', worth: '值得一去',
  services: '馆内服务', family: '亲子参观', map: '馆内地图', shop: '博物馆商店',
  accessibility: '无障碍服务', exhibitions: '临时展览', faq: '常见问题', notices: '临时通知'
};

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    spot: null,
    showAllHighlights: false,
    guideTabs: [],
    guideIndex: 0
    ,related: []
    ,paidConfig: { trialSeconds: 0, configured: false }
    ,entitlements: { member: false, purchases: [] }
    ,isVideoUnlocked: false
    ,trialEnded: false
    ,showPurchaseModal: false
    ,trialLabel: ''
    ,purchaseLoading: false
    ,simulationMode: false
    ,pendingSimulationOrder: null
    ,simulationLoading: false
    ,routes: [], exhibits: [], routeGuides: [], onlineGuides: [], expertGuides: [], visitorRows: [], visitorSections: [], customSections: [], visitorMap: '', visitorMapUrl: '', visitorMapLabel: '', visitorSource: '', visitorSourceLabel: '', visitorVerified: '', contentError: false, detailSections: [], activeDetailSection: 'overview'
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    i18n.apply(this);
    this.spotId = (options && options.id) || '';
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    const spot = content.getAttraction(this.spotId);
    if (spot) { this.applySpot(spot); this.loadPaidState(); }
  },

  loadSpot() {
    if (!this.spotId) return;
    content.loadContent((data, state) => {
      const fresh = content.getAttraction(this.spotId, data);
      this.setData({ contentError: state && state.status === 'contract-error' });
      if (fresh) {
        this.contentSource = data;
        this.applySpot(fresh);
        this.loadPaidState();
      } else {
        this.setData({ spot: null, guideTabs: [], related: [] });
      }
    }, true);
  },

  onShow() {
    i18n.apply(this);
    if (this.data.spot) this.applySpot(content.getAttraction(this.spotId, this.contentSource) || this.data.spot);
    this.loadSpot();
  },

  applySpot(spot, statusBarHeight) {
    const labels = (this.data.i18n && this.data.i18n.contentPage && this.data.i18n.contentPage.guideLabels) || GUIDE_LABELS;
    const info = spot.visitorInfo || {};
    const guide = spot.guide || {};
    const visitorIcons = { hours: '◷', tickets: '◇', transport: '↗', map: '⌖' };
    const requiredKinds = ['hours', 'tickets', 'transport', 'map'];
    const sourceSections = Array.isArray(spot.visitorInfoSections) ? spot.visitorInfoSections : [];
    const sectionByKind = new Map(sourceSections.map((section) => [section.kind || section.id, section]));
    const hasRichContent = (value) => Array.isArray(value) ? value.length > 0 : Boolean(String(value || '').trim());
    const readRichContent = (item) => {
      const nodes = this.localized(item, 'nodes');
      if (hasRichContent(nodes)) return nodes;
      return this.localized(item, 'bodyHtml') || '';
    };
    const visitorSections = requiredKinds.map((kind) => {
      const source = sectionByKind.get(kind) || { kind };
      const map = source.map && typeof source.map === 'object' ? source.map : {};
      let richNodes = readRichContent(source);
      // Compatibility with prior API fields; never invent information for a missing section.
      if (!hasRichContent(richNodes)) richNodes = this.localized(info, kind);
      if (kind === 'map' && !hasRichContent(richNodes)) richNodes = this.localized(map, 'description') || this.localized(info, 'map') || this.localized(guide, 'map');
      return {
        ...source, kind, icon: visitorIcons[kind],
        displayTitle: this.localized(source, 'title') || labels[kind],
        richNodes: richNodes || '',
        hasContent: hasRichContent(richNodes),
        mapImage: kind === 'map' ? (map.image || info.mapImage || guide.mapImage || '') : '',
        mapUrl: kind === 'map' ? (map.url || this.localized(info, 'mapUrl') || guide.mapUrl || '') : '',
        sourceUrl: kind === 'map' ? (source.sourceUrl || map.sourceUrl || info.sourceUrl || guide.sourceUrl || '') : '',
        sourceTitle: kind === 'map' ? (this.localized(source, 'sourceTitle') || this.localized(map, 'sourceTitle') || this.localized(info, 'sourceTitle') || labels.map) : '',
        verifiedAt: kind === 'map' ? (source.verifiedAt || map.verifiedAt || info.verifiedAt || guide.verifiedAt || '') : ''
      };
    });
    const customSections = (Array.isArray(spot.customSections) ? spot.customSections : []).filter((section) => section && section.status === 'published').map((section) => {
      const richNodes = readRichContent(section);
      return { ...section, displayTitle: this.localized(section, 'title'), richNodes, hasContent: hasRichContent(richNodes) };
    }).filter((section) => section.displayTitle).sort((a, b) => a.sort - b.sort);
    const exhibits = (spot.exhibits || []).map((point) => ({ ...point, displayName: this.localized(point, 'name'), displayDescription: this.localized(point, 'description') }));
    const tracks = (spot.audioGuides || []).filter((track) => track && track.id && track.previewUrl && track.status !== 'draft').map((track) => ({ ...track, displayTitle: this.localized(track, 'title') }));
    const highlights = (spot.highlights || []).map((item) => ({ ...item, displayName: this.localized(item, 'name'), displayDesc: this.localized(item, 'desc'), hasTarget: Boolean(item.exhibitId && exhibits.some((point) => String(point.id) === String(item.exhibitId))) }));
    const localizedSpot = { ...spot, name: this.localized(spot, 'name'), summary: this.localized(spot, 'summary'), highlights };
    const routes = (spot.routes || []).filter((route) => route && route.id && Array.isArray(route.pointIds) && route.pointIds.some((id) => exhibits.some((point) => String(point.id) === String(id)))).map((route) => ({ ...route, displayTitle: this.localized(route, 'title') }));
    this.setData({
      statusBarHeight: statusBarHeight || this.data.statusBarHeight,
      spot: localizedSpot,
      guideTabs: [],
      visitorSections,
      customSections,
      visitorMap: visitorSections.find((section) => section.kind === 'map').mapImage,
      visitorMapUrl: visitorSections.find((section) => section.kind === 'map').mapUrl,
      visitorMapLabel: labels.map,
      visitorSource: visitorSections.find((section) => section.kind === 'map').sourceUrl,
      visitorSourceLabel: visitorSections.find((section) => section.kind === 'map').sourceTitle,
      visitorVerified: visitorSections.find((section) => section.kind === 'map').verifiedAt,
      routes, exhibits,
      detailSections: [
        { id: 'overview', label: this.data.i18n.contentPage.about },
        { id: 'highlights', label: this.data.i18n.heritage.highlights },
        { id: 'audio', label: this.data.i18n.heritage.audioHow },
        { id: 'visit', label: this.data.i18n.heritage.visitor },
        { id: 'routes', label: this.data.i18n.heritage.routes }
      ],
      activeDetailSection: 'overview',
      routeGuides: tracks.filter((track) => track.category === 'route'),
      onlineGuides: tracks.filter((track) => track.category === 'online'),
      expertGuides: tracks.filter((track) => track.category === 'expert'),
      guideIndex: 0,
      showAllHighlights: false
      ,related: content.getAttractions(this.contentSource).filter((item) => item.id !== spot.id && item.city === spot.city).slice(0, 3)
    });
  },

  loadPaidState() {
    // These endpoints are only needed by the video-paywall UI. Ordinary attraction details
    // (including local content fixtures) must not call disabled purchase/entitlement APIs.
    if (!this.data.spot || !this.data.spot.videoUrl) return;
    paidContent.fetchConfig((ok, config) => this.setData({ paidConfig: config, simulationMode: Boolean(config.simulation), trialLabel: config.configured ? this.data.i18n.paidContent.trialConfigured.replace('{seconds}', config.trialSeconds) : this.data.i18n.paidContent.trialUnavailable }));
    paidContent.fetchEntitlements((ok, entitlements) => this.setData({ entitlements, isVideoUnlocked: paidContent.isUnlocked(entitlements, this.spotId) }));
  },

  localized(item, key) {
    const suffix = this.data.locale === 'en' ? 'En' : this.data.locale === 'zh-TW' ? 'Tw' : '';
    return item && (item[key + suffix] || item[key]) || '';
  },

  onVisitorSectionTap(e) {
    const kind = e && e.currentTarget && e.currentTarget.dataset.kind;
    if (!this.data.visitorSections.some((section) => section.kind === kind)) return;
    wx.navigateTo({ url: '/pages/attraction/visitor-section?id=' + encodeURIComponent(this.spotId) + '&kind=' + encodeURIComponent(kind) });
  },
  onMapTap() {
    const map = this.data.visitorMap;
    if (map) return wx.previewImage({ urls: [map], fail: () => wx.showToast({ title: this.data.i18n.heritage.mapFailed, icon: 'none' }) });
    const url = this.data.visitorMapUrl;
    if (/^https:\/\//i.test(url)) return wx.setClipboardData({ data: url, success: () => wx.showToast({ title: this.data.i18n.heritage.mapLinkCopied, icon: 'none' }), fail: () => wx.showToast({ title: this.data.i18n.heritage.mapFailed, icon: 'none' }) });
    wx.showToast({ title: this.data.i18n.heritage.mapFailed, icon: 'none' });
  },
  onSourceTap() {
    if (/^https:\/\//i.test(this.data.visitorSource)) wx.setClipboardData({ data: this.data.visitorSource });
  },
  onRichTextTap(e) {
    const href = e && e.detail && e.detail.href;
    if (/^https:\/\//i.test(href)) wx.setClipboardData({ data: href });
  },
  onPointTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id && this.data.exhibits.some((point) => String(point.id) === String(id))) wx.navigateTo({ url: '/pages/audio/detail?attractionId=' + encodeURIComponent(this.spotId) + '&pointId=' + encodeURIComponent(id) });
  },
  onRouteTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/audio/route?attractionId=' + encodeURIComponent(this.spotId) + '&id=' + encodeURIComponent(id) });
  },
  onTrackTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/audio/detail?attractionId=' + encodeURIComponent(this.spotId) + '&trackId=' + encodeURIComponent(id) });
  },

  onShareAppMessage() {
    const spot = this.data.spot;
    const id = this.spotId || (spot && spot.id);
    if (!id) return buildShareCard('/pages/index/index');
    return {
      title: (spot && spot.shareTitle) || (spot ? spot.name + ' · ' : '') + this.data.i18n.commonSlogan,
      path: '/pages/attraction/detail?id=' + encodeURIComponent(id),
      imageUrl: spot ? (spot.shareImage || spot.image) : undefined
    };
  },

  onBack() {
    goBack();
  },

  onBackToDestinations() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onToggleHighlights() {
    this.setData({ showAllHighlights: !this.data.showAllHighlights });
  },

  onSectionTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || !this.data.detailSections.some((item) => item.id === id)) return;
    this.setData({ activeDetailSection: id });
    wx.pageScrollTo({ selector: '#section-' + id, duration: 320 });
  },

  onGuideTap(e) {
    this.setData({ guideIndex: Number(e.currentTarget.dataset.index) });
  },

  onVideoPlay() {
    if (this.data.isVideoUnlocked) return;
    if (!this.data.paidConfig.configured) {
      wx.createVideoContext('knowledge-video', this).pause();
      return wx.showToast({ title: this.data.i18n.paidContent.trialUnavailable, icon: 'none' });
    }
    if (this.data.trialEnded) wx.createVideoContext('knowledge-video', this).pause();
  },

  onVideoTimeUpdate(e) {
    if (this.data.isVideoUnlocked || this.data.trialEnded || !this.data.paidConfig.configured) return;
    if (Number(e.detail.currentTime || 0) >= this.data.paidConfig.trialSeconds) {
      wx.createVideoContext('knowledge-video', this).pause();
      this.setData({ trialEnded: true, showPurchaseModal: true });
    }
  },

  onVideoError() { wx.showToast({ title: this.data.i18n.networkError, icon: 'none' }); },

  onUnlock() {
    this.setData({ showPurchaseModal: true });
  },

  closePurchase() { this.setData({ showPurchaseModal: false }); },

  onPurchase(e) {
    if (this.data.purchaseLoading) return;
    const productType = e.currentTarget.dataset.product;
    const token = auth.getAccessToken();
    if (!token) return wx.switchTab({ url: '/pages/profile/profile' });
    this.setData({ purchaseLoading: true });
    paidContent.createOrder(productType, productType === 'attraction' ? this.spotId : '', (ok, data) => {
      this.setData({ purchaseLoading: false });
      if (data && data.pendingSimulation && data.order) {
        return this.setData({ pendingSimulationOrder: data.order });
      }
      if (!ok) return wx.showModal({ title: this.data.i18n.submitFailed, content: data.error || this.data.i18n.paidContent.payUnavailable, confirmText: this.data.i18n.know, showCancel: false });
      if (data && data.paymentStatus === 'pending') {
        this.setData({ showPurchaseModal: false, pendingSimulationOrder: null });
        this.loadPaidState();
        return wx.showToast({ title: this.data.i18n.paidContent.paymentPending, icon: 'none' });
      }
      this.setData({ showPurchaseModal: false, trialEnded: false, pendingSimulationOrder: null });
      this.loadPaidState();
      wx.showToast({ title: productType === 'membership' ? this.data.i18n.paidContent.memberUnlocked : this.data.i18n.paidContent.purchased, icon: 'success' });
    });
  },

  onSimulationPay(e) {
    const outcome = e.currentTarget.dataset.outcome;
    const order = this.data.pendingSimulationOrder;
    if (!order || this.data.simulationLoading) return;
    this.setData({ simulationLoading: true });
    paidContent.simulateOrderResult(order.id, outcome, (ok, data) => {
      this.setData({ simulationLoading: false });
      if (!ok) return wx.showModal({ title: this.data.i18n.submitFailed, content: (data && (data.error || data.message)) || this.data.i18n.paidContent.payUnavailable, confirmText: this.data.i18n.know, showCancel: false });
      if (outcome === 'failed') {
        this.setData({ pendingSimulationOrder: null });
        return wx.showToast({ title: this.data.i18n.paidContent.simulationFailed, icon: 'none' });
      }
      this.setData({ showPurchaseModal: false, trialEnded: false, pendingSimulationOrder: null });
      this.loadPaidState();
      wx.showToast({ title: order.productType === 'membership' ? this.data.i18n.paidContent.memberUnlocked : this.data.i18n.paidContent.purchased, icon: 'success' });
    });
  },

  onLiveBooking() { wx.navigateTo({ url: '/pages/live-booking/live-booking?attractionId=' + encodeURIComponent(this.spotId) }); },

  onRelatedTap(e) { const id = e.currentTarget.dataset.id; if (id) wx.redirectTo({ url: '/pages/attraction/detail?id=' + encodeURIComponent(id) }); },

  onConsult() {
    app.globalData.pendingLeadType = 'knowledge-base';
    wx.switchTab({ url: '/pages/customize/customize' });
  }
});
