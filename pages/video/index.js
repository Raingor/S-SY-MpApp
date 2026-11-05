const content = require('../../data/content');
const i18n = require('../../utils/i18n');
const { goBack } = require('../../utils/navigation');
const { buildShareCard } = require('../../utils/share');

Page({
  data: { i18n: i18n.getMessages(), locale: 'zh-CN', statusBarHeight: 20, films: [], total: 0, query: '', loading: true, failed: false },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: info.statusBarHeight || 20 });
  },
  onShow() {
    i18n.apply(this);
    this.renderFilms();
    this.refresh();
  },
  refresh() {
    const requestId = this._loadId = (this._loadId || 0) + 1;
    this.setData({ loading: true, failed: false });
    content.loadContent((data, state) => {
      if (requestId !== this._loadId) return;
      const ready = state && state.source === 'remote' && state.status === 'ready';
      this._content = ready ? data : null;
      this.setData({ loading: false, failed: !ready });
      this.renderFilms();
    }, true);
  },
  renderFilms() {
    const films = this._content ? content.getHumanitiesFilms(this._content, this.data.locale) : [];
    const query = this.data.query.trim().toLowerCase();
    this.setData({ total: films.length, films: films.filter((film) => !query || (film.displayTitle + ' ' + film.displayDescription).toLowerCase().includes(query)) });
  },
  onSearch(event) { this.setData({ query: event.detail.value }); this.renderFilms(); },
  onFilmTap(event) {
    const id = event.currentTarget.dataset.id;
    if (!this.data.films.some((film) => String(film.id) === String(id))) return;
    wx.navigateTo({ url: '/pages/video/detail?id=' + encodeURIComponent(id) });
  },
  onBack() { goBack('/pages/index/index'); },
  onUnload() { this._loadId = (this._loadId || 0) + 1; },
  onShareAppMessage() { return buildShareCard('/pages/video/index', this); }
});
