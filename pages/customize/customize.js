// P2 私人定制留资页：深蓝引导横幅 + 结构化表单 + 定制师微信卡片
const app = getApp();

// 旅行主题多选
const THEMES = ['蜜月婚礼', '亲子家庭', '深度文化', '海岛度假', '美酒美食'];

Page({
  data: {
    statusBarHeight: 20,
    themes: THEMES,
    form: {
      destination: '',       // 出行目的地
      date: '',              // 出行时间
      days: '',              // 出行天数
      people: '',            // 出行人数
      budget: '',            // 人均预算
      themes: [],            // 旅行主题（多选）
      desc: '',              // 需求描述
      phone: ''              // 联系电话
    },
    daysOptions: ['3-4天', '5-6天', '7-9天', '10天以上'],
    budgetOptions: ['1.5万以内', '1.5-2.5万', '2.5-4万', '4万以上'],
    peopleOptions: ['1人', '2人', '3-5人', '6人以上'],
    submitting: false,
    consultant: {
      avatar: '/assets/images/misc/consultant-avatar.png',
      name: 'Elena · 希腊定制师',
      wechat: 'SY-Greece-Service',
      slogan: '添加微信直接沟通 · 平均3分钟回复',
      qr: '/assets/images/misc/wechat-qr.png'
    }
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    if (options && options.from === 'search') {
      this.setData({ 'form.desc': '你好，我想了解希腊定制行程：' });
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
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
    if (!form.destination.trim()) {
      return wx.showToast({ title: '请填写出行目的地', icon: 'none' });
    }
    if (!form.phone.trim()) {
      return wx.showToast({ title: '请填写联系电话', icon: 'none' });
    }
    if (!/^1[3-9]\d{9}$/.test(form.phone.trim())) {
      return wx.showToast({ title: '联系电话格式有误', icon: 'none' });
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });

    // 预留：wx.request 提交到后端留资接口
    console.log('[留资] 提交数据：', form);
    setTimeout(() => {
      this.setData({ submitting: false });
      wx.showModal({
        title: '提交成功',
        content: '定制师已收到您的需求，将在24小时内联系您并出具首版方案。',
        confirmText: '好的',
        showCancel: false,
        success: () => {
          this.setData({
            form: {
              destination: '', date: '', days: '', people: '',
              budget: '', themes: [], desc: '', phone: ''
            }
          });
        }
      });
    }, 600);
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
      phoneNumber: '00302100000000' // 雅典办公室电话（占位）
    });
  }
});
