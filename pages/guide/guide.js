// P4 名人导游页：Richard 李个人介绍 + 可预约日期 + 专属报价
const { isSuccessfulLeadResponse, leadErrorMessage } = require('../../utils/lead-api');
const auth = require('../../utils/auth');
const GUIDE_WECHAT = 'SYGJ1130';
const { buildShareCard } = require('../../utils/share');
const { goBack } = require('../../utils/navigation');
const i18n = require('../../utils/i18n');
const content = require('../../data/content');
const TODAY_KEY = '2026-09-14';
const CALENDAR_MONTHS = [
  { year: 2026, month: 8, label: '2026年8月' },
  { year: 2026, month: 9, label: '2026年9月' },
  { year: 2026, month: 10, label: '2026年10月' },
  { year: 2026, month: 11, label: '2026年11月' },
  { year: 2026, month: 12, label: '2026年12月' },
  { year: 2027, month: 1, label: '2027年1月' },
  { year: 2027, month: 2, label: '2027年2月' }
];
const CALENDAR_SCHEDULES = {
  '2026-09': { 12: 'booked', 16: 'available', 17: 'available', 21: 'booked', 22: 'pending', 24: 'available', 25: 'available' },
  '2026-10': { 8: 'available', 9: 'available', 10: 'pending', 15: 'available', 16: 'available', 17: 'booked', 22: 'available', 23: 'available' },
  '2026-11': { 5: 'available', 6: 'available', 12: 'available', 13: 'pending', 19: 'available', 20: 'available' },
  '2026-12': { 3: 'available', 4: 'available', 11: 'booked', 17: 'available', 18: 'available' },
  '2027-01': { 7: 'available', 8: 'available', 14: 'pending', 21: 'available', 22: 'available' },
  '2027-02': { 4: 'available', 5: 'available', 18: 'available', 19: 'available' }
};

function padMonth(month) {
  return String(month).padStart(2, '0');
}

function buildCalendar(year, month) {
  const monthKey = `${year}-${padMonth(month)}`;
  const leading = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const schedules = CALENDAR_SCHEDULES[monthKey] || {};
  const days = [];
  for (let i = 0; i < leading; i += 1) days.push({ key: `blank-leading-${i}`, blank: true });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${monthKey}-${String(day).padStart(2, '0')}`;
    const scheduledState = schedules[day] || 'unavailable';
    const state = date < TODAY_KEY ? 'past' : scheduledState;
    days.push({ key: date, day, date, state });
  }
  let trailing = 0;
  while (days.length % 7 !== 0) {
    days.push({ key: `blank-trailing-${trailing}`, blank: true });
    trailing += 1;
  }
  return days;
}

function localizedGuide(guide, locale) {
  if (!guide) return null;
  const suffix = locale === 'en' ? 'En' : (locale === 'zh-TW' ? 'Tw' : '');
  const read = (key, fallback) => guide[key + suffix] || guide[key] || fallback;
  return {
    ...guide,
    name: read('name', guide.name),
    role: read('role', guide.role),
    intro: read('intro', guide.intro),
    location: read('location', guide.location),
    storyTitle: read('storyTitle', guide.storyTitle),
    story1: read('story1', guide.story1),
    story2: read('story2', guide.story2),
    storyNote: read('storyNote', guide.storyNote),
    quoteKicker: read('quoteKicker', guide.quoteKicker),
    quote: read('quote', guide.quote),
    quoteFoot: read('quoteFoot', guide.quoteFoot),
    credentialsTitle: read('credentialsTitle', guide.credentialsTitle),
    signatureTitle: read('signatureTitle', guide.signatureTitle),
    reviewsTitle: read('reviewsTitle', guide.reviewsTitle),
    credentials: guide['credentials' + suffix] || guide.credentials,
    directions: guide['directions' + suffix] || guide.directions,
    reviews: guide['reviews' + suffix] || guide.reviews
  };
}

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    guide: {
      id: 'richard-li',
      avatar: '/assets/images/guide/richard-avatar.jpg',
      fullImage: '/assets/images/guide/richard-full.jpg',
      name: 'Richard 李',
      role: '名人司导',
      location: '雅典 / 伯罗奔尼撒半岛 / 德尔斐 / 梅黛奥拉 / 圣托里尼',
      intro: '希腊历史人文与私人路线顾问',
      wechat: GUIDE_WECHAT
    },
    credentials: [
      { index: '01', title: '名校教育', desc: '武汉大学双学士\n英国澳洲双硕士' },
      { index: '02', title: '资深履历', desc: '资深定制旅行规划师\n欧洲精品文旅金牌从业者' },
      { index: '03', title: '在地资质', desc: '欧盟 · 美国 · 中国\n驾照兼备' }
    ],
    directions: [
      { key: 'history', index: '01', title: '雅典文明', subtitle: '历史与建筑讲解', desc: '从卫城到古市集，把课本里的文明讲成一次有温度的探索。', suitable: '适合：第一次到访 / 亲子家庭', duration: '半日 · 1日' },
      { key: 'culture', index: '02', title: '圣地人文', subtitle: '信仰与建筑', desc: '深入德尔斐、梅黛奥拉等圣地，读懂石头背后的信仰与时间。', suitable: '适合：深度文化 / 摄影爱好者', duration: '1日 · 多日' },
      { key: 'coast', index: '03', title: '小众秘境', subtitle: '海岸线与岛屿', desc: '避开人潮，沿着海岸线去看当地人才知道的蓝与风。', suitable: '适合：情侣蜜月 / 朋友出行', duration: '1日 · 多日' },
      { key: 'photo', index: '04', title: '私人摄影', subtitle: '路线规划与记录', desc: '把光线、节奏和路线交给我，留下自然、不摆拍的旅行影像。', suitable: '适合：纪念日 / 家庭旅拍', duration: '半日 · 1日' }
    ],
    reviews: [
      { quote: '学识渊博，谈吐儒雅。一路上孩子听得入迷，大人也真正看懂了雅典。', name: '北京 · L女士', meta: '亲子文化之旅' },
      { quote: '专业靠谱又细心体贴，临时调整路线也安排得很稳，拍照尤其好看。', name: '上海 · K先生', meta: '圣岛蜜月之旅' },
      { quote: '不赶景点，更像和一位老朋友探索希腊。小众海岸线比想象中更惊喜。', name: '广州 · M女士', meta: '海岛深度定制' }
    ],
    calendarWeeks: ['一', '二', '三', '四', '五', '六', '日'],
    calendarMonths: CALENDAR_MONTHS,
    calendarIndex: 1,
    canPrevMonth: true,
    canNextMonth: true,
    calendarMonthLabel: '2026年9月',
    calendarDays: buildCalendar(2026, 9),
    selectedDate: '2026-09-16',
    selectedDateText: '9月16日（周三）',
    durationOptions: ['半日陪同', '1日陪同', '多日陪同'],
    selectedDuration: '半日陪同',
    peopleOptions: ['1-2位成人', '3-5位成人', '6位以上'],
    form: {
      people: '2位成人',
      route: '',
      contactType: 'wechat',
      contact: ''
    },
    submitting: false
  },

  onShareAppMessage() {
    return buildShareCard('/pages/guide/guide?id=' + (this.data.guide.id || 'richard-li'));
  },

  onLoad(options) {
    this.guideId = (options && options.id) || 'richard-li';
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    this.applyLocale();
    this.loadManagedGuide();
  },

  onShow() {
    this.applyLocale();
    this.loadManagedGuide();
  },

  applyLocale() {
    const copy = i18n.apply(this);
    this.setData({ calendarWeeks: this.data.locale === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : (this.data.locale === 'zh-TW' ? ['一', '二', '三', '四', '五', '六', '日'] : ['一', '二', '三', '四', '五', '六', '日']), selectedDateText: this.data.selectedDate ? this.data.selectedDateText : copy.guide.chooseDate });
    return copy;
  },

  loadManagedGuide() {
    // 第二个参数 true：每次进入页都重新拉后端，跳过内存缓存，确保后台改导游信息后即时同步。
    content.loadContent((data, state) => {
      if (state && state.reason === 'offline') return;
      const remote = content.getGuide(this.guideId, data);
      if (!remote) return;
      const guide = localizedGuide(remote, this.data.locale);
      this.setData({
        guide: { ...this.data.guide, ...guide, wechat: guide.wechat || this.data.guide.wechat },
        credentials: Array.isArray(guide.credentials) && guide.credentials.length ? guide.credentials : this.data.credentials,
        directions: Array.isArray(guide.directions) && guide.directions.length ? guide.directions : this.data.directions,
        reviews: Array.isArray(guide.reviews) && guide.reviews.length ? guide.reviews : this.data.reviews
      });
    }, true);
  },

  onBack() {
    goBack();
  },

  onBookTap() {
    wx.pageScrollTo({ selector: '#booking', duration: 420 });
  },

  onOfflineGuideTap() {
    this.onBookTap();
  },

  onLiveGuideTap() {
    wx.navigateTo({ url: '/pages/live-booking/live-booking?source=guide' });
  },

  onFreeTrialTap() {
    wx.navigateTo({ url: '/pages/knowledge/knowledge?panel=1&track=deep' });
  },

  onCopyWechat() {
    wx.setClipboardData({
      data: this.data.guide.wechat,
      success: () => wx.showToast({ title: this.data.i18n.copySuccess, icon: 'success' })
    });
  },

  onPrevMonth() {
    this.changeCalendarMonth(-1);
  },

  onNextMonth() {
    this.changeCalendarMonth(1);
  },

  changeCalendarMonth(step) {
    const nextIndex = this.data.calendarIndex + step;
    if (nextIndex < 0 || nextIndex >= this.data.calendarMonths.length) return;
    const target = this.data.calendarMonths[nextIndex];
    this.setData({
      calendarIndex: nextIndex,
      canPrevMonth: nextIndex > 0,
      canNextMonth: nextIndex < this.data.calendarMonths.length - 1,
      calendarMonthLabel: target.label,
      calendarDays: buildCalendar(target.year, target.month),
      selectedDate: '',
      selectedDateText: this.data.i18n.guide.chooseDate
    });
  },

  onDateTap(e) {
    const { date, state, day } = e.currentTarget.dataset;
    if (!date || state !== 'available') return;
    const weekdays = this.data.locale === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['日', '一', '二', '三', '四', '五', '六'];
    const dateObject = new Date(`${date}T00:00:00`);
    this.setData({
      selectedDate: date,
      selectedDateText: this.data.locale === 'en' ? `${dateObject.getMonth() + 1}/${day} (${weekdays[dateObject.getDay()]})` : `${dateObject.getMonth() + 1}${this.data.locale === 'zh-TW' ? '月' : '月'}${day}日（周${weekdays[dateObject.getDay()]}）`
    });
  },

  onDurationTap(e) {
    this.setData({ selectedDuration: e.currentTarget.dataset.value });
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
    if (!this.data.selectedDate) return wx.showToast({ title: copy.guide.chooseDate, icon: 'none' });
    if (!route) return wx.showToast({ title: copy.validation.route, icon: 'none' });
    if (!contact) return wx.showToast({ title: copy.validation.contact, icon: 'none' });
    if (form.contactType === 'phone' && !/^1[3-9]\d{9}$/.test(contact)) {
      return wx.showToast({ title: copy.validation.phoneFormat, icon: 'none' });
    }
    if (this.data.submitting) return;

    const app = getApp();
    const apiBase = (app.globalData.apiBase || '').replace(/\/$/, '');
    if (!apiBase) {
      return wx.showModal({
        title: copy.submitFailed,
        content: copy.validation.notConfigured,
        confirmText: copy.know,
        showCancel: false
      });
    }

    const payload = {
      source: 'miniprogram',
      platform: 'wechat-miniprogram',
      leadType: 'guide-booking',
      guideSlug: this.data.guide.id || this.guideId || 'richard-li',
      guideId: this.data.guide.id || this.guideId || 'richard-li',
      countryId: content.getSelectedCountryId(),
      destination: content.countryName((content.getCountries() || []).find((item) => item.id === content.getSelectedCountryId()), this.data.locale) || '希腊',
      bookingDate: this.data.selectedDate,
      duration: this.data.selectedDuration,
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
            title: copy.feedback.bookingSubmitted,
            content: copy.feedback.bookingSubmittedDesc,
            confirmText: copy.okay,
            showCancel: false,
            success: () => this.setData({ 'form.route': '', 'form.contact': '' })
          });
          return;
        }
        wx.showModal({
          title: copy.feedback.submitError,
          content: leadErrorMessage(res),
          confirmText: copy.know,
          showCancel: false
        });
      },
      fail: () => {
        wx.showModal({
          title: copy.networkError,
          content: copy.feedback.networkError,
          confirmText: copy.know,
          showCancel: false
        });
      },
        complete: () => {
          this.setData({ submitting: false });
        }
      });
    }, () => this.setData({ submitting: false }));
  },

});
