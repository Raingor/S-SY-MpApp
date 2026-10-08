// 文史知识库：已发布景点与真实音频专辑；离线镜像仅用于景点，并明确标示。
const app = getApp();
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');
const { goBack } = require('../../utils/navigation');
const i18n = require('../../utils/i18n');

function translated(item, key, locale) {
  const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : '';
  return (item && (item[key + suffix] || item[key])) || '';
}

function displaySpots(spots, query, category, locale, audioOnly) {
  const word = String(query || '').trim().toLowerCase();
  return (spots || []).filter((spot) => {
    if (!spot || spot.status !== 'published') return false;
    if (audioOnly && !(spot.audioGuides || []).some((track) => track.id && track.previewUrl)) return false;
    if (category && spot.city !== category) return false;
    if (!word) return true;
    return [translated(spot, 'name', locale), spot.name, spot.en, translated(spot, 'summary', locale), spot.category, spot.city,
      ...(spot.highlights || []).map((h) => translated(h, 'name', locale))].filter(Boolean).join(' ').toLowerCase().includes(word);
  }).map((spot) => ({ ...spot, displayName: translated(spot, 'name', locale), displaySummary: translated(spot, 'summary', locale) }));
}

Page({
  data: {
    statusBarHeight: 20, menuRightSpace: 112, locale: 'zh-CN', i18n: i18n.getMessages(), activePanel: 0,
    panelTabs: [], cities: [], sampleTrips: [], allHotSpots: [], hotSpots: [],
    albums: [], visibleAlbums: [], searchQuery: '', categoryId: '', audioOnly: false,
    loading: true, contentError: false, offline: false,
    citiesExpanded: false, visibleFilterCities: [], canExpandCities: false
  },
  onShareAppMessage() { return buildShareCard('/pages/knowledge/knowledge'); },
  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    const windowWidth = sys.windowWidth || (wx.getSystemInfoSync && wx.getSystemInfoSync().windowWidth) || 375;
    const menuRightSpace = menu ? Math.max(88, windowWidth - menu.left + 12) : 112;
    this.setData({ statusBarHeight: sys.statusBarHeight || 20, menuRightSpace, activePanel: options && options.panel === '1' ? 1 : 0, audioOnly: Boolean(options && options.audioOnly === '1') });
    this.applyLocale();
    this.refresh();
  },
  onShow() {
    if (this._hasShown) this.refresh();
    this._hasShown = true;
    this.applyLocale();
  },
  refresh() {
    this.setData({ loading: true, allHotSpots: [], hotSpots: [], albums: [], visibleAlbums: [] });
    content.loadContent((data, state) => {
      // Website public contract: only status='published' attractions are visible.
      const spots = content.getAttractions(data).filter((spot) => spot && spot.status === 'published');
      const albums = state && state.source === 'remote' ? content.getAudioAlbums(data) : [];
      this.setData({
        cities: content.getCities(data), sampleTrips: content.getReferenceList(data),
        allHotSpots: spots, albums,
        loading: false, contentError: state && state.status === 'contract-error',
        offline: state && state.reason === 'offline'
      });
      this.filterItems();
    }, true);
  },
  applyLocale() {
    const copy = i18n.apply(this);
    this.setData({ panelTabs: [copy.heritage.sights, copy.heritage.history] });
    this.filterItems();
  },
  filterItems() {
    this.updateCityFilters();
    const { allHotSpots, albums, searchQuery, categoryId, locale, audioOnly } = this.data;
    this.setData({
      hotSpots: displaySpots(allHotSpots, searchQuery, categoryId, locale, audioOnly),
      visibleAlbums: (albums || []).map((album) => ({ ...album,
        displayTitle: translated(album, 'title', locale),
        displayDescription: translated(album, 'description', locale),
        durationMinutes: Math.ceil((album.episodes || []).reduce((sum, episode) => sum + (Number(episode.durationSeconds) || 0), 0) / 60)
      })).filter((album) => !searchQuery || [album.title, album.displayTitle, album.displayDescription, ...(album.episodes || []).map((episode) => translated(episode, 'title', locale))].join(' ').toLowerCase().includes(searchQuery.trim().toLowerCase()))
    });
  },
  updateCityFilters() {
    const { cities, categoryId, citiesExpanded } = this.data;
    const limit = 5;
    const visibleFilterCities = citiesExpanded ? cities.slice() : cities.slice(0, limit);
    const selected = cities.find((city) => city.id === categoryId);
    if (!citiesExpanded && selected && !visibleFilterCities.some((city) => city.id === categoryId)) {
      visibleFilterCities[visibleFilterCities.length - 1] = selected;
    }
    this.setData({ visibleFilterCities, canExpandCities: cities.length > limit });
  },
  onToggleCities() { this.setData({ citiesExpanded: !this.data.citiesExpanded }); this.updateCityFilters(); },
  onPanelTap(e) { this.setData({ activePanel: Number(e.currentTarget.dataset.index) || 0, searchQuery: '', categoryId: '', citiesExpanded: false }); this.filterItems(); },
  onCategoryTap(e) { this.setData({ categoryId: e.currentTarget.dataset.id === this.data.categoryId ? '' : e.currentTarget.dataset.id }); this.filterItems(); },
  onSearchInput(e) { this.setData({ searchQuery: e.detail.value || '' }); this.filterItems(); },
  onSearchConfirm() {
    if (this.data.activePanel !== 0 || !this.data.hotSpots.length) return;
    this.openSpot(this.data.hotSpots[0].id);
  },
  openSpot(id) {
    if (id && this.data.hotSpots.some((spot) => spot.id === id && spot.status === 'published')) {
      wx.navigateTo({ url: '/pages/attraction/detail?id=' + encodeURIComponent(id) });
    }
  },
  onHotSpotTap(e) { this.openSpot(e.currentTarget.dataset.id); },
  onAlbumTap(e) {
    const id = e.currentTarget.dataset.id;
    const album = this.data.visibleAlbums.find((item) => String(item.id) === String(id));
    if (!this.data.loading && album) {
      // Keep the cover already rendered in the list available while the detail page refreshes content.
      app.globalData.pendingAudioAlbum = { id: String(album.id), album };
      wx.navigateTo({ url: '/pages/audio/album?id=' + encodeURIComponent(id) });
    }
  },
  onBack() { goBack(); },
  onCityTap(e) { wx.navigateTo({ url: '/pages/city/index?id=' + encodeURIComponent(e.currentTarget.dataset.id) }); },
  onTripTap(e) { wx.navigateTo({ url: '/pages/itinerary/detail?id=' + encodeURIComponent(e.currentTarget.dataset.id) }); },
  onMoreTrips() { wx.navigateTo({ url: '/pages/itinerary/index' }); },
  onConsult() { app.globalData.pendingLeadType = 'knowledge-base'; wx.switchTab({ url: '/pages/customize/customize' }); }
});
