const app = getApp();
const content = require('../../data/content');
const auth = require('../../utils/auth');
const { isSuccessfulLeadResponse, leadErrorMessage } = require('../../utils/lead-api');
const { goBack } = require('../../utils/navigation');
const i18n = require('../../utils/i18n');

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    spots: [],
    submitting: false,
    submitted: false,
    form: { name: '', phone: '', attraction: '', timeSlot: '', note: '' },
    timeSlots: []
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    this.applyLocale();
    content.loadContent((data) => this.setData({ spots: content.getAttractions(data).slice(0, 20) }), true);
  },

  onShow() { this.applyLocale(); },

  applyLocale() {
    const copy = i18n.apply(this);
    const locale = i18n.getLocale();
    this.setData({ locale, timeSlots: locale === 'en' ? ['Weekday morning', 'Weekday afternoon', 'Weekend morning', 'Weekend afternoon'] : locale === 'zh-TW' ? ['平日上午', '平日下午', '週末上午', '週末下午'] : ['工作日上午', '工作日下午', '周末上午', '周末下午'] });
    return copy;
  },

  onInput(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  onSpotChange(e) { const item = this.data.spots[Number(e.detail.value)]; this.setData({ 'form.attraction': item ? item.name : '' }); },
  onTimeChange(e) { this.setData({ 'form.timeSlot': this.data.timeSlots[Number(e.detail.value)] || '' }); },
  onBack() { goBack(); },

  onSubmit() {
    const copy = this.data.i18n;
    const form = this.data.form;
    if (!form.name.trim() || !form.phone.trim() || !form.attraction || !form.timeSlot) return wx.showToast({ title: copy.liveBooking.required, icon: 'none' });
    if (!/^1[3-9]\d{9}$/.test(form.phone.trim())) return wx.showToast({ title: copy.validation.phoneInvalid, icon: 'none' });
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    auth.ensurePhoneBound((ready, token) => {
      if (!ready) return this.setData({ submitting: false });
      wx.request({
        url: `${(app.globalData.apiBase || '').replace(/\/$/, '')}/api/leads`,
        method: 'POST',
        timeout: 15000,
        header: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        data: { source: 'miniprogram', platform: 'wechat-miniprogram', leadType: 'live-booking', countryId: content.getSelectedCountryId(), destination: form.attraction, bookingDate: form.timeSlot, contact: form.phone.trim(), contactType: 'phone', clientName: form.name.trim(), requirements: form.note.trim(), description: form.note.trim(), liveBooking: true },
        success: (res) => {
          if (!isSuccessfulLeadResponse(res)) return wx.showModal({ title: copy.feedback.submitError, content: leadErrorMessage(res), confirmText: copy.know, showCancel: false });
          this.setData({ submitted: true, form: { name: '', phone: '', attraction: '', timeSlot: '', note: '' } });
        },
        fail: () => wx.showModal({ title: copy.networkError, content: copy.feedback.networkError, confirmText: copy.know, showCancel: false }),
        complete: () => this.setData({ submitting: false })
      });
    });
  },

  onCopyWechat() { wx.setClipboardData({ data: 'SYGJ1130', success: () => wx.showToast({ title: this.data.i18n.liveBooking.copied, icon: 'success' }) }); },
  onDone() { this.setData({ submitted: false }); }
});
