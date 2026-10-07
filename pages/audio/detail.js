const content = require('../../data/content');
const i18n = require('../../utils/i18n');
const accessApi = require('../../utils/audio-access');
const paid = require('../../utils/paid-content');
const auth = require('../../utils/auth');
const { goBack } = require('../../utils/navigation');

function localized(item, key, locale) {
  const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : '';
  return item && (item[key + suffix] || item[key]) || '';
}
function duration(value) { const seconds = Number(value); return Number.isFinite(seconds) && seconds > 0 ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : ''; }

Page({
  data: {
    statusBarHeight: 20, locale: 'zh-CN', i18n: i18n.getMessages(), title: '', description: '', cover: '',
    track: null, point: null, pointTracks: [], access: null, accessError: false, accessLoading: false, unavailable: false,
    loading: true, playing: false, previewEnded: false, currentSeconds: 0, progressPercent: 0,
    fullPlayback: false, paidConfig: null, purchaseLoading: false, pendingOrder: null, simulation: false, demoMode: false, demoCategory: 'online'
  },
  onLoad(options) {
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: windowInfo.statusBarHeight || 20 });
    this.params = options || {};
    this.params.attractionId = this.params.attractionId || '';
    this.params.pointId = this.params.pointId || '';
    this.params.trackId = this.params.trackId || '';
    this.params.albumId = this.params.albumId || '';
    this.params.episodeId = this.params.episodeId || '';
    this.params.category = ['expert', 'route'].includes(this.params.category) ? this.params.category : 'online';
    this.loadData();
  },
  ensureAudioContext() {
    if (this.audio) return this.audio;
    this.audio = wx.createInnerAudioContext();
    this.audio.autoplay = false;
    this.audio.onTimeUpdate(() => {
      const seconds = Number(this.audio.currentTime) || 0;
      if (!this.data.fullPlayback && seconds >= (this.data.access ? this.data.access.previewSeconds : 60)) return this.stopPreview();
      const total = Number(this.data.track && this.data.track.durationSeconds) || 0;
      this.setData({ currentSeconds: Math.floor(seconds), progressPercent: total ? Math.min(100, seconds / total * 100) : 0 });
    });
    // 部分 Android 机型支持系统进度拖动：即使控件触发 seek，也不得超过试看边界。
    if (this.audio.onSeeking) this.audio.onSeeking(() => {
      if (!this.data.fullPlayback && this.audio.currentTime >= (this.data.access ? this.data.access.previewSeconds : 60)) this.stopPreview();
    });
    this.audio.onEnded(() => {
      if (this.data.playing && !this.data.fullPlayback) this.setData({ playing: false, previewEnded: true });
      else this.setData({ playing: false });
    });
    this.audio.onError(() => { this.audio.stop(); this.setData({ playing: false, accessError: true }); });
    return this.audio;
  },
  onShow() { i18n.apply(this); this.localize(); },
  onHide() {
    this._accessRequestId = (this._accessRequestId || 0) + 1;
    this.stop();
    this.setData({ access: null, accessLoading: false });
  },
  onUnload() {
    this._accessRequestId = (this._accessRequestId || 0) + 1;
    if (this.audio) { this.audio.stop(); this.audio.destroy(); }
  },
  stop() { if (this.audio) this.audio.stop(); this.setData({ playing: false, fullPlayback: false, currentSeconds: 0, progressPercent: 0 }); },
  stopPreview() {
    if (this.data.previewEnded) return;
    this.setData({ playing: false, fullPlayback: false, currentSeconds: 0, progressPercent: 0, previewEnded: true });
    if (this.audio) this.audio.stop();
    wx.showToast({ title: this.data.i18n.heritage.previewEnded, icon: 'none' });
  },
  onBack() { goBack(); },
  loadData() {
    this._accessRequestId = (this._accessRequestId || 0) + 1;
    this.stop();
    this.setData({ loading: true, track: null, point: null, access: null, unavailable: false, accessError: false, accessLoading: false, previewEnded: false, demoMode: false });
    content.loadContent((data, state) => {
      let track = null; let point = null; let pointTracks = []; let spot = null;
      if (this.params.albumId || this.params.episodeId) {
        if (this.params.albumId && this.params.episodeId && state && state.source === 'remote') {
          const album = content.getAudioAlbums(data).find((item) => String(item.id) === String(this.params.albumId));
          track = album && (album.episodes || []).find((item) => String(item.id) === String(this.params.episodeId) &&
            String(item.albumId) === String(album.id) && item.category === 'heritage' && !item.attractionId && item.previewUrl && item.isDemo !== true);
        }
      } else {
        spot = state && state.source === 'remote' && state.status === 'ready' ? content.getAttraction(this.params.attractionId, data) : null;
        point = spot && (spot.exhibits || []).find((item) => String(item.id) === String(this.params.pointId));
        if (spot && state && state.source === 'remote') {
          const belongsToSpot = (item) => String(item.attractionId) === String(spot.id) &&
            ['route', 'online', 'expert'].includes(item.category) && !item.albumId;
          pointTracks = point ? (spot.audioGuides || []).filter((item) => belongsToSpot(item) && String(item.exhibitId) === String(point.id) && item.previewUrl && item.isDemo !== true) : [];
          track = this.params.trackId
            ? (spot.audioGuides || []).find((item) => belongsToSpot(item) && String(item.id) === String(this.params.trackId) && (item.isDemo === true || item.previewUrl))
            : pointTracks[0] || null;
          if (track && this.params.pointId && String(track.exhibitId) !== String(this.params.pointId)) track = null;
          if (track && !point && track.exhibitId) point = (spot.exhibits || []).find((item) => String(item.id) === String(track.exhibitId)) || null;
        }
      }
      if (track && track.attractionId && !this.params.attractionId) this.params.attractionId = track.attractionId;
      this.spot = spot;
      const demoMode = Boolean(track && track.isDemo === true);
      this.setData({ track: track || null, point: point || null, pointTracks: pointTracks.map((item) => ({ ...item, displayTitle: localized(item, 'title', this.data.locale) })), loading: false, unavailable: !track || !track.id, demoMode, demoCategory: this.params.albumId ? 'heritage' : this.params.category });
      this.localize();
    }, true);
  },
  localize() {
    const { track, point, locale } = this.data;
    const location = point && point.location;
    const displayLocation = typeof location === 'string' ? location : [location && location.hall, location && location.floor].filter(Boolean).join(' · ');
    this.setData({
      title: localized(track && track.isDemo ? track : (point || track), track && track.isDemo ? 'title' : (point ? 'name' : 'title'), locale),
      description: localized(track && track.isDemo ? track : (point || track), 'description', locale),
      duration: duration(track && track.durationSeconds),
      pointTracks: (this.data.pointTracks || []).map((item) => ({ ...item, displayTitle: localized(item, 'title', locale) })),
      cover: (track && track.cover) || (point && point.image) || (this.spot && this.spot.image) || '',
      displayLocation
    });
  },
  onPointTrackTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || !this.data.pointTracks.some((item) => String(item.id) === String(id))) return;
    this._accessRequestId = (this._accessRequestId || 0) + 1;
    this.params.trackId = String(id);
    this.stop();
    this.setData({ track: this.data.pointTracks.find((item) => String(item.id) === String(id)), access: null, accessLoading: false, previewEnded: false });
  },
  refreshAccess(onReady) {
    const track = this.data.track;
    if (!track || !track.id || track.isDemo === true || this.data.accessLoading) return;
    const requestId = (this._accessRequestId || 0) + 1;
    this._accessRequestId = requestId;
    this.stop();
    // 点击时重新请求签名；不复用可能过期的完整播放 URL。
    this.setData({ access: null, accessError: false, accessLoading: true });
    accessApi.getAccess(track.id, (ok, result, status) => {
      if (requestId !== this._accessRequestId || !this.data.track || String(this.data.track.id) !== String(track.id)) return;
      if (!ok) {
        this.setData({ accessError: true, accessLoading: false, unavailable: status === 404, access: null });
        return;
      }
      this.setData({ access: result, accessLoading: false, unavailable: !result.previewUrl && !result.fullUrl });
      if (typeof onReady === 'function') onReady(result);
    });
  },
  playPreview() {
    if (!this.data.track || this.data.demoMode || !this.data.track.previewUrl) return;
    if (this.data.playing && !this.data.fullPlayback) { this.audio.pause(); return this.setData({ playing: false }); }
    this.refreshAccess((access) => {
      if (!access.previewUrl) return;
      this.stop();
      const audio = this.ensureAudioContext();
      audio.src = access.previewUrl;
      audio.play();
      this.setData({ playing: true, fullPlayback: false, previewEnded: false });
    });
  },
  playFull() {
    if (!this.data.track || this.data.demoMode || !this.data.track.previewUrl || this.data.track.unlockMode === 'locked') return;
    if (this.data.playing && this.data.fullPlayback) { this.audio.pause(); return this.setData({ playing: false }); }
    this.refreshAccess((access) => {
      if (!access.fullUrl) return this.onUnlock();
      this.stop();
      const audio = this.ensureAudioContext();
      audio.src = access.fullUrl;
      audio.play();
      this.setData({ playing: true, fullPlayback: true });
    });
  },
  onUnlock() {
    const access = this.data.access;
    if (!access || !['attraction', 'membership'].includes(access.mode)) return wx.showToast({ title: this.data.i18n.heritage.unlockRequired, icon: 'none' });
    if (access.mode === 'attraction' && !this.params.attractionId) return wx.showToast({ title: this.data.i18n.heritage.unlockRequired, icon: 'none' });
    if (!auth.getAccessToken()) return wx.switchTab({ url: '/pages/profile/profile' });
    auth.ensurePhoneBound((ready) => {
      if (!ready) return;
      paid.fetchConfig((ok, config) => {
        const product = access.mode === 'attraction' ? 'attraction' : 'membership';
        if (!ok || !config.products || !config.products[product]) return wx.showToast({ title: this.data.i18n.paidContent.payUnavailable, icon: 'none' });
        this.setData({ paidConfig: config, simulation: Boolean(config.simulation) });
        wx.showModal({
          title: this.data.i18n.heritage.unlockRequired,
          content: `${product === 'attraction' ? this.data.i18n.paidContent.buySpot : this.data.i18n.paidContent.member} ¥${config.products[product].price}`,
          success: (choice) => { if (choice.confirm) this.createOrder(product); }
        });
      });
    });
  },
  createOrder(product) {
    if (this.data.purchaseLoading) return;
    this.setData({ purchaseLoading: true });
    paid.createOrder(product, product === 'attraction' ? this.params.attractionId : '', (ok, result) => {
      this.setData({ purchaseLoading: false });
      if (result && result.pendingSimulation && result.order) return this.setData({ pendingOrder: result.order });
      if (!ok) return wx.showToast({ title: this.data.i18n.submitFailed, icon: 'none' });
      this.refreshAccess();
      if (result && result.paymentStatus === 'pending') wx.showToast({ title: this.data.i18n.paidContent.paymentPending, icon: 'none' });
    });
  },
  onSimulationPay(e) {
    if (!this.data.simulation || !this.data.pendingOrder || this.data.purchaseLoading) return;
    this.setData({ purchaseLoading: true });
    paid.simulateOrderResult(this.data.pendingOrder.id, e.currentTarget.dataset.outcome, (ok) => {
      this.setData({ purchaseLoading: false, pendingOrder: null });
      if (!ok) return wx.showToast({ title: this.data.i18n.submitFailed, icon: 'none' });
      this.refreshAccess();
    });
  }
});
