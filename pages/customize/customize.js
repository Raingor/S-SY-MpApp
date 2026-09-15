// P2 行程资讯咨询页：深蓝引导横幅 + 结构化问卷 + 中文顾问卡片
const { isSuccessfulLeadResponse, leadErrorMessage } = require('../../utils/lead-api');
const auth = require('../../utils/auth');
const app = getApp();
const { buildShareCard } = require('../../utils/share');

// 行程资讯咨询主题多选
const THEMES = ['历史文明', '海滩海岛', '餐厅偏好', '特别安排', '体育活动', '高端私旅', '商务', '司导', '翻译'];

Page({
  data: {
    statusBarHeight: 20,
    themes: THEMES,
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
    if (options && options.from === 'search') {
      this.setData({ 'form.desc': '你好，我想了解希腊行程资讯咨询：' });
    }
    if (options && options.from === 'knowledge-base') {
      this.setData({
        leadType: 'knowledge-base',
        'form.desc': '你好，我想咨询景点文史知识库与一对一线上人文咨询：'
      });
    }
  },

  onShow() {
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
      this.setData({ 'form.desc': '你好，我想咨询景点文史知识库与一对一线上人文咨询：' });
      app.globalData.pendingLeadType = '';
    }
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
    const { form } = this.data;
    const destination = form.destination.trim();
    const phone = form.phone.trim();
    if (!destination) return wx.showToast({ title: '请填写出行目的地', icon: 'none' });
    if (!phone) return wx.showToast({ title: '请填写联系电话', icon: 'none' });
    if (!/^1[3-9]\d{9}$/.test(phone)) return wx.showToast({ title: '联系电话格式有误', icon: 'none' });
    if (this.data.submitting) return;

    const apiBase = (app.globalData.apiBase || '').replace(/\/$/, '');
    if (!apiBase) {
      return wx.showModal({
        title: '暂时无法提交',
        content: '咨询接口尚未配置，请稍后再试或直接添加微信联系顾问。',
        confirmText: '知道了',
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
            title: '咨询已提交',
            content: '顾问将在24小时内联系您，进一步确认需求并提供咨询方案。',
            confirmText: '好的',
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
          title: '提交失败',
          content: leadErrorMessage(res),
          confirmText: '知道了',
          showCancel: false
        });
      },
      fail: () => {
        wx.showModal({
          title: '网络异常',
          content: '当前网络无法连接咨询服务，请检查网络后重试。',
          confirmText: '知道了',
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
      success: () => wx.showToast({ title: '微信号已复制', icon: 'success' })
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
