// 服务5：希腊商旅一站式随行服务
const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
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

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
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
    const { form } = this.data;
    const industryNeeds = form.industryNeeds.trim();
    const contact = form.contact.trim();
    if (!industryNeeds) return wx.showToast({ title: '请填写行业对接需求', icon: 'none' });
    if (!contact) return wx.showToast({ title: `请填写${form.contactType === 'wechat' ? '微信号' : '手机号'}`, icon: 'none' });
    if (form.contactType === 'phone' && !/^1[3-9]\d{9}$/.test(contact)) {
      return wx.showToast({ title: '手机号格式有误', icon: 'none' });
    }
    if (this.data.submitting) return;

    const apiBase = (app.globalData.apiBase || '').replace(/\/$/, '');
    if (!apiBase) return wx.showToast({ title: '咨询接口尚未配置', icon: 'none' });
    const payload = {
      source: 'miniprogram',
      platform: 'wechat-miniprogram',
      leadType: 'business-travel',
      destination: '希腊',
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
    wx.request({
      url: `${apiBase}/api/leads`,
      method: 'POST',
      timeout: 15000,
      header: { 'content-type': 'application/json' },
      data: payload,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          wx.showModal({
            title: '商旅咨询已提交',
            content: '顾问将在24小时内联系您，确认商务周期与语言陪同需求。',
            confirmText: '好的',
            showCancel: false,
            success: () => this.setData({ 'form.industryNeeds': '', 'form.contact': '' })
          });
          return;
        }
        wx.showModal({ title: '提交失败', content: '商旅咨询未能提交，请稍后重试。', confirmText: '知道了', showCancel: false });
      },
      fail: () => wx.showModal({ title: '网络异常', content: '当前网络无法连接咨询服务，请检查网络后重试。', confirmText: '知道了', showCancel: false }),
      complete: () => this.setData({ submitting: false })
    });
  }
});
