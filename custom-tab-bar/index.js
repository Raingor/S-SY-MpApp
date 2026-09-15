// 自定义胶囊式 TabBar：首页 / 立即联系（凸起主按钮）/ 我的
const i18n = require('../utils/i18n');

Component({
  data: {
    selected: 0,
    list: []
  },
  lifetimes: {
    attached() {
      this.refreshLocale();
    }
  },
  methods: {
    refreshLocale() {
      const copy = i18n.getMessages();
      this.setData({
        list: [
          { pagePath: '/pages/index/index', text: copy.home, icon: 'home' },
          { pagePath: '/pages/customize/customize', text: copy.contact, icon: 'contact' },
          { pagePath: '/pages/profile/profile', text: copy.mine, icon: 'user' }
        ]
      });
    },
    switchTab(e) {
      const path = e.currentTarget.dataset.path;
      const index = e.currentTarget.dataset.index;
      // 标记本次为 tab 切换：目标页 onShow 据此回到顶部
      const app = getApp();
      if (app && app.globalData) app.globalData.pendingTabReset = true;
      wx.switchTab({ url: path });
      this.setData({ selected: index });
    }
  }
});
