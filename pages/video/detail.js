const content = require('../../data/content');
const i18n = require('../../utils/i18n');
const paid = require('../../utils/paid-content');
const guideVideo = require('../../utils/guide-video');
const { goBack } = require('../../utils/navigation');
const { buildShareCard } = require('../../utils/share');

function tr(item, key, locale) {
  const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : '';
  return item[key + suffix] || item[key] || '';
}
function duration(value) {
  const seconds = Math.floor(Number(value));
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') : '—';
}
Page({
  data: { i18n: i18n.getMessages(), locale: 'zh-CN', statusBarHeight: 20, video: null, videoOpen: null, videoState: 'idle', loading: true, failed: false, activeTab: 'episodes', scrollIntoView: '' },
  onLoad(options) {
    this.videoId = options && options.id || '';
    this.attractionId = options && options.attractionId || '';
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
  },
  onShow() {
    i18n.apply(this);
    this.localize();
    this.refresh();
  },
  refresh() {
    const requestId = (this._loadId || 0) + 1;
    this._loadId = requestId;
    if (!this.videoId || !this.attractionId) return this.setData({ loading: false, video: null });
    this.setData({ loading: true, failed: false });
    content.loadContent((data, state) => {
      if (requestId !== this._loadId) return;
      if (!state || state.source !== 'remote' || state.status !== 'ready') {
        return this.setData({ loading: false, failed: true });
      }
      const video = content.getGuideVideos(data, this.attractionId).find((item) => String(item.id) === String(this.videoId)) || null;
      this._spot = content.getAttraction(this.attractionId, data);
      this.setData({ video, videoOpen: null, videoState: 'idle', loading: false, failed: false });
      this.localize();
      if (video) this.markPurchase(requestId);
    }, true);
  },
  markPurchase(requestId) {
    const purchaseId = (this._purchaseId || 0) + 1;
    this._purchaseId = purchaseId;
    paid.fetchEntitlements((ok, entitlements) => {
      if (requestId !== this._loadId || purchaseId !== this._purchaseId || !this.data.video) return;
      this.setData({ video: { ...this.data.video, purchased: ok && guideVideo.isPurchased(entitlements, this.videoId) } });
    });
  },
  localize() {
    const video = this.data.video;
    if (!video) return;
    const subject = this._spot ? (this.data.locale === 'en' ? this._spot.en || this._spot.name : tr(this._spot, 'name', this.data.locale)) : '';
    this.setData({ video: { ...video, displayTitle: tr(video, 'title', this.data.locale), displaySubject: subject, displayDescription: tr(video, 'description', this.data.locale), displayDuration: duration(video.durationSeconds) } });
  },
  onTabTap(event) {
    const intro = event.currentTarget.dataset.section === 'intro';
    this.setData({ activeTab: intro ? 'intro' : 'episodes', scrollIntoView: '' });
    this.setData({ scrollIntoView: intro ? 'video-intro' : 'video-program' });
  },
  onPlay() {
    if (!this.data.video) return;
    // 先看课程介绍，再点节目/购买按钮；购买与播放始终在本页展开，不弹浮层。
    this.setData({ activeTab: 'episodes', scrollIntoView: '' });
    this.setData({ scrollIntoView: 'video-program' });
    if (!this.data.videoOpen) return this.setData({ videoOpen: this.data.video, videoState: 'loading' });
    const player = this.selectComponent && this.selectComponent('#video-player');
    if (!player) return;
    const actions = { login: 'onLogin', purchase: 'onBuy', error: 'reload', ready: 'play' };
    const action = actions[player.data.state];
    if (action) player[action]();
  },
  onVideoAccessChange(event) {
    const state = event.detail && event.detail.state;
    const video = this.data.video;
    if (!video || !this.data.videoOpen || String(event.detail.videoId) !== String(video.id)) return;
    // 仅服务端 access 的 ready / locked 结果刷新锁标，支付回调本身不解锁。
    const purchased = state === 'ready' ? true : (state === 'login' || state === 'purchase' ? false : video.purchased);
    this._purchaseId = (this._purchaseId || 0) + 1;
    this.setData({ videoState: state, video: { ...video, purchased } });
  },
  onBack() { goBack(); },
  onUnload() {
    this._loadId = (this._loadId || 0) + 1;
    this.setData({ videoOpen: null });
  },
  onShareAppMessage() {
    return buildShareCard('/pages/video/detail?id=' + encodeURIComponent(this.videoId || '') + '&attractionId=' + encodeURIComponent(this.attractionId || ''), this);
  }
});
