const content = require('../../data/content');
const i18n = require('../../utils/i18n');
const { goBack } = require('../../utils/navigation');

function localized(item, key, locale) {
  const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : '';
  return item && (item[key + suffix] || item[key]) || '';
}

Page({
  data: { locale: 'zh-CN', i18n: i18n.getMessages(), title: '', description: '', durationLabel: '', coverImage: '', mapImage: '', mapUrl: '', points: [], isDemo: false, loading: true, failed: false },
  onLoad(options) { this.attractionId = options && options.attractionId || ''; this.routeId = options && options.id || ''; this.refresh(); },
  onShow() { i18n.apply(this); this.localize(); },
  refresh() {
    this.setData({ loading: true, points: [], failed: false });
    content.loadContent((data, state) => {
      const spot = content.getAttraction(this.attractionId, data);
      this.spot = spot;
      if (!spot) {
        this.route = null;
        this.setData({ loading: false, failed: Boolean(state && state.status === 'contract-error') });
        return this.localize();
      }
      this.route = (spot.routes || []).find((item) => String(item.id) === String(this.routeId)) || null;
      this.setData({ loading: false, failed: Boolean(state && state.status === 'contract-error') });
      this.localize();
    }, true);
  },
  localize() {
    const { spot, route } = this;
    if (!spot || !route) return this.setData({ title: '', description: '', durationLabel: '', points: [] });
    const allPoints = spot.exhibits || [];
    const pointIds = Array.isArray(route.pointIds) ? route.pointIds : [];
    const points = pointIds.map((id) => allPoints.find((point) => String(point.id) === String(id))).filter(Boolean);
    this.setData({
      title: localized(route, 'title', this.data.locale),
      description: localized(route, 'description', this.data.locale),
      durationLabel: localized(route, 'durationLabel', this.data.locale) || '',
      coverImage: route.image || spot.image || '',
      mapImage: route.mapImage || (spot.visitorInfo && spot.visitorInfo.mapImage) || (spot.guide && spot.guide.mapImage) || '',
      mapUrl: route.mapUrl || (spot.visitorInfo && spot.visitorInfo.mapUrl) || (spot.guide && spot.guide.mapUrl) || '',
      isDemo: Boolean(route.isDemo),
      points: points.map((point) => ({ ...point, displayName: localized(point, 'name', this.data.locale), displayDescription: localized(point, 'description', this.data.locale), displayLocation: typeof point.location === 'string' ? point.location : [point.location && point.location.hall, point.location && point.location.floor].filter(Boolean).join(' · ') }))
    });
  },
  onPointTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const track = (this.spot && this.spot.audioGuides || []).find((item) => item.category === 'route' && String(item.routeId) === String(this.routeId) && String(item.exhibitId) === String(id) && (item.isDemo === true || item.previewUrl));
    const trackParam = track ? `&trackId=${encodeURIComponent(track.id)}` : '';
    wx.navigateTo({ url: `/pages/audio/detail?attractionId=${encodeURIComponent(this.attractionId)}&pointId=${encodeURIComponent(id)}&category=route${trackParam}` });
  },
  onMapTap() {
    if (this.data.mapUrl && /^https:\/\//i.test(this.data.mapUrl)) return wx.setClipboardData({ data: this.data.mapUrl });
    wx.pageScrollTo({ selector: '#route-map', duration: 260 });
    if (this.data.isDemo) wx.showToast({ title: this.data.i18n.heritage.routeOrderMap, icon: 'none' });
  },
  onBack() { goBack(); }
});
