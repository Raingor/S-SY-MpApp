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
function formatTime(value) { const seconds = Math.max(0, Math.floor(Number(value) || 0)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
function fullActionText(track, access, messages) {
  const heritage = messages && messages.heritage || {};
  const paidContent = messages && messages.paidContent || {};
  const mode = access && access.mode || track && track.unlockMode;
  if (access && access.access === 'full') return mode === 'free' ? heritage.freeFull || heritage.full || '' : heritage.full || '';
  if (mode === 'membership') return paidContent.member || heritage.unlockRequired || '';
  if (mode === 'attraction') return paidContent.buySpot || heritage.unlockRequired || '';
  if (mode === 'free') return heritage.freeFull || heritage.full || '';
  return heritage.unlockRequired || '';
}

Page({
  data: {
    statusBarHeight: 20, locale: 'zh-CN', i18n: i18n.getMessages(), title: '', description: '', cover: '',
    track: null, point: null, pointTracks: [], access: null, accessError: false, accessLoading: false, unavailable: false,
    loading: true, playing: false, previewEnded: false, currentSeconds: 0, currentTime: '0:00', remainingTime: '0:00', durationSeconds: 0, progressPercent: 0, playbackRate: 1,
    fullPlayback: false, fullActionText: '', paidConfig: null, purchaseLoading: false, pendingOrder: null, simulation: false, demoMode: false, demoCategory: 'online',
    showUnlockPaywall: false, paywallLoading: false, unlockOptions: []
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
    this.autoPlayRequested = this.params.autoplay === '1';
    this.params.category = ['expert', 'route'].includes(this.params.category) ? this.params.category : 'online';
    this.loadData();
  },
  ensureAudioContext() {
    if (this.audio) return this.audio;
    this.audio = wx.createInnerAudioContext();
    this.audio.autoplay = false;
    this.audio.playbackRate = this.data.playbackRate;
    this.audio.onTimeUpdate(() => {
      const seconds = Number(this.audio.currentTime) || 0;
      const total = Number(this.data.track && this.data.track.durationSeconds) || 0;
      this.setData({ currentSeconds: Math.floor(seconds), currentTime: formatTime(seconds), remainingTime: formatTime(Math.max(0, total - seconds)), progressPercent: total ? Math.min(100, seconds / total * 100) : 0 });
    });
    this.audio.onEnded(() => {
      // 试听音源可能略短于 60 秒；自然结束后保留剩余计时，仍在试听额度到期时提示。
      this.setData({ playing: false });
    });
    this.audio.onError(() => { this._pausePreviewTimer(); this.audio.stop(); this.setData({ playing: false, accessError: true }); });
    return this.audio;
  },
  _clearPreviewTimer() {
    if (this._previewTimer) clearTimeout(this._previewTimer);
    this._previewTimer = null;
    this._previewTimerStartedAt = 0;
  },
  _previewLimitMs() {
    const seconds = Math.min(60, Math.max(1, Number(this.data.access && this.data.access.previewSeconds) || Number(this.data.track && this.data.track.previewSeconds) || 60));
    return seconds * 1000;
  },
  _startPreviewTimer(reset) {
    this._clearPreviewTimer();
    if (reset || !Number.isFinite(this._previewRemainingMs) || this._previewRemainingMs <= 0) this._previewRemainingMs = this._previewLimitMs();
    this._previewTimerStartedAt = Date.now();
    this._previewTimer = setTimeout(() => this.stopPreview(), this._previewRemainingMs);
  },
  _pausePreviewTimer() {
    if (this._previewTimer && this._previewTimerStartedAt) {
      this._previewRemainingMs = Math.max(0, this._previewRemainingMs - (Date.now() - this._previewTimerStartedAt));
    }
    this._clearPreviewTimer();
  },
  _chargePreviewSeek(targetSeconds) {
    if (this.data.fullPlayback || !this.data.access) return false;
    const audioSeconds = Number(this.audio && this.audio.currentTime);
    const currentSeconds = Number.isFinite(audioSeconds) ? audioSeconds : Number(this.data.currentSeconds) || 0;
    const skippedSeconds = Math.max(0, Number(targetSeconds) - currentSeconds);
    if (!skippedSeconds) return false;
    const wasPlaying = this.data.playing;
    if (wasPlaying) this._pausePreviewTimer();
    if (!Number.isFinite(this._previewRemainingMs)) this._previewRemainingMs = this._previewLimitMs();
    const rate = Math.max(1, Number(this.data.playbackRate) || 1);
    this._previewRemainingMs = Math.max(0, this._previewRemainingMs - skippedSeconds / rate * 1000);
    if (this._previewRemainingMs <= 0) {
      this.stopPreview();
      return true;
    }
    if (wasPlaying) this._startPreviewTimer(false);
    return false;
  },
  onShow() {
    i18n.apply(this);
    if (this._hasShown) this.loadData();
    else this.localize();
    this._hasShown = true;
  },
  onHide() {
    this._accessRequestId = (this._accessRequestId || 0) + 1;
    this._pausePreviewTimer();
    this.stop();
    this.setData({ access: null, accessLoading: false, showUnlockPaywall: false });
  },
  onUnload() {
    this._accessRequestId = (this._accessRequestId || 0) + 1;
    this._clearPreviewTimer();
    if (this.audio) { this.audio.stop(); this.audio.destroy(); }
  },
  stop(preservePreviewTime) { this._clearPreviewTimer(); if (!preservePreviewTime) this._previewRemainingMs = null; if (this.audio) this.audio.stop(); this.setData({ playing: false, fullPlayback: false, currentSeconds: 0, currentTime: '0:00', remainingTime: formatTime(this.data.durationSeconds), progressPercent: 0 }); },
  stopPreview() {
    if (this.data.previewEnded) return;
    this._clearPreviewTimer();
    this._previewRemainingMs = 0;
    this.setData({ playing: false, fullPlayback: false, previewEnded: true });
    if (this.audio) this.audio.stop();
    this.openUnlockPaywall();
  },
  openUnlockPaywall() {
    this.setData({ showUnlockPaywall: true, paywallLoading: true, unlockOptions: [] });
    paid.fetchConfig((ok, config) => {
      if (!this.data.showUnlockPaywall) return;
      const accessMode = this.data.access && this.data.access.mode || this.data.track && this.data.track.unlockMode;
      const choices = accessMode === 'attraction' ? ['attraction', 'membership'] : accessMode === 'membership' ? ['membership'] : [];
      const messages = this.data.i18n.paidContent || {};
      const products = config && config.products || {};
      const unlockOptions = choices.filter((product) => products[product] && products[product].price !== undefined && products[product].price !== null)
        .map((product) => ({
          product,
          title: product === 'attraction' ? messages.buySpot : messages.member,
          description: product === 'attraction' ? messages.buySpotDesc : messages.memberDesc,
          priceDisplay: `¥${String(products[product].price).replace(/^¥\s*/, '')}`,
          featured: product === 'membership'
        }));
      this.setData({ paywallLoading: false, unlockOptions, paidConfig: config || null, simulation: Boolean(config && config.simulation) });
    });
  },
  onUnlockPaywallClose() { this.setData({ showUnlockPaywall: false }); },
  onUnlockOptionTap(e) {
    const product = e.currentTarget.dataset.product;
    if (!this.data.unlockOptions.some((item) => item.product === product) || this.data.purchaseLoading) return;
    this.setData({ showUnlockPaywall: false });
    this.onUnlock(product);
  },
  noop() {},
  onBack() {
    this._accessRequestId = (this._accessRequestId || 0) + 1;
    this.stop();
    this.setData({ access: null, accessLoading: false });
    goBack();
  },
  loadData() {
    this._accessRequestId = (this._accessRequestId || 0) + 1;
    this.stop();
    this.setData({ loading: true, track: null, point: null, access: null, unavailable: false, accessError: false, accessLoading: false, previewEnded: false, demoMode: false, durationSeconds: 0, remainingTime: '0:00', showUnlockPaywall: false, paywallLoading: false, unlockOptions: [] });
    content.loadContent((data, state) => {
      let track = null; let point = null; let pointTracks = []; let spot = null;
      this.albumCover = '';
      if (this.params.albumId || this.params.episodeId) {
        if (this.params.albumId && this.params.episodeId && state && state.source === 'remote') {
          const album = content.getAudioAlbums(data).find((item) => String(item.id) === String(this.params.albumId));
          this.albumCover = album && album.cover || '';
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
      if (this.autoPlayRequested) {
        this.autoPlayRequested = false;
        if (track && track.previewUrl && !demoMode) this.playPreview();
      }
    }, true);
  },
  localize() {
    const { track, point, locale } = this.data;
    const location = point && point.location;
    const displayLocation = typeof location === 'string' ? location : [location && location.hall, location && location.floor].filter(Boolean).join(' · ');
    this.setData({
      title: localized(track && track.isDemo ? track : (point || track), track && track.isDemo ? 'title' : (point ? 'name' : 'title'), locale),
      description: localized(track && track.isDemo ? track : (point || track), 'description', locale),
      cover: (track && track.cover) || (point && point.image) || this.albumCover || (this.spot && this.spot.image) || '',
      fullActionText: fullActionText(track, this.data.access, this.data.i18n),
      duration: duration(track && track.durationSeconds),
      durationSeconds: Number(track && track.durationSeconds) || 0,
      remainingTime: formatTime(Math.max(0, (Number(track && track.durationSeconds) || 0) - this.data.currentSeconds)),
      pointTracks: (this.data.pointTracks || []).map((item) => ({ ...item, displayTitle: localized(item, 'title', locale) })),
      displayLocation
    });
  },
  onPointTrackTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || !this.data.pointTracks.some((item) => String(item.id) === String(id))) return;
    this._accessRequestId = (this._accessRequestId || 0) + 1;
    this.params.trackId = String(id);
    this.stop();
    const track = this.data.pointTracks.find((item) => String(item.id) === String(id));
    this.setData({ track, access: null, accessLoading: false, previewEnded: false, showUnlockPaywall: false, unlockOptions: [], fullActionText: fullActionText(track, null, this.data.i18n) });
    this.localize();
  },
  refreshAccess(onReady, preservePreviewTime) {
    const track = this.data.track;
    if (!track || !track.id || track.isDemo === true || this.data.accessLoading) return;
    const requestId = (this._accessRequestId || 0) + 1;
    this._accessRequestId = requestId;
    this.stop(Boolean(preservePreviewTime));
    // 点击时重新请求签名；不复用可能过期的完整播放 URL。
    this.setData({ access: null, accessError: false, accessLoading: true });
    accessApi.getAccess(track.id, (ok, result, status) => {
      if (requestId !== this._accessRequestId || !this.data.track || String(this.data.track.id) !== String(track.id)) return;
      if (!ok) {
        this.setData({ accessError: true, accessLoading: false, unavailable: status === 404, access: null });
        return;
      }
      this.setData({ access: result, accessLoading: false, unavailable: !result.previewUrl && !result.fullUrl, fullActionText: fullActionText(track, result, this.data.i18n) });
      if (typeof onReady === 'function') onReady(result);
    });
  },
  onPlayerToggle() {
    if (this.data.playing && this.audio) {
      this.audio.pause();
      if (!this.data.fullPlayback) this._pausePreviewTimer();
      return this.setData({ playing: false });
    }
    if (this.data.fullPlayback) return this.playFull();
    this.playPreview();
  },
  onFullAccessTap() {
    if (this.data.accessLoading || this.data.purchaseLoading) return;
    this.playFull();
  },
  onSeekChange(e) {
    if (!this.audio || !this.data.access || !this.data.track) return;
    const total = Number(this.data.durationSeconds) || 0;
    const previewLimit = Math.max(0, Number(this.data.access.previewSeconds) || Number(this.data.track.previewSeconds) || 60);
    const max = this.data.fullPlayback ? total : Math.min(total || previewLimit, Math.max(0, previewLimit - 1));
    const seconds = Math.min(max, Math.max(0, Number(e.detail.value) || 0));
    if (this._chargePreviewSeek(seconds)) return;
    this.audio.seek(seconds);
    this.setData({ currentSeconds: Math.floor(seconds), currentTime: formatTime(seconds), remainingTime: formatTime(Math.max(0, total - seconds)), progressPercent: total ? Math.min(100, seconds / total * 100) : 0 });
  },
  onSeekOffset(e) {
    if (!this.audio || !this.data.access || !this.data.track) return;
    const total = Number(this.data.durationSeconds) || 0;
    const previewLimit = Math.max(0, Number(this.data.access.previewSeconds) || Number(this.data.track.previewSeconds) || 60);
    const max = this.data.fullPlayback ? total : Math.min(total || previewLimit, Math.max(0, previewLimit - 1));
    const offset = Number(e.currentTarget.dataset.offset) || 0;
    const seconds = Math.min(max, Math.max(0, this.data.currentSeconds + offset));
    if (this._chargePreviewSeek(seconds)) return;
    this.audio.seek(seconds);
    this.setData({ currentSeconds: Math.floor(seconds), currentTime: formatTime(seconds), remainingTime: formatTime(Math.max(0, total - seconds)), progressPercent: total ? Math.min(100, seconds / total * 100) : 0 });
  },
  onSpeedTap() {
    const speeds = [1, 1.25, 1.5, 2];
    const index = speeds.indexOf(Number(this.data.playbackRate));
    const playbackRate = speeds[(index + 1) % speeds.length];
    if (this.audio) this.audio.playbackRate = playbackRate;
    this.setData({ playbackRate });
  },
  playPreview() {
    if (!this.data.track || this.data.demoMode || !this.data.track.previewUrl) return;
    if (this.data.track.unlockMode === 'free') return this.playFull();
    if (this.data.playing && !this.data.fullPlayback) { this.audio.pause(); return this.setData({ playing: false }); }
    this.refreshAccess((access) => {
      if (!access.previewUrl) return;
      this.stop(true);
      const audio = this.ensureAudioContext();
      audio.src = access.previewUrl;
      audio.play();
      this._startPreviewTimer(false);
      this.setData({ playing: true, fullPlayback: false, previewEnded: false });
    }, true);
  },
  playFull() {
    if (!this.data.track || this.data.demoMode || !this.data.track.previewUrl || this.data.track.unlockMode === 'locked') return;
    if (this.data.playing && this.data.fullPlayback) { this.audio.pause(); return this.setData({ playing: false }); }
    this.refreshAccess((access) => {
      if (!access.fullUrl) return this.openUnlockPaywall();
      this.stop();
      const audio = this.ensureAudioContext();
      audio.src = access.fullUrl;
      audio.play();
      this.setData({ playing: true, fullPlayback: true, previewEnded: false });
    });
  },
  onUnlock(productChoice) {
    const access = this.data.access;
    if (!access || !['attraction', 'membership'].includes(access.mode)) {
      const title = access && access.mode === 'locked' ? this.data.i18n.heritage.previewOnly : this.data.i18n.heritage.unlockRequired;
      return wx.showToast({ title, icon: 'none' });
    }
    const product = productChoice || (access.mode === 'attraction' ? 'attraction' : 'membership');
    const allowedProducts = access.mode === 'attraction' ? ['attraction', 'membership'] : ['membership'];
    if (!allowedProducts.includes(product) || (product === 'attraction' && !this.params.attractionId)) return wx.showToast({ title: this.data.i18n.heritage.unlockRequired, icon: 'none' });
    if (!auth.getAccessToken()) return wx.switchTab({ url: '/pages/profile/profile' });
    auth.ensurePhoneBound((ready) => {
      if (!ready) return;
      paid.fetchConfig((ok, config) => {
        if (!ok || !config.products || !config.products[product]) return wx.showToast({ title: this.data.i18n.paidContent.payUnavailable, icon: 'none' });
        this.setData({ paidConfig: config, simulation: Boolean(config.simulation) });
        this.createOrder(product);
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
