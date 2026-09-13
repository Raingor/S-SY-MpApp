// P3 我的页面：渐变头部 / 会员信息 / 数据行 / 服务单元格 / 资料与帮助
Page({
  data: {
    statusBarHeight: 20,
    user: {
      nickname: '希腊旅人',
      avatar: '/assets/images/misc/consultant-avatar.png',
      member: 'SY 尊享会员'
    },
    stats: [
      { label: '行程', value: 2 },
      { label: '收藏', value: 12 },
      { label: '优惠券', value: 3 },
      { label: '积分', value: 580 }
    ],
    // 服务单元格卡
    services: [
      { key: 'orders', label: '我的订单', badge: '' },
      { key: 'trips', label: '我的行程', badge: '进行中 1' },
      { key: 'coupons', label: '优惠券', badge: '3 张可用' }
    ],
    // 资料与帮助卡
    helps: [
      { key: 'travelers', label: '常用出行人' },
      { key: 'visa', label: '护照签证资料' },
      { key: 'service', label: '联系客服' },
      { key: 'about', label: '关于我们 · sy-greece.com' }
    ]
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  onServiceTap(e) {
    const key = e.currentTarget.dataset.key;
    switch (key) {
      case 'orders':
        wx.showToast({ title: '订单功能开发中', icon: 'none' });
        break;
      case 'trips':
        wx.showToast({ title: '行程功能开发中', icon: 'none' });
        break;
      case 'coupons':
        wx.showToast({ title: '暂无新优惠券', icon: 'none' });
        break;
    }
  },

  onHelpTap(e) {
    const key = e.currentTarget.dataset.key;
    switch (key) {
      case 'travelers':
        wx.showToast({ title: '出行人资料开发中', icon: 'none' });
        break;
      case 'visa':
        wx.showToast({ title: '签证指引开发中', icon: 'none' });
        break;
      case 'service':
        wx.switchTab({ url: '/pages/customize/customize' });
        break;
      case 'about':
        wx.setClipboardData({
          data: 'sy-greece.com',
          success: () => wx.showToast({ title: '域名已复制', icon: 'success' })
        });
        break;
    }
  }
});
