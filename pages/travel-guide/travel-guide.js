// 出行指南：后台动态分组、卡片、三语文案与在线文档。
const app = getApp();
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');
const { goBack } = require('../../utils/navigation');
const { guideView } = require('../../utils/travel-guide');
const i18n = require('../../utils/i18n');

Page({
  data: {
    statusBarHeight: 20, locale: 'zh-CN', i18n: i18n.getMessages(),
    guideEnabled: true, guideConfigured: false, guideKicker: '', guideTitle: '', guideSubtitle: '',
    sections: [], loading: true, contentError: false, offline: false
  },

  onShareAppMessage() {
    return buildShareCard('/pages/travel-guide/travel-guide');
  },

  refresh() {
    const requestId = (this._requestId || 0) + 1;
    this._requestId = requestId;
    this.setData({ loading: true, contentError: false });
    content.loadContent((data, state) => {
      if (requestId !== this._requestId) return;
      if (state && state.status === 'contract-error') {
        this._guideContent = null;
        this.setData({ loading: false, contentError: true, sections: [] });
        return;
      }
      const remote = state && state.source === 'remote';
      // 离线时保留本页最近一次成功内容；不读取可能过期的 globalData.contentSettings。
      if (remote || !this._guideContent) this._guideContent = data || {};
      this.setData({ loading: false, offline: Boolean(state && state.reason === 'offline') });
      this.applyRemoteDocLinks();
    }, true);
  },

  applyRemoteDocLinks() {
    const copy = this.data.i18n.travel;
    const base = app.globalData && app.globalData.apiBase || '';
    this.setData(guideView(this._guideContent || {}, copy, this.data.locale, base));
  },

  onDocReadTap(e) {
    const { section, guide } = e.currentTarget.dataset;
    const item = (this.data.sections.find((s) => s.key === section) || {}).guides?.find((g) => g.key === guide);
    if (!this.data.guideEnabled || !item || !item.docUrl) return;
    wx.showLoading({ title: '' });
    wx.downloadFile({
      url: item.docUrl,
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode !== 200) return wx.showToast({ title: this.data.i18n.travel.docFailed, icon: 'none' });
        wx.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          fail: () => wx.showToast({ title: this.data.i18n.travel.docFailed, icon: 'none' })
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: this.data.i18n.travel.docFailed, icon: 'none' });
      }
    });
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    this.applyLocale();
  },

  onShow() {
    this.applyLocale();
    this.refresh();
  },

  onUnload() { this._requestId = (this._requestId || 0) + 1; },

  applyLocale() {
    i18n.apply(this);
    if (!this.data.contentError) this.applyRemoteDocLinks();
  },

  onBack() { goBack(); },

  onConsult() {
    app.globalData.pendingLeadType = 'customization';
    wx.switchTab({ url: '/pages/customize/customize' });
  }
});
