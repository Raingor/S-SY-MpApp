// 服务5：希腊商旅一站式随行服务
const { isSuccessfulLeadResponse, leadErrorMessage } = require('../../utils/lead-api');
const auth = require('../../utils/auth');
const app = getApp();
const { buildShareCard } = require('../../utils/share');
const { goBack } = require('../../utils/navigation');
const i18n = require('../../utils/i18n');
const content = require('../../data/content');

function businessOptions(locale) {
  if (locale === 'en') return { cycle: ['1–3 days', '4–7 days', '1–2 weeks', 'Long-term'], duration: ['Half day', '1 day', 'Full service'], language: ['Chinese-English support', 'Conference interpreting', 'Document translation', 'Combined needs'], people: ['1–2 people', '3–5 people', '6+ people'] };
  if (locale === 'zh-TW') return { cycle: ['1-3天', '4-7天', '1-2週', '長期往返'], duration: ['半日陪同', '1日陪同', '全程陪同'], language: ['中英雙語陪同', '會議口譯', '文件筆譯', '綜合需求'], people: ['1-2人', '3-5人', '6人以上'] };
  return { cycle: ['1-3天', '4-7天', '1-2周', '长期往返'], duration: ['半日陪同', '1日陪同', '全程陪同'], language: ['中英双语陪同', '会议口译', '文件笔译', '综合需求'], people: ['1-2人', '3-5人', '6人以上'] };
}

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    cycleOptions: ['1-3天', '4-7天', '1-2周', '长期往返'],
    durationOptions: ['半日陪同', '1日陪同', '全程陪同'],
    languageOptions: ['中英双语陪同', '会议口译', '文件笔译', '综合需求'],
    peopleOptions: ['1-2人', '3-5人', '6人以上'],
    form: {
      cycle: '1-3天',
      duration: '半日陪同',
      languageNeeds: '中英双语陪同',
      industryNeeds: '',
      people: '1-2人',
      contactType: 'wechat',
      contact: ''
    },
    submitting: false
  },

  onShareAppMessage() {
    return buildShareCard('/pages/business/business');
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
    const options = businessOptions(i18n.getLocale());
    const form = this.data.form || {};
    const pick = (value, list) => list.includes(value) ? value : list[0];
    this.setData({ cycleOptions: options.cycle, durationOptions: options.duration, languageOptions: options.language, peopleOptions: options.people, 'form.cycle': pick(form.cycle, options.cycle), 'form.duration': pick(form.duration, options.duration), 'form.languageNeeds': pick(form.languageNeeds, options.language), 'form.people': pick(form.people, options.people) });
    return copy;
  },

  onBack() {
    goBack();
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
    const industryNeeds = form.industryNeeds.trim();
    const contact = form.contact.trim();
    if (!industryNeeds) return wx.showToast({ title: copy.validation.industry, icon: 'none' });
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
      leadType: 'business-travel',
      countryId: content.getSelectedCountryId(),
      destination: content.countryName((content.getCountries() || []).find((item) => item.id === content.getSelectedCountryId()), this.data.locale) || '希腊',
      businessCycle: form.cycle,
      duration: form.duration,
      languageNeeds: form.languageNeeds,
      industryNeeds,
      travelers: form.people,
      people: form.people,
      route: '商务行程与企业拜访咨询',
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
            title: copy.feedback.businessSubmitted,
            content: copy.feedback.businessSubmittedDesc,
            confirmText: copy.okay,
            showCancel: false,
            success: () => this.setData({ 'form.industryNeeds': '', 'form.contact': '' })
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
