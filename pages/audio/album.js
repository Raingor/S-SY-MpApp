const app = getApp();
const content = require('../../data/content');
const i18n = require('../../utils/i18n');
const { goBack } = require('../../utils/navigation');
function tr(item, key, locale) { const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : ''; return item && (item[key + suffix] || item[key]) || ''; }
function duration(value) { const seconds = Number(value); return Number.isFinite(seconds) && seconds > 0 ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : ''; }
function accessLabel(item, heritage, locale) {
  if (item.unlockMode === 'free') return heritage.freeBadge;
  if (item.unlockMode === 'locked') return heritage.previewOnlyShort;
  const seconds = Math.min(60, Math.max(1, Number(item.previewSeconds) || 60));
  return locale === 'en' ? `${heritage.preview} · ${seconds}${heritage.secondsUnit}` : `${heritage.preview} ${seconds}${heritage.secondsUnit}`;
}
Page({
  data: { locale: 'zh-CN', i18n: i18n.getMessages(), album: null, episodes: [], visibleEpisodes: [], firstEpisode: null, searching: false, searchValue: '', activeTab: 'episodes', scrollIntoView: '', loading: true, failed: false, statusBarHeight: 20 },
  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.albumId = (options && options.id) || '';
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    const pending = app.globalData.pendingAudioAlbum;
    if (pending && pending.id === String(this.albumId) && pending.album) {
      this.setData({ album: pending.album, episodes: pending.album.episodes || [] });
      this.localize();
      app.globalData.pendingAudioAlbum = null;
    }
    this.refresh();
  },
  onShow() {
    i18n.apply(this);
    if (this._hasShown) this.refresh();
    this._hasShown = true;
    this.localize();
  },
  refresh() {
    this.setData({ loading: true, failed: false });
    content.loadContent((data, state) => {
      const verifiedResponse = Boolean(state && state.source === 'remote' && state.status === 'ready');
      const album = verifiedResponse
        ? content.getAudioAlbums(data).find((item) => String(item.id) === String(this.albumId)) || null
        : this.data.album;
      this.setData({ album, episodes: album ? album.episodes : [], loading: false, failed: !verifiedResponse });
      this.localize();
    }, true);
  },
  localize() {
    if (!this.data.album) return;
    const { album, locale } = this.data;
    const author = tr(album, 'author', locale) || tr(album, 'artist', locale) || tr(album, 'narrator', locale) || album.author || album.artist || album.narrator || '';
    const episodes = (album.episodes || []).map((item, index) => ({ ...item, episodeIndex: index + 1, displayTitle: tr(item, 'title', locale), displayDescription: tr(item, 'description', locale), displayDuration: duration(item.durationSeconds), accessLabel: accessLabel(item, this.data.i18n.heritage, locale) }));
    this.setData({
      album: { ...album, displayTitle: tr(album, 'title', locale), displayDescription: tr(album, 'description', locale), displayAuthor: author, displayTags: Array.isArray(album.tags) ? album.tags.filter((tag) => typeof tag === 'string' && tag.trim()) : [] },
      totalDuration: duration(episodes.reduce((sum, item) => sum + (Number(item.durationSeconds) || 0), 0)),
      episodes,
      firstEpisode: episodes[0] || null,
      visibleEpisodes: this.filterEpisodes(episodes, this.data.searchValue)
    });
  },
  filterEpisodes(episodes, value) {
    const query = String(value || '').trim().toLocaleLowerCase();
    if (!query) return episodes;
    return episodes.filter((item) => `${item.displayTitle || ''} ${item.displayDescription || ''}`.toLocaleLowerCase().includes(query));
  },
  onToggleSearch() {
    const searching = !this.data.searching;
    this.setData({ searching, searchValue: '', visibleEpisodes: this.data.episodes });
  },
  onSearchInput(e) {
    const searchValue = e.detail.value || '';
    this.setData({ searchValue, visibleEpisodes: this.filterEpisodes(this.data.episodes, searchValue) });
  },
  onAlbumTabTap(e) {
    const section = e.currentTarget.dataset.section;
    if (!['intro', 'episodes'].includes(section)) return;
    this.setData({ activeTab: section, scrollIntoView: section === 'intro' ? 'album-intro' : 'episode-list' });
  },
  onStartAlbum() {
    const episode = this.data.firstEpisode;
    if (!episode || this.data.loading) return;
    wx.navigateTo({ url: `/pages/audio/detail?albumId=${encodeURIComponent(this.albumId)}&episodeId=${encodeURIComponent(episode.id)}&autoplay=1` });
  },
  onEpisodeTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!this.data.loading && this.data.episodes.some((item) => String(item.id) === String(id))) {
      wx.navigateTo({ url: `/pages/audio/detail?albumId=${encodeURIComponent(this.albumId)}&episodeId=${encodeURIComponent(id)}` });
    }
  },
  onBack() { goBack(); }
});
