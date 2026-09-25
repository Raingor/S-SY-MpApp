const content = require('../../data/content');
const i18n = require('../../utils/i18n');
const { goBack } = require('../../utils/navigation');

function localized(item, key, locale) {
  const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : '';
  return item && (item[key + suffix] || item[key]) || '';
}

Page({
  data: { locale: 'zh-CN', i18n: i18n.getMessages(), category: 'online', title: '', spotName: '', items: [], visibleItems: [], searchText: '', filter: 'all', demoData: false, loading: true, failed: false },
  onLoad(options) {
    this.attractionId = options && options.attractionId || '';
    this.category = options && options.category === 'expert' ? 'expert' : 'online';
    this.setData({ category: this.category });
    i18n.apply(this);
    this.loadItems();
  },
  onShow() { i18n.apply(this); this.localize(); },
  loadItems() {
    this.setData({ loading: true, failed: false });
    content.loadContent((data, state) => {
      const spot = content.getAttraction(this.attractionId, data);
      if (!spot) {
        this.setData({ loading: false, failed: true, items: [], visibleItems: [] });
        return;
      }
      this.spot = spot;
      const items = (spot.audioGuides || []).filter((item) => item && item.id && item.category === this.category && (item.isDemo === true || item.previewUrl) && item.status !== 'draft').map((item) => {
        const point = (spot.exhibits || []).find((row) => String(row.id) === String(item.exhibitId));
        return { ...item, pointId: point && point.id || '', displayTitle: localized(item, 'title', this.data.locale), displayDescription: localized(item, 'description', this.data.locale), displayImage: item.cover || (point && point.image) || spot.image || '', hasAudio: item.isDemo !== true && Boolean(item.previewUrl) };
      });
      this.setData({ items, demoData: items.some((item) => item.isDemo === true), loading: false, failed: false, spotName: localized(spot, 'name', this.data.locale) });
      this.localize();
    }, true);
  },
  localize() {
    if (!this.spot) return;
    const title = this.category === 'expert' ? this.data.i18n.heritage.expert : this.data.i18n.heritage.online;
    const items = (this.data.items || []).map((item) => ({ ...item, displayTitle: localized(item, 'title', this.data.locale), displayDescription: localized(item, 'description', this.data.locale) }));
    this.setData({ title, spotName: localized(this.spot, 'name', this.data.locale), items });
    this.applyFilter();
  },
  onSearchInput(e) { this.setData({ searchText: e.detail.value || '' }); this.applyFilter(); },
  onFilterTap(e) { this.setData({ filter: e.currentTarget.dataset.filter || 'all' }); this.applyFilter(); },
  applyFilter() {
    const query = String(this.data.searchText || '').trim().toLowerCase();
    const items = (this.data.items || []).filter((item) => {
      const matchesQuery = !query || `${item.displayTitle || ''} ${item.displayDescription || ''}`.toLowerCase().includes(query);
      const matchesFilter = this.data.filter !== 'audio' || item.hasAudio;
      return matchesQuery && matchesFilter;
    });
    this.setData({ visibleItems: items });
  },
  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    const pointId = e.currentTarget.dataset.pointId || '';
    const item = this.data.items.find((row) => String(row.id) === String(id));
    if (!item) return;
    const params = `attractionId=${encodeURIComponent(this.attractionId)}&category=${encodeURIComponent(this.category)}`;
    if (item.isDemo) return wx.navigateTo({ url: `/pages/audio/detail?${params}&trackId=${encodeURIComponent(item.id)}&demo=1` });
    wx.navigateTo({ url: `/pages/audio/detail?${params}&trackId=${encodeURIComponent(item.id)}${pointId ? `&pointId=${encodeURIComponent(pointId)}` : ''}` });
  },
  onBack() { goBack(); }
});
