// P4 名人导游页：Richard 李个人介绍 + 可预约日期 + 专属报价
const GUIDE_WECHAT = 'SY-Greece-Service';

function buildCalendar() {
  const leading = (new Date(2026, 8, 1).getDay() + 6) % 7;
  const states = {
    3: 'available', 8: 'available', 9: 'available',
    12: 'booked', 16: 'available', 17: 'available',
    21: 'booked', 22: 'pending', 24: 'available', 25: 'available'
  };
  const days = [];
  for (let i = 0; i < leading; i += 1) days.push({ key: `blank-leading-${i}`, blank: true });
  for (let day = 1; day <= 30; day += 1) {
    const date = `2026-09-${String(day).padStart(2, '0')}`;
    days.push({ key: date, day, date, state: states[day] || 'unavailable' });
  }
  let trailing = 0;
  while (days.length % 7 !== 0) {
    days.push({ key: `blank-trailing-${trailing}`, blank: true });
    trailing += 1;
  }
  return days;
}

Page({
  data: {
    statusBarHeight: 20,
    guide: {
      avatar: '/assets/images/guide/richard-avatar.jpg',
      name: 'Richard 李',
      role: '名人导游 · 欧洲精品文旅金牌从业者',
      location: 'SIGNATURE GUIDE  /  ATHENS · GREECE',
      intro: '懂希腊历史，也懂一段旅程该如何被记住。',
      wechat: GUIDE_WECHAT
    },
    credentials: [
      { index: '01', title: '名校教育', desc: '武汉大学双学士\n英国澳洲双硕士' },
      { index: '02', title: '资深履历', desc: '资深定制旅行规划师\n欧洲精品文旅金牌从业者' },
      { index: '03', title: '在地资质', desc: '欧盟 · 美国 · 中国\n驾照兼备' }
    ],
    directions: [
      { key: 'history', index: '01', title: '雅典文明', subtitle: '历史与建筑讲解', desc: '从卫城到古市集，把课本里的文明讲成一段有温度的旅程。', suitable: '适合：第一次到访 / 亲子家庭', duration: '半日 · 1日' },
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
    calendarDays: buildCalendar(),
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

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onBookTap() {
    wx.pageScrollTo({ selector: '#booking', duration: 420 });
  },

  onCopyWechat() {
    wx.setClipboardData({
      data: this.data.guide.wechat,
      success: () => wx.showToast({ title: '微信号已复制', icon: 'success' })
    });
  },

  onDateTap(e) {
    const { date, state, day } = e.currentTarget.dataset;
    if (!date || state !== 'available') return;
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const dateObject = new Date(`${date}T00:00:00`);
    this.setData({
      selectedDate: date,
      selectedDateText: `9月${day}日（周${weekdays[dateObject.getDay()]}）`
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
    const { form } = this.data;
    const route = form.route.trim();
    const contact = form.contact.trim();
    if (!route) return wx.showToast({ title: '请填写希望体验的路线', icon: 'none' });
    if (!contact) return wx.showToast({ title: `请填写${form.contactType === 'wechat' ? '微信号' : '手机号'}`, icon: 'none' });
    if (form.contactType === 'phone' && !/^1[3-9]\d{9}$/.test(contact)) {
      return wx.showToast({ title: '手机号格式有误', icon: 'none' });
    }
    if (this.data.submitting) return;

    const app = getApp();
    const apiBase = (app.globalData.apiBase || '').replace(/\/$/, '');
    if (!apiBase) {
      return wx.showModal({
        title: '暂时无法提交',
        content: '预约接口尚未配置，请稍后再试或直接添加微信联系顾问。',
        confirmText: '知道了',
        showCancel: false
      });
    }

    const payload = {
      source: 'miniprogram',
      platform: 'wechat-miniprogram',
      leadType: 'guide-booking',
      guideSlug: 'richard-li',
      destination: '希腊',
      bookingDate: this.data.selectedDate,
      duration: this.data.selectedDuration,
      travelers: form.people,
      people: form.people,
      route,
      contactType: form.contactType,
      contact
    };

    this.setData({ submitting: true });
    wx.request({
      url: `${apiBase}/api/leads`,
      method: 'POST',
      timeout: 15000,
      header: { 'content-type': 'application/json' },
      data: payload,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          wx.showModal({
            title: '预约已提交',
            content: 'Richard 或顾问将在24小时内确认时间，并为您提供专属报价。',
            confirmText: '好的',
            showCancel: false,
            success: () => this.setData({ 'form.route': '', 'form.contact': '' })
          });
          return;
        }
        wx.showModal({
          title: '提交失败',
          content: '预约未能提交成功，请稍后重试或直接添加微信联系顾问。',
          confirmText: '知道了',
          showCancel: false
        });
      },
      fail: () => {
        wx.showModal({
          title: '网络异常',
          content: '当前网络无法连接预约服务，请检查网络后重试。',
          confirmText: '知道了',
          showCancel: false
        });
      },
      complete: () => {
        this.setData({ submitting: false });
      }
    });
  },

});
