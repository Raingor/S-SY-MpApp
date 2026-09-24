const content = require('../../data/content');
const i18n = require('../../utils/i18n');
const { goBack } = require('../../utils/navigation');
function tr(item, key, locale) { const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : ''; return item && (item[key + suffix] || item[key]) || ''; }
function duration(value) { const seconds = Number(value); return Number.isFinite(seconds) && seconds > 0 ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : ''; }
Page({
  data: { locale: 'zh-CN', i18n: i18n.getMessages(), album: null, episodes: [], loading: true, failed: false },
  onLoad(options) { this.albumId = (options && options.id) || ''; this.refresh(); },
  onShow() { i18n.apply(this); this.localize(); },
  refresh() {
    this.setData({ loading: true, album: null, episodes: [], failed: false });
    content.loadContent((data, state) => {
      const album = state && state.source === 'remote' && content.getAudioAlbums(data).find((item) => String(item.id) === String(this.albumId));
      this.setData({ album: album || null, loading: false, failed: state && state.status === 'contract-error' });
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
    if (id) wx.navigateTo({ url: `/pages/audio/detail?albumId=${encodeURIComponent(this.albumId)}&episodeId=${encodeURIComponent(id)}` });
  },
  onBack() { goBack(); }
});
