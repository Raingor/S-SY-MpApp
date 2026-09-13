// P1 首页：品牌头图轮播 / 四大金刚 / 甄选路线 / 奢享体验 / 精选目的地 / 品牌页脚
const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    // 品牌头图轮播
    heroList: [
      { img: '/assets/images/hero/hero-santorini.jpg', title: 'SY 希腊蔚蓝海岸', en: 'GREECE BLUE COAST' },
      { img: '/assets/images/hero/hero-acropolis.jpg', title: 'SY 希腊蔚蓝海岸', en: 'GREECE BLUE COAST' },
      { img: '/assets/images/hero/hero-couple.jpg', title: 'SY 希腊蔚蓝海岸', en: 'GREECE BLUE COAST' }
    ],
    heroCurrent: 0,
    // 四大金刚
    entries: [
      { key: 'coast', label: '蔚蓝海岸', desc: '爱琴海秘境' },
      { key: 'custom', label: '私人定制', desc: '1v1 方案' },
      { key: 'car', label: '专属用车', desc: '中文司导' },
      { key: 'tools', label: '旅行工具', desc: '签证·汇率' }
    ],
    // 甄选路线
    routes: [
      {
        id: 'r1',
        img: '/assets/images/route/route-athens.jpg',
        name: '3天2晚 · 雅典市区精华',
        tag: '短途 · 中转',
        highlights: '卫城日出 / 普拉卡老城漫步 / 国家考古博物馆',
        crowd: '适合：中转停留 / 商务出行'
      },
      {
        id: 'r2',
        img: '/assets/images/route/route-santorini.jpg',
        name: '5天4晚 · 雅典+圣托里尼',
        tag: '蜜月 · 情侣',
        highlights: '伊亚落日 / 蓝顶教堂 / 私人游艇出海',
        crowd: '适合：蜜月婚礼 / 浪漫之旅'
      },
      {
        id: 'r3',
        img: '/assets/images/route/route-peloponnese.jpg',
        name: '7天6晚 · 伯罗奔尼撒半岛',
        tag: '亲子 · 家庭',
        highlights: '纳夫普利翁小镇 / 埃皮达鲁斯古剧场 / 科林斯运河',
        crowd: '适合：亲子家庭 / 轻松度假'
      },
      {
        id: 'r4',
        img: '/assets/images/route/route-heritage.jpg',
        name: '9天8晚 · 全遗产环游',
        tag: '深度 · 定制',
        highlights: '德尔斐神庙 / 梅黛奥拉修道院 / 四大世遗一网打尽',
        crowd: '适合：深度文化 / 沉浸体验'
      }
    ],
    // 奢享体验
    luxuries: [
      {
        id: 'l1',
        img: '/assets/images/lux/lux-jet.jpg',
        name: '私人包机',
        desc: '雅典—圣岛直达\n海景航线俯瞰基克拉泽斯群岛'
      },
      {
        id: 'l2',
        img: '/assets/images/lux/lux-yacht.jpg',
        name: '游艇出海',
        desc: '帆船/机艇包船\n火山岛浮潜 · 海上落日晚宴'
      }
    ],
    // 精选目的地 - 分类
    destTab: 0,
    destTabs: ['文明溯源', '海岛度假'],
    destinations: [
      {
        tab: '文明溯源',
        tiles: [
          { name: '雅典', en: 'ATHENS', img: '/assets/images/dest/dest-athens.jpg' },
          { name: '德尔斐', en: 'DELPHI', img: '/assets/images/dest/dest-delphi.jpg' },
          { name: '梅黛奥拉', en: 'METEORA', img: '/assets/images/dest/dest-meteora.jpg' },
          { name: '纳夫普利翁', en: 'NAFPLIO', img: '/assets/images/dest/dest-nafplion.jpg' }
        ],
        chips: ['伯罗奔尼撒', '古科林斯', '奥林匹亚', '斯巴达']
      },
      {
        tab: '海岛度假',
        tiles: [
          { name: '圣托里尼', en: 'SANTORINI', img: '/assets/images/dest/dest-santorini.jpg' },
          { name: '米克诺斯', en: 'MYKONOS', img: '/assets/images/dest/dest-mykonos.jpg' },
          { name: '扎金索斯', en: 'ZAKYNTHOS', img: '/assets/images/dest/dest-zakynthos.jpg' },
          { name: '克里特', en: 'CRETE', img: '/assets/images/dest/dest-crete.jpg' }
        ],
        chips: ['科孚岛', '埃伊纳岛', '帕罗斯', '米洛斯']
      }
    ]
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  // 轮播切换
  onHeroChange(e) {
    this.setData({ heroCurrent: e.detail.current });
  },

  // 搜索栏（毛玻璃）
  onSearchTap() {
    wx.navigateTo({ url: '/pages/customize/customize?from=search' });
  },

  // 四大金刚
  onEntryTap(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'custom') {
      wx.switchTab({ url: '/pages/customize/customize' });
    } else {
      // 其余入口暂引导至定制咨询（后续迭代详情页）
      wx.switchTab({ url: '/pages/customize/customize' });
    }
  },

  // 路线卡 / 奢享卡：电询
  onInquiryTap() {
    wx.switchTab({ url: '/pages/customize/customize' });
  },

  // 目的地分类切换
  onDestTab(e) {
    this.setData({ destTab: Number(e.currentTarget.dataset.index) });
  },

  // 目的地瓷贴
  onDestTap() {
    wx.switchTab({ url: '/pages/customize/customize' });
  },

  // 页脚官网（复制域名）
  onSiteTap() {
    wx.setClipboardData({
      data: 'sy-greece.com',
      success: () => {
        wx.showToast({ title: '域名已复制', icon: 'success' });
      }
    });
  }
});
