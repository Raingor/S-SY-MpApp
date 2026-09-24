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
    locale: 'zh-CN', i18n: i18n.getMessages(), title: '', description: '', cover: '',
    track: null, point: null, pointTracks: [], access: null, accessError: false, unavailable: false,
    loading: true, playing: false, previewEnded: false, currentSeconds: 0,
    fullPlayback: false, paidConfig: null, purchaseLoading: false, pendingOrder: null, simulation: false
  },
  onLoad(options) {
    this.params = options || {};
    this.params.attractionId = this.params.attractionId || '';
    this.params.pointId = this.params.pointId || '';
    this.params.trackId = this.params.trackId || '';
    this.params.albumId = this.params.albumId || '';
    this.params.episodeId = this.params.episodeId || '';
    this.audio = wx.createInnerAudioContext();
    this.audio.autoplay = false;
    this.audio.onTimeUpdate(() => {
      const seconds = Number(this.audio.currentTime) || 0;
      if (!this.data.fullPlayback && seconds >= (this.data.access ? this.data.access.previewSeconds : 60)) return this.stopPreview();
      this.setData({ currentSeconds: Math.floor(seconds) });
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
    this.loadData();
  },
  onShow() { i18n.apply(this); this.localize(); if (this.data.track) this.refreshAccess(); },
  onHide() { this.stop(); },
  onUnload() { if (this.audio) { this.audio.stop(); this.audio.destroy(); } },
  stop() { if (this.audio) this.audio.stop(); this.setData({ playing: false, fullPlayback: false, currentSeconds: 0 }); },
  stopPreview() {
    if (this.data.previewEnded) return;
    this.setData({ playing: false, fullPlayback: false, currentSeconds: 0, previewEnded: true });
    if (this.audio) this.audio.stop();
    wx.showToast({ title: this.data.i18n.heritage.previewEnded, icon: 'none' });
  },
  onBack() { goBack(); },
  loadData() {
    this.stop();
    this.setData({ loading: true, track: null, point: null, access: null, unavailable: false, accessError: false, previewEnded: false });
    content.loadContent((data, state) => {
      let track = null; let point = null; let pointTracks = [];
      if (state && state.source === 'remote') {
        if (this.params.albumId && this.params.episodeId) {
          const album = content.getAudioAlbums(data).find((item) => String(item.id) === String(this.params.albumId));
          track = album && (album.episodes || []).find((item) => String(item.id) === String(this.params.episodeId) && item.previewUrl);
        } else {
          const spot = content.getAttraction(this.params.attractionId, data);
          point = spot && (spot.exhibits || []).find((item) => String(item.id) === String(this.params.pointId));
          pointTracks = point ? (spot.audioGuides || []).filter((item) => String(item.exhibitId) === String(point.id) && item.previewUrl) : [];
          track = this.params.trackId
            ? spot && (spot.audioGuides || []).find((item) => String(item.id) === String(this.params.trackId) && item.previewUrl)
            : pointTracks[0] || null;
          if (track && this.params.pointId && String(track.exhibitId) !== String(this.params.pointId)) track = null;
        }
      }
      if (track && track.attractionId && !this.params.attractionId) this.params.attractionId = track.attractionId;
      this.setData({ track: track || null, point: point || null, pointTracks: pointTracks.map((item) => ({ ...item, displayTitle: localized(item, 'title', this.data.locale) })), loading: false, unavailable: !track || !track.id });
      this.localize();
      if (track && track.id) this.refreshAccess();
    }, true);
  },
  localize() {
    const { track, point, locale } = this.data;
    this.setData({
      title: localized(point || track, point ? 'name' : 'title', locale),
      description: localized(point || track, 'description', locale),
      duration: duration(track && track.durationSeconds),
      pointTracks: (this.data.pointTracks || []).map((item) => ({ ...item, displayTitle: localized(item, 'title', locale) })),
      cover: (track && track.cover) || (point && point.image) || ''
    });
  },
  onPointTrackTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || !this.data.pointTracks.some((item) => String(item.id) === String(id))) return;
    this.params.trackId = String(id);
    this.setData({ track: this.data.pointTracks.find((item) => String(item.id) === String(id)), previewEnded: false });
    this.refreshAccess();
  },
  refreshAccess() {
    const track = this.data.track;
    if (!track || !track.id) return;
    this.stop();
    // 默认拒绝完整播放；授权接口返回新签名后才启用，绝不沿用过期 URL。
    this.setData({ access: null, accessError: false });
    accessApi.getAccess(track.id, (ok, result, status) => {
      if (!this.data.track || String(this.data.track.id) !== String(track.id)) return;
      if (!ok) {
        this.setData({ accessError: true, unavailable: status === 404, access: null });
        return;
      }
      this.setData({ access: result, unavailable: !result.previewUrl && !result.fullUrl });
    });
  },
  playPreview() {
    const access = this.data.access;
    if (!access || !access.previewUrl) return;
    if (this.data.playing && !this.data.fullPlayback) { this.audio.pause(); return this.setData({ playing: false }); }
    this.stop();
    this.audio.src = access.previewUrl;
    this.audio.play();
    this.setData({ playing: true, fullPlayback: false, previewEnded: false });
  },
  playFull() {
    // access.fullUrl 仅可由服务端核验商品规则后发放，订单结果本身不改变此状态。
    const access = this.data.access;
    if (!access || !access.fullUrl) return this.onUnlock();
    if (this.data.playing && this.data.fullPlayback) { this.audio.pause(); return this.setData({ playing: false }); }
    this.stop(); this.audio.src = access.fullUrl; this.audio.play(); this.setData({ playing: true, fullPlayback: true });
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
