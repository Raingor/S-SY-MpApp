const content = require('../../data/content');
const i18n = require('../../utils/i18n');
const { goBack } = require('../../utils/navigation');
function tr(item, key, locale) { const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : ''; return item && (item[key + suffix] || item[key]) || ''; }
Page({
  data: { locale: 'zh-CN', i18n: i18n.getMessages(), title: '', points: [], loading: true, failed: false },
  onLoad(options) { this.attractionId = options && options.attractionId || ''; this.routeId = options && options.id || ''; this.refresh(); },
  onShow() { i18n.apply(this); this.localize(); },
  refresh() {
    this.setData({ loading: true, points: [], failed: false });
    content.loadContent((data, state) => {
      const spot = content.getAttraction(this.attractionId, data);
      this.spot = spot;
      this.route = spot && (spot.routes || []).find((item) => String(item.id) === String(this.routeId));
      this.setData({ loading: false, failed: state && state.status === 'contract-error' });
      this.localize();
    }, true);
  },
  localize() {
    const { spot, route } = this;
    if (!spot || !route) return this.setData({ title: '', points: [] });
    const ids = Array.isArray(route.pointIds) ? route.pointIds : [];
    const points = ids.map((id) => (spot.exhibits || []).find((point) => String(point.id) === String(id))).filter(Boolean);
    this.setData({ title: tr(route, 'title', this.data.locale), points: points.map((point) => ({ ...point, displayName: tr(point, 'name', this.data.locale), displayDescription: tr(point, 'description', this.data.locale) })) });
  },
  onPointTap(e) { const id = e.currentTarget.dataset.id; if (id) wx.navigateTo({ url: `/pages/audio/detail?attractionId=${encodeURIComponent(this.attractionId)}&pointId=${encodeURIComponent(id)}` }); },
  onBack() { goBack(); }
});
