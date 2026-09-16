// P2 行程资讯咨询页：深蓝引导横幅 + 结构化问卷 + 中文顾问卡片
const { isSuccessfulLeadResponse, leadErrorMessage } = require('../../utils/lead-api');
const auth = require('../../utils/auth');
const app = getApp();
const { buildShareCard } = require('../../utils/share');
const i18n = require('../../utils/i18n');
const { getThemeCategories } = require('../../data/customization-themes');

function formOptions(locale) {
  if (locale === 'en') return {
    days: ['3–4 days', '5–6 days', '7–9 days', '10+ days'],
    budget: ['Under ¥15k', '¥15k–25k', '¥25k–40k', 'Over ¥40k'],
    people: ['1 person', '2 people', '3–5 people', '6+ people'],
    carDistance: ['Any distance', 'Up to 2 hours/day', 'Up to 4 hours/day', 'Up to 6 hours/day']
  };
  if (locale === 'zh-TW') return {
    days: ['3-4天', '5-6天', '7-9天', '10天以上'],
    budget: ['1.5萬以內', '1.5-2.5萬', '2.5-4萬', '4萬以上'],
    people: ['1人', '2人', '3-5人', '6人以上'],
    carDistance: ['不限車程', '單日不超過2小時', '單日不超過4小時', '單日不超過6小時']
  };
  return { days: ['3-4天', '5-6天', '7-9天', '10天以上'], budget: ['1.5萬以內', '1.5-2.5萬', '2.5-4萬', '4萬以上'], people: ['1人', '2人', '3-5人', '6人以上'], carDistance: ['不限車程', '單日不超過2小時', '單日不超過4小時', '單日不超過6小時'] };
}

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    themeCategories: [],
    form: {
      destination: '',       // 出行目的地
      date: '',              // 出行时间
      days: '',              // 出行天数
      people: '',            // 出行人数
      childAge: '',          // 儿童年龄
      carDistance: '',       // 单日车程上限
      budget: '',            // 人均预算
      themes: [],            // 行程咨询主题（多选）
      desc: '',              // 需求描述
      phone: ''              // 联系电话
    },
    leadType: 'customization',
    daysOptions: ['3-4天', '5-6天', '7-9天', '10天以上'],
    budgetOptions: ['1.5万以内', '1.5-2.5万', '2.5-4万', '4万以上'],
    peopleOptions: ['1人', '2人', '3-5人', '6人以上'],
    carDistanceOptions: ['不限车程', '单日不超过2小时', '单日不超过4小时', '单日不超过6小时'],
    submitting: false,
    consultant: {
      avatar: '/assets/images/misc/jenny-avatar.jpg',
      name: 'Jenny',
      title: '希腊行程规划师',
      wechat: 'SYGJ1130',
      slogan: '只为一生美好回忆',
      phone: '15071465661',
      qr: '/assets/images/misc/jenny-wechat-qr.png'
    }
  },

  onShareAppMessage() {
    return buildShareCard('/pages/customize/customize');
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    this.applyLocale();
    if (options && options.from === 'search') {
      this.setData({ 'form.desc': this.data.i18n.forms.planIntro + '：' });
    }
    if (options && options.from === 'knowledge-base') {
      this.setData({
        leadType: 'knowledge-base',
        'form.desc': this.data.i18n.forms.knowledgeLead + '：'
      });
    }
  },

  onShow() {
    this.applyLocale();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    // tab 切换进入时回到顶部（从子页返回不触发）
    if (app.globalData.pendingTabReset) {
      app.globalData.pendingTabReset = false;
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }
    const pendingLeadType = app.globalData.pendingLeadType;
    this.setData({ leadType: pendingLeadType || 'customization' });
    if (pendingLeadType) {
      this.setData({ 'form.desc': this.data.i18n.forms.knowledgeLead + '：' });
      app.globalData.pendingLeadType = '';
    }
  },

  applyLocale() {
    const copy = i18n.apply(this);
    const locale = i18n.getLocale();
    const options = formOptions(locale);
    this.setData({
      themeCategories: getThemeCategories(locale),
      daysOptions: options.days,
      budgetOptions: options.budget,
      peopleOptions: options.people,
      carDistanceOptions: options.carDistance,
      consultant: { ...this.data.consultant, title: locale === 'en' ? 'Greece Trip Planner' : (locale === 'zh-TW' ? '希臘行程規劃師' : '希腊行程规划师'), slogan: copy.commonSlogan }
    });
  },

  /* ---------- 表单交互 ---------- */
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value });
  },

  onPickerChange(e) {
    const field = e.currentTarget.dataset.field;   // days / people / budget
    const options = e.currentTarget.dataset.options; // 选项数组名
    const idx = Number(e.detail.value);
    this.setData({ [`form.${field}`]: this.data[options][idx] });
  },

  onThemeToggle(e) {
    const theme = e.currentTarget.dataset.theme;
    let themes = this.data.form.themes.slice();
    if (themes.includes(theme)) {
      themes = themes.filter((t) => t !== theme);
    } else {
      themes.push(theme);
    }
    this.setData({ 'form.themes': themes });
  },

  /* ---------- 提交 ---------- */
  onSubmit() {
    const copy = this.data.i18n;
    const { form } = this.data;
    const destination = form.destination.trim();
    const phone = form.phone.trim();
    if (!destination) return wx.showToast({ title: copy.validation.destination, icon: 'none' });
    if (!phone) return wx.showToast({ title: copy.validation.phone, icon: 'none' });
    if (!/^1[3-9]\d{9}$/.test(phone)) return wx.showToast({ title: copy.validation.phoneInvalid, icon: 'none' });
    if (this.data.submitting) return;

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
      leadType: this.data.leadType,
      destination,
      bookingDate: form.date,
      duration: form.days,
      travelers: form.people,
      people: form.people,
      childAge: form.childAge.trim(),
      carDistance: form.carDistance,
      themes: form.themes,
      budget: form.budget,
      route: form.desc.trim(),
      description: form.desc.trim(),
      contactType: 'phone',
      contact: phone
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
            title: copy.feedback.submitted,
            content: copy.feedback.consultSubmitted,
            confirmText: copy.okay,
            showCancel: false,
            success: () => this.setData({
              form: {
                destination: '', date: '', days: '', people: '', childAge: '',
                carDistance: '', budget: '', themes: [], desc: '', phone: ''
              }
            })
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
        complete: () => this.setData({ submitting: false })
      });
    }, () => this.setData({ submitting: false }));
  },

  /* ---------- 定制行程样例链接 ---------- */
  onViewSampleTrip() {
    wx.navigateTo({ url: '/pages/itinerary/detail?id=PT202610-08' });
  },

  /* ---------- 定制师微信卡片 ---------- */
  onCopyWechat() {
    wx.setClipboardData({
      data: this.data.consultant.wechat,
      success: () => wx.showToast({ title: this.data.i18n.copySuccess, icon: 'success' })
    });
  },

  onPreviewQr() {
    wx.previewImage({
      urls: [this.data.consultant.qr]
    });
  },

  onCallPhone() {
    wx.makePhoneCall({
      phoneNumber: this.data.consultant.phone
    });
  }
});
