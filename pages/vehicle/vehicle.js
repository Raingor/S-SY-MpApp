// 服务3：在地用车资源对接咨询
const { isSuccessfulLeadResponse, leadErrorMessage } = require('../../utils/lead-api');
const auth = require('../../utils/auth');
const app = getApp();
const { buildShareCard } = require('../../utils/share');
const i18n = require('../../utils/i18n');
const content = require('../../data/content');

function vehicleOptions(locale) {
  if (locale === 'en') return { duration: ['Half day', '1 day', 'Multiple days'], vehicle: ['BMW SUV / 5 seats', 'Comfort sedan', 'Business vehicle'], people: ['1–2 people', '3–5 people', '6+ people'] };
  if (locale === 'zh-TW') return { duration: ['半日', '1日', '多日'], vehicle: ['BMW SUV / 5座', '舒適型轎車', '商務車型'], people: ['1-2人', '3-5人', '6人以上'] };
  return { duration: ['半日', '1日', '多日'], vehicle: ['宝马 SUV / 5座', '舒适型轿车', '商务车型'], people: ['1-2人', '3-5人', '6人以上'] };
}

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    durationOptions: ['半日', '1日', '多日'],
    vehicleOptions: ['宝马 SUV / 5座', '舒适型轿车', '商务车型'],
    peopleOptions: ['1-2人', '3-5人', '6人以上'],
    form: {
      date: '',
      duration: '1日',
      vehicleType: '宝马 SUV / 5座',
      people: '1-2人',
      route: '',
      contactType: 'phone',
      contact: ''
    },
    submitting: false
  },

  onShareAppMessage() {
    return buildShareCard('/pages/vehicle/vehicle');
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    this.applyLocale();
  },

  onShow() {
    this.applyLocale();
  },

  applyLocale() {
    const copy = i18n.apply(this);
    const options = vehicleOptions(i18n.getLocale());
    const form = this.data.form || {};
    const pick = (value, list, fallback = list[0]) => list.includes(value) ? value : fallback;
    this.setData({ durationOptions: options.duration, vehicleOptions: options.vehicle, peopleOptions: options.people, 'form.duration': pick(form.duration, options.duration, options.duration[1]), 'form.vehicleType': pick(form.vehicleType, options.vehicle), 'form.people': pick(form.people, options.people) });
    return copy;
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value });
  },

  onOptionTap(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.currentTarget.dataset.value });
  },

  onPeopleChange(e) {
    this.setData({ 'form.people': this.data.peopleOptions[Number(e.detail.value)] });
  },

  onContactTypeTap(e) {
    this.setData({ 'form.contactType': e.currentTarget.dataset.type, 'form.contact': '' });
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onSubmit() {
    const copy = this.data.i18n;
    const { form } = this.data;
    const route = form.route.trim();
    const contact = form.contact.trim();
    if (!route) return wx.showToast({ title: copy.validation.vehicleRoute, icon: 'none' });
    if (!contact) return wx.showToast({ title: copy.validation.contact, icon: 'none' });
    if (form.contactType === 'phone' && !/^1[3-9]\d{9}$/.test(contact)) {
      return wx.showToast({ title: copy.validation.phoneFormat, icon: 'none' });
    }
    if (this.data.submitting) return;

    const apiBase = (app.globalData.apiBase || '').replace(/\/$/, '');
    if (!apiBase) return wx.showToast({ title: copy.validation.notConfigured, icon: 'none' });
    const payload = {
      source: 'miniprogram',
      platform: 'wechat-miniprogram',
      leadType: 'vehicle-consultation',
      countryId: content.getSelectedCountryId(),
      destination: content.countryName((content.getCountries() || []).find((item) => item.id === content.getSelectedCountryId()), this.data.locale) || '希腊',
      bookingDate: form.date,
      duration: form.duration,
      vehicleType: form.vehicleType,
      travelers: form.people,
      people: form.people,
      route,
      contactType: form.contactType,
      contact
    };

    this.setData({ submitting: true });
    auth.ensurePhoneBound((ready, token) => {
      if (!ready) {
        this.setData({ submitting: false });
        return;
      }
      wx.request({
        url: `${apiBase}/api/leads`,
        method: 'POST',
        timeout: 15000,
        header: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        data: payload,
      success: (res) => {
        if (isSuccessfulLeadResponse(res)) {
          wx.showModal({
            title: copy.feedback.vehicleSubmitted,
            content: copy.feedback.vehicleSubmittedDesc,
            confirmText: copy.okay,
            showCancel: false,
            success: () => this.setData({ 'form.route': '', 'form.contact': '' })
          });
          return;
        }
        wx.showModal({ title: copy.feedback.submitError, content: leadErrorMessage(res), confirmText: copy.know, showCancel: false });
      },
      fail: () => wx.showModal({ title: copy.networkError, content: copy.feedback.networkError, confirmText: copy.know, showCancel: false }),
        complete: () => this.setData({ submitting: false })
      });
    }, () => this.setData({ submitting: false }));
  }
});
