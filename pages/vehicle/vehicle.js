// 服务3：在地用车资源对接咨询
// 页面文案、表单 UI 文案与三组选项来自后台「在地用车」板块（GET /api/content → vehicleService）；
// 后台未配置的部分回退本地 i18n 与默认值，不使用本地文案冒充后台内容。
const { isSuccessfulLeadResponse, leadErrorMessage } = require('../../utils/lead-api');
const auth = require('../../utils/auth');
const app = getApp();
const { buildShareCard } = require('../../utils/share');
const { goBack } = require('../../utils/navigation');
const i18n = require('../../utils/i18n');
const content = require('../../data/content');

function localized(item, key, locale) {
  const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : '';
  return item && (item[key + suffix] || item[key]) || '';
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function tomorrowIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return formatLocalDate(date);
}

// 出行日期必须严格晚于今天；后台可进一步收紧到更晚日期，但不能放开历史日期。
function resolveDateStart(value) {
  const tomorrow = tomorrowIso();
  const configured = value && value !== 'today' ? value : tomorrow;
  return configured > tomorrow ? configured : tomorrow;
}

// 选项仅作展示与回传：id 稳定、label 随语言；不做任何业务判断。
function toOptionList(options, locale) {
  return (Array.isArray(options) ? options : []).map((item) => ({
    id: item && item.id ? item.id : '',
    label: localized(item, 'label', locale)
  })).filter((item) => item.id && item.label);
}

function tagList(service, locale) {
  const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : '';
  const localizedTags = Array.isArray(service['tags' + suffix]) ? service['tags' + suffix] : [];
  const source = localizedTags.length ? localizedTags : (Array.isArray(service.tags) ? service.tags : []);
  return source.filter((item) => typeof item === 'string' && item.trim());
}

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    configured: false,
    service: null,
    tags: [],
    durationOptions: [],
    vehicleOptions: [],
    peopleOptions: [],
    peopleIndex: 0,
    peopleLabel: '',
    dateStart: '',
    dateEnd: '',
    copy: {},
    form: {
      date: '',
      duration: '',
      vehicleType: '',
      people: '',
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
    this.loadService();
  },

  loadService() {
    content.loadContent((data) => {
      const service = content.getVehicleService(data);
      this.service = service && service.enabled !== false ? service : null;
      this.applyLocale();
    }, true);
  },

  compileCopy(service, locale) {
    const msgs = (service && this.data.i18n) || this.data.i18n;
    const texts = msgs && msgs.forms ? msgs.forms : {};
    const backend = service && service.form ? service.form : null;
    const pick = (key, fallback) => (backend ? localized(backend, key, locale) : '') || fallback || '';
    const showPhone = backend ? backend.contactPhone !== false : true;
    const showWechat = backend ? backend.contactWechat !== false : true;
    return {
      formTitle: pick('title', texts.vehiclePlan),
      formTip: pick('tip', texts.vehicleTip),
      dateLabel: pick('dateLabel', texts.vehicleDate),
      durationLabel: pick('durationLabel', texts.vehicleDuration),
      vehicleLabel: pick('vehicleLabel', texts.vehicleType),
      peopleLabel: pick('peopleLabel', texts.people),
      routeLabel: pick('routeLabel', texts.vehicleRoute),
      contactLabel: pick('contactLabel', texts.contactMethod),
      submitLabel: pick('submitLabel', texts.submitVehicle),
      routePlaceholder: pick('routePlaceholder', texts.vehicleRoutePlaceholder),
      phonePlaceholder: pick('phonePlaceholder', texts.phonePlaceholderShort),
      wechatPlaceholder: pick('wechatPlaceholder', texts.wechatPlaceholder),
      routeRequired: backend ? backend.routeRequired !== false : true,
      showPhone,
      showWechat
    };
  },

  applyLocale() {
    i18n.apply(this);
    const locale = i18n.getLocale();
    const service = this.service || null;
    const configured = Boolean(service && localized(service, 'title', locale));
    const copy = this.compileCopy(service, locale);
    const durationOptions = toOptionList(service && service.options && service.options.duration, locale);
    const vehicleOptions = toOptionList(service && service.options && service.options.vehicle, locale);
    const peopleOptions = toOptionList(service && service.options && service.options.people, locale);
    const form = this.data.form || {};
    const pickId = (value, list) => (list.some((item) => item.id === value) ? value : (list[0] ? list[0].id : ''));
    const durationId = pickId(form.duration, durationOptions);
    const vehicleTypeId = pickId(form.vehicleType, vehicleOptions);
    const peopleId = pickId(form.people, peopleOptions);
    const peopleIndex = Math.max(0, peopleOptions.findIndex((item) => item.id === peopleId));
    const backendForm = service && service.form ? service.form : null;
    const contactType = copy.showPhone ? 'phone' : 'wechat';
    this.setData({
      locale,
      service: configured ? service : null,
      configured,
      tags: configured ? tagList(service, locale) : [],
      copy,
      dateStart: resolveDateStart(backendForm && backendForm.dateStart),
      // 过期的后台上限不应重新开放历史日期；视为未设置上限。
      dateEnd: backendForm && backendForm.dateEnd && backendForm.dateEnd >= resolveDateStart(backendForm.dateStart)
        ? backendForm.dateEnd
        : '2099-12-31',
      durationOptions,
      vehicleOptions,
      peopleOptions,
      peopleIndex,
      peopleLabel: peopleOptions[peopleIndex] ? peopleOptions[peopleIndex].label : '',
      'form.duration': durationId,
      'form.vehicleType': vehicleTypeId,
      'form.people': peopleId,
      'form.contactType': copy.showPhone && copy.showWechat ? form.contactType : contactType
    });
  },

  onBack() {
    goBack();
  },

  onDateChange(e) {
    const value = String(e.detail.value || '');
    if (value && value < this.data.dateStart) {
      return wx.showToast({ title: this.data.i18n.validation.vehicleDateFuture, icon: 'none' });
    }
    this.setData({ 'form.date': value });
  },

  onOptionTap(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.currentTarget.dataset.value });
  },

  onPeopleChange(e) {
    const index = Number(e.detail.value) || 0;
    const option = this.data.peopleOptions[index];
    this.setData({
      peopleIndex: index,
      peopleLabel: option ? option.label : '',
      'form.people': option ? option.id : ''
    });
  },

  onContactTypeTap(e) {
    this.setData({ 'form.contactType': e.currentTarget.dataset.type, 'form.contact': '' });
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  optionLabel(options, id) {
    const found = (options || []).find((item) => item.id === id);
    return found ? found.label : '';
  },

  onSubmit() {
    const copy = this.data.i18n;
    const pageCopy = this.data.copy || {};
    const { form } = this.data;
    const route = form.route.trim();
    const contact = form.contact.trim();
    if (form.date && form.date < this.data.dateStart) return wx.showToast({ title: copy.validation.vehicleDateFuture, icon: 'none' });
    if (pageCopy.routeRequired && !route) return wx.showToast({ title: copy.validation.vehicleRoute, icon: 'none' });
    if (!contact) return wx.showToast({ title: copy.validation.contact, icon: 'none' });
    if (form.contactType === 'phone' && !/^1[3-9]\d{9}$/.test(contact)) {
      return wx.showToast({ title: copy.validation.phoneFormat, icon: 'none' });
    }
    if (this.data.submitting) return;

    const apiBase = (app.globalData.apiBase || '').replace(/\/$/, '');
    if (!apiBase) return wx.showToast({ title: copy.validation.notConfigured, icon: 'none' });
    // label 字段保持原样（后台「用车询盘」按 label 展示），同时回传稳定 id 供后台持久化。
    const durationLabel = this.optionLabel(this.data.durationOptions, form.duration);
    const vehicleTypeLabel = this.optionLabel(this.data.vehicleOptions, form.vehicleType);
    const peopleLabel = this.optionLabel(this.data.peopleOptions, form.people);
    const payload = {
      source: 'miniprogram',
      platform: 'wechat-miniprogram',
      leadType: 'vehicle-consultation',
      countryId: content.getSelectedCountryId(),
      destination: content.countryName((content.getCountries() || []).find((item) => item.id === content.getSelectedCountryId()), this.data.locale) || '希腊',
      bookingDate: form.date,
      duration: durationLabel,
      vehicleType: vehicleTypeLabel,
      travelers: peopleLabel,
      people: peopleLabel,
      durationId: form.duration,
      vehicleTypeId: form.vehicleType,
      peopleId: form.people,
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
