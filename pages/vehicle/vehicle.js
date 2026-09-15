// 服务3：在地用车资源对接咨询
const { isSuccessfulLeadResponse, leadErrorMessage } = require('../../utils/lead-api');
const auth = require('../../utils/auth');
const app = getApp();
const { buildShareCard } = require('../../utils/share');

Page({
  data: {
    statusBarHeight: 20,
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
    const { form } = this.data;
    const route = form.route.trim();
    const contact = form.contact.trim();
    if (!route) return wx.showToast({ title: '请填写用车路线或需求', icon: 'none' });
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
      leadType: 'vehicle-consultation',
      destination: '希腊',
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
            title: '咨询已提交',
            content: '顾问将在24小时内联系您，说明车型、路线与对接方式。',
            confirmText: '好的',
            showCancel: false,
            success: () => this.setData({ 'form.route': '', 'form.contact': '' })
          });
          return;
        }
        wx.showModal({ title: '提交失败', content: leadErrorMessage(res), confirmText: '知道了', showCancel: false });
      },
      fail: () => wx.showModal({ title: '网络异常', content: '当前网络无法连接咨询服务，请检查网络后重试。', confirmText: '知道了', showCancel: false }),
        complete: () => this.setData({ submitting: false })
      });
    }, () => this.setData({ submitting: false }));
  }
});
