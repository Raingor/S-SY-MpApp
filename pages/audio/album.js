const app = getApp();
const content = require('../../data/content');
const i18n = require('../../utils/i18n');
const { goBack } = require('../../utils/navigation');
function tr(item, key, locale) { const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : ''; return item && (item[key + suffix] || item[key]) || ''; }
function duration(value) { const seconds = Number(value); return Number.isFinite(seconds) && seconds > 0 ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : ''; }
Page({
  data: { locale: 'zh-CN', i18n: i18n.getMessages(), album: null, episodes: [], loading: true, failed: false, statusBarHeight: 20 },
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
    this.setData({
      album: { ...album, displayTitle: tr(album, 'title', locale), displayDescription: tr(album, 'description', locale) },
      totalDuration: duration((album.episodes || []).reduce((sum, item) => sum + (Number(item.durationSeconds) || 0), 0)),
      episodes: (album.episodes || []).map((item) => ({ ...item, displayTitle: tr(item, 'title', locale), displayDescription: tr(item, 'description', locale), displayDuration: duration(item.durationSeconds) }))
    });
  },
  onEpisodeTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!this.data.loading && this.data.episodes.some((item) => String(item.id) === String(id))) {
      wx.navigateTo({ url: `/pages/audio/detail?albumId=${encodeURIComponent(this.albumId)}&episodeId=${encodeURIComponent(id)}` });
    }
  },
  onBack() { goBack(); }
});
