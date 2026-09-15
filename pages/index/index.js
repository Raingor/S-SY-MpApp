// P1 首页：品牌头图轮播 / 五大服务入口 / 甄选路线 / 奢享体验 / 精选目的地 / 品牌页脚
const app = getApp();
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');
const i18n = require('../../utils/i18n');

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    // 品牌头图轮播
    heroList: [
      { img: '/assets/images/hero/hero-santorini.jpg', title: 'SY 希旅人', en: 'SY TRAVELER' },
      { img: '/assets/images/hero/hero-acropolis.jpg', title: 'SY 希旅人', en: 'SY TRAVELER' },
      { img: '/assets/images/hero/hero-couple.jpg', title: 'SY 希旅人', en: 'SY TRAVELER' }
    ],
    heroCurrent: 0,
    // 六大服务入口
    entries: [
      { key: 'customization', label: '行程定制', desc: '资讯咨询' },
      { key: 'guide', label: '古迹讲解', desc: '预约咨询' },
      { key: 'vehicle', label: '在地用车', desc: '资源对接' },
      { key: 'knowledge', label: '文史知识库', desc: '免费预览' },
      { key: 'business', label: '希腊商旅', desc: '随行咨询' },
      { key: 'travel-guide', label: '出行指南', desc: '实用攻略' }
    ],
    // 名人导游推荐
    guide: {
      avatar: '/assets/images/guide/richard-avatar.jpg',
      eyebrow: 'SIGNATURE GUIDE',
      name: 'Richard 李',
      role: '名人导游 · 欧洲精品文旅金牌从业者',
      proof: '武汉大学双学士 · 英国澳洲双硕士 · 欧盟 / 美国 / 中国驾照'
    },
    // 甄选路线（id 对齐后端 sampleItineraries，点击进入简版参考行程页）
    routes: [
      {
        id: 'sample-athens-3d',
        img: '/assets/images/route/route-athens.jpg',
        name: '3天2晚 · 雅典市区精华',
        tag: '短途 · 中转',
        highlights: '卫城日出 / 普拉卡老城漫步 / 国家考古博物馆',
        crowd: '适合：中转停留 / 商务出行'
      },
      {
        id: 'sample-ae-5d',
        img: '/assets/images/route/route-santorini.jpg',
        name: '5天4晚 · 雅典+圣托里尼',
        tag: '蜜月 · 情侣',
        highlights: '伊亚落日 / 蓝顶教堂 / 悬崖海景餐厅',
        crowd: '适合：蜜月婚礼 / 浪漫之旅'
      },
      {
        id: 'sample-family-7d',
        img: '/assets/images/route/route-peloponnese.jpg',
        name: '7天6晚 · 经典三城家庭游',
        tag: '亲子 · 家庭',
        highlights: '纳夫普利翁小镇 / 埃皮达鲁斯古剧场 / 科林斯运河',
        crowd: '适合：亲子家庭 / 轻松度假'
      },
      {
        id: 'sample-heritage-9d',
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

  onShareAppMessage() {
    return buildShareCard('/pages/index/index');
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    this.applyLocale();
    content.loadContent((data, state) => {
      // 网络离线时保留首页品牌镜像；接口契约错误已由内容服务明确提示，不能继续展示镜像。
      if (state && state.reason === 'offline') return;
      this.setData({
        routes: content.getReferenceList(data).slice(0, 4),
        destinations: content.getHomeDestinations(data)
      });
    });
  },

  onShow() {
    this.applyLocale();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
      if (this.getTabBar().refreshLocale) this.getTabBar().refreshLocale();
    }
    // tab 切换进入时回到顶部（从子页返回不触发）
    if (app.globalData.pendingTabReset) {
      app.globalData.pendingTabReset = false;
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }
  },

  applyLocale() {
    const copy = i18n.apply(this);
    const entries = [
      { key: 'customization', label: copy.customize, desc: copy.consultation },
      { key: 'guide', label: copy.guideService, desc: copy.booking },
      { key: 'vehicle', label: copy.vehicle, desc: copy.resources },
      { key: 'knowledge', label: copy.knowledge, desc: copy.freePreview },
      { key: 'business', label: copy.business, desc: copy.businessSupport },
      { key: 'travel-guide', label: copy.travelGuide, desc: copy.practicalGuide }
    ];
    this.setData({ entries, destTabs: [copy.civilization, copy.islands] });
    return copy;
  },

  // 轮播切换
  onHeroChange(e) {
    this.setData({ heroCurrent: e.detail.current });
  },

  // 搜索栏（毛玻璃）
  onSearchTap() {
    wx.navigateTo({ url: '/pages/customize/customize?from=search' });
  },

  // 六大服务入口
  onEntryTap(e) {
    const key = e.currentTarget.dataset.key;
    const routes = {
      customization: () => wx.switchTab({ url: '/pages/customize/customize' }),
      guide: () => wx.navigateTo({ url: '/pages/guide/guide' }),
      vehicle: () => wx.navigateTo({ url: '/pages/vehicle/vehicle' }),
      knowledge: () => wx.navigateTo({ url: '/pages/knowledge/knowledge' }),
      business: () => wx.navigateTo({ url: '/pages/business/business' }),
      'travel-guide': () => wx.navigateTo({ url: '/pages/travel-guide/travel-guide' })
    };
    if (routes[key]) routes[key]();
  },

    // 路线卡 → 简版参考行程页（按天展示核心地点+简短描述）；查看更多 → 参考行程列表
  onRouteTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/itinerary/detail?id=' + id });
    else wx.navigateTo({ url: '/pages/itinerary/index' });
  },

  onMoreRoutes() {
    wx.navigateTo({ url: '/pages/itinerary/index' });
  },

  // 定制行程入口：填写需求，获取专属方案
  onCustomTripTap() {
    wx.switchTab({ url: '/pages/customize/customize' });
  },

  // 路线卡 / 奢享卡：电询
  onInquiryTap() {
    wx.switchTab({ url: '/pages/customize/customize' });
  },

  // 名人导游页
  onGuideTap() {
    wx.navigateTo({ url: '/pages/guide/guide' });
  },

  // 目的地分类切换
  onDestTab(e) {
    this.setData({ destTab: Number(e.currentTarget.dataset.index) });
  },

  // 目的地瓷贴 → 景点区（城市选择）
  onDestTap() {
    wx.navigateTo({ url: '/pages/knowledge/knowledge' });
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
