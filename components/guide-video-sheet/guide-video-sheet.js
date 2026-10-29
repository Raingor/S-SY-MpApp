// 游览攻略视频播放 sheet：资格/签名 URL/购买全部由服务端决定，多页面共用。
const auth = require('../../utils/auth');
const paid = require('../../utils/paid-content');
const guideVideo = require('../../utils/guide-video');
const i18n = require('../../utils/i18n');

Component({
  properties: {
    video: {
      type: Object,
      value: null,
      observer(value) {
        if (!value) return this.setData({ state: 'idle', playUrl: '' });
        this._video = value;
        this._requestId = (this._requestId || 0) + 1;
        this._videoPosition = 0;
        this.setData({
          state: 'loading', price: '', purchaseLoading: false, authLoading: false, simulationLoading: false,
          playUrl: '', position: 0, order: null,
          displayTitle: value.displayTitle || value.title || '',
          displayDescription: value.displayDescription || value.description || '',
          cover: value.cover || ''
        });
        this.reload();
      }
    }
  },
  data: { state: 'idle', price: '', purchaseLoading: false, authLoading: false, simulationLoading: false, playUrl: '', position: 0, order: null, displayTitle: '', displayDescription: '', cover: '' },
  lifetimes: {
    detached() { this._requestId = (this._requestId || 0) + 1; }
  },
  methods: {
    noop() {},
    reload() {
      const video = this._video || this.properties.video;
      if (!video || this.data.reloading) return;
      const requestId = (this._requestId || 0) + 1;
      this._requestId = requestId;
      this.setData({ state: 'loading', reloading: true, playUrl: '' });
      guideVideo.fetchAccess(video, (ok, result) => {
        if (requestId !== this._requestId) return;
        if (!ok || !result) return this.setData({ state: 'error', reloading: false });
        if (result.access === 'full' && result.playUrl && result.validUntil > Date.now()) {
          return this.setData({ state: 'ready', reloading: false, access: result, playUrl: result.playUrl });
        }
        if (result.access === 'locked' && result.reason === 'MINIPROGRAM_LOGIN_REQUIRED') {
          return this.setData({ state: 'login', reloading: false, access: result });
        }
        if (result.access === 'locked' && result.reason === 'VIDEO_PURCHASE_REQUIRED' && result.product) {
          return this.setData({ state: 'purchase', reloading: false, access: result, price: guideVideo.priceDisplay(result.product) });
        }
        this.setData({ state: 'error', reloading: false });
      });
    },
    onLogin() {
      if (this.data.authLoading) return;
      this.setData({ authLoading: true });
      auth.login((loggedIn) => {
        if (!loggedIn) return this.setData({ authLoading: false });
        this.reload();
      });
    },
    onBuy() {
      const video = this._video || this.properties.video;
      if (!video || this.data.purchaseLoading) return;
      this.setData({ purchaseLoading: true });
      paid.createOrder('guideVideo', video.id, (created, result) => {
        const code = result && result.code;
        if (code === 'PAYMENT_CANCELLED') return this.setData({ purchaseLoading: false });
        if (result && result.pendingSimulation) {
          return this.setData({ state: 'simulation', purchaseLoading: false, order: result.order || null });
        }
        if (!created) {
          wx.showModal({ title: i18n.getMessages().submitFailed, content: (result && (result.error || result.message)) || i18n.getMessages().heritage.guideVideoUnavailable, confirmText: i18n.getMessages().know, showCancel: false });
          return this.setData({ purchaseLoading: false });
        }
        // 支付成功/待确认都重新鉴权：服务端是唯一权益来源。
        this.setData({ purchaseLoading: false });
        this.reload();
      });
    },
    onSimulation(event) {
      const order = this.data.order;
      if (!order || !order.id || this.data.simulationLoading) return;
      this.setData({ simulationLoading: true });
      paid.simulateOrderResult(order.id, event.currentTarget.dataset.outcome, () => {
        this.setData({ simulationLoading: false });
        this.reload();
      });
    },
    // 签名 URL 过期或播放失败：记住断点重新鉴权，换新 URL 后从原位置续播。
    onTimeUpdate(event) {
      this._videoPosition = Math.floor(Number(event.detail && event.detail.currentTime) || 0);
    },
    onError() {
      if (this.data.state !== 'ready') return;
      this.setData({ position: this._videoPosition || 0 });
      this.reload();
    },
    close() {
      if (this.data.state === 'ready') {
        const context = wx.createVideoContext && wx.createVideoContext('guide-video', this);
        if (context) context.stop();
      }
      this.triggerEvent('close');
    }
  }
});
