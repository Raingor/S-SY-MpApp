// 自定义胶囊式 TabBar：首页 / 立即联系（凸起主按钮）/ 我的
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '首页', icon: 'home' },
      { pagePath: '/pages/customize/customize', text: '立即联系', icon: 'contact' },
      { pagePath: '/pages/profile/profile', text: '我的', icon: 'user' }
    ]
  },
  methods: {
    switchTab(e) {
      const path = e.currentTarget.dataset.path;
      const index = e.currentTarget.dataset.index;
      wx.switchTab({ url: path });
      this.setData({ selected: index });
    }
  }
});
