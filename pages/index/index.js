// P1 首页：品牌头图轮播 / 五大服务入口 / 甄选路线 / 奢享体验 / 精选目的地 / 品牌页脚
const app = getApp();
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');
const i18n = require('../../utils/i18n');
const { getLuxuryCards } = require('../../data/luxury');

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    // 品牌头图轮播
    heroList: [
      { img: '/assets/images/hero/hero-santorini.jpg' },
      { img: '/assets/images/hero/hero-acropolis.jpg' },
      { img: '/assets/images/hero/hero-couple.jpg' }
    ],
    heroCurrent: 0,
    countries: [],
    selectedCountry: null,
    selectedCountryLabel: '',
    // 六大服务入口
    entries: [
      { key: 'customization', label: '行程定制', desc: '资讯咨询' },
      { key: 'guide', label: '古迹讲解', desc: '预约咨询' },
      { key: 'vehicle', label: '在地用车', desc: '资源对接' },
      { key: 'knowledge', label: '文史知识库', desc: '免费预览' },
      { key: 'business', label: '希腊商旅', desc: '随行咨询' },
      { key: 'travel-guide', label: '出行指南', desc: '实用攻略' }
    ],
    // 导游名片轮播：数据来自后台 /api/content，不再内嵌旧文案，避免后台修改后前台不同步。
    guides: [],
    guideCarouselEnabled: false,
    homeAudio: {
      src: 'https://sy-greece.com/audio/selected-routes-intro.m4a'
    },
    routeAudioPlaying: false,
    routeAudioCurrentTime: '0:00',
    routeAudioProgress: 0,
    routeAudioPreviewEnded: false,
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
    // 奢享体验（初始为简体兜底，applyLocale 会按当前语言覆盖为 data/luxury.js 的文案）
    luxuries: getLuxuryCards('zh-CN')
      .map((item) => ({ ...item, descLines: item.desc.split('\n') })),
    // 精选目的地 - 分类
    destTab: 0,
    destTabs: ['文明溯源', '海岛度假'],
    destinations: []
  },

  onShareAppMessage() {
    return buildShareCard('/pages/index/index');
  },

  getRouteAudioContext() {
    if (!this.routeAudioContext) {
      this.routeAudioContext = wx.createAudioContext('route-audio-player', this);
    }
    return this.routeAudioContext;
  },

  onRouteAudioToggle() {
    if (this.data.routeAudioPreviewEnded) {
      return wx.showToast({ title: this.data.i18n.routeAudio.ended, icon: 'none' });
    }
    const audio = this.getRouteAudioContext();
    if (this.data.routeAudioPlaying) audio.pause();
    else audio.play();
  },

  onRouteAudioPlay() {
    if (this.data.routeAudioPreviewEnded) {
      this.getRouteAudioContext().pause();
      return;
    }
    this.routeAudioRestarting = false;
    if (this.routeAudioRestartTimer) {
      clearTimeout(this.routeAudioRestartTimer);
      this.routeAudioRestartTimer = null;
    }
    this.setData({ routeAudioPlaying: true });
  },

  onRouteAudioPause() {
    // 从头播放时 pause 只是重置流程的一步，不应把最终播放状态覆盖掉。
    if (this.routeAudioRestarting) return;
    this.setData({ routeAudioPlaying: false });
  },

  onRouteAudioTimeUpdate(e) {
    const currentTime = Number(e.detail && e.detail.currentTime) || 0;
    if (this.data.routeAudioPreviewEnded) return;
    if (currentTime < 60) {
      return this.setData({
        routeAudioCurrentTime: this.formatAudioTime(currentTime),
        routeAudioProgress: Math.min(100, currentTime / 60 * 100)
      });
    }
    this.getRouteAudioContext().pause();
    this.setData({
      routeAudioPreviewEnded: true,
      routeAudioPlaying: false,
      routeAudioCurrentTime: '1:00',
      routeAudioProgress: 100
    });
    wx.showToast({ title: this.data.i18n.routeAudio.ended, icon: 'none' });
  },

  onRouteAudioEnded() {
    this.setData({ routeAudioPlaying: false });
  },

  onRouteAudioRestart() {
    const audio = this.getRouteAudioContext();
    this.routeAudioRestarting = true;
    if (this.routeAudioRestartTimer) clearTimeout(this.routeAudioRestartTimer);
    audio.pause();
    audio.seek(0);
    this.setData({
      routeAudioPlaying: false,
      routeAudioCurrentTime: '0:00',
      routeAudioProgress: 0,
      routeAudioPreviewEnded: false
    }, () => {
      // pause → seek → play 分步执行，避免 audio 组件合并 action 导致无法暂停或未回到 0 秒。
      this.routeAudioRestartTimer = setTimeout(() => {
        audio.seek(0);
        audio.play();
        // 某些基础库在音频异常时不派发 play，避免重启锁永久阻塞暂停。
        this.routeAudioRestartTimer = setTimeout(() => {
          this.routeAudioRestarting = false;
          this.routeAudioRestartTimer = null;
        }, 1200);
      }, 80);
    });
  },

  formatAudioTime(seconds) {
    const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(totalSeconds / 60);
    const remainder = String(totalSeconds % 60).padStart(2, '0');
    return minutes + ':' + remainder;
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      guideCarouselEnabled: this.data.guides.length > 1
    });
    this.applyLocale();
  },

  onShow() {
    this.applyLocale();
    this.applyRemoteContent();
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
    const locale = i18n.getLocale();
    const entries = [
      { key: 'customization', label: copy.customize, desc: copy.consultation },
      { key: 'guide', label: copy.guideService, desc: copy.booking },
      { key: 'vehicle', label: copy.vehicle, desc: copy.resources },
      { key: 'knowledge', label: copy.knowledge, desc: copy.freePreview },
      { key: 'business', label: copy.business, desc: copy.businessSupport },
      { key: 'travel-guide', label: copy.travelGuide, desc: copy.practicalGuide }
    ];
    const localeTabs = [copy.civilization, copy.islands];
    const fallbackLabels = {
      culture: copy.civilization,
      island: copy.islands
    };
    const localizedDestinations = this.destinationContent
      ? content.getHomeDestinations(this.destinationContent, locale, fallbackLabels)
      : null;
    this.setData({
      entries,
      ...(localizedDestinations
        ? {
            destinations: localizedDestinations,
            destTabs: localizedDestinations.map((group) => group.tab),
            destTab: localizedDestinations.length ? Math.min(this.data.destTab, localizedDestinations.length - 1) : 0
          }
        : { destTabs: localeTabs }),
      luxuries: getLuxuryCards(locale)
        .map((item) => ({ ...item, descLines: item.desc.split('\n') }))
    });
    if (this.data.selectedCountry) {
      this.setData({ selectedCountryLabel: content.countryName(this.data.selectedCountry, this.data.locale) });
    }
    return copy;
  },

  applyRemoteContent() {
    // 第二个参数 true：每次进入首页都重新拉后端，跳过内存缓存，确保后台改目的地/路线后即时同步。
    content.loadContent((data, state) => {
      // 网络离线时保留首页品牌镜像；接口契约错误已由内容服务明确提示，不能继续展示镜像。
      if (state && state.reason === 'offline') return;
      if (data.countryId && data.countryId !== content.getSelectedCountryId()) return;
      this.destinationContent = data;
      const countries = content.getCountries(data);
      const selectedCountry = countries.find((item) => item.id === content.getSelectedCountryId()) || countries[0] || null;
      const guides = content.getGuides(data);
      const destinations = content.getHomeDestinations(data, this.data.locale, {
        culture: this.data.locale === 'en' ? 'Heritage' : this.data.locale === 'zh-TW' ? '文明溯源' : '文明溯源',
        island: this.data.locale === 'en' ? 'Island escapes' : this.data.locale === 'zh-TW' ? '海島度假' : '海岛度假'
      });
      const destTab = destinations.length ? Math.min(this.data.destTab, destinations.length - 1) : 0;
      this.setData({
        countries,
        selectedCountry,
        selectedCountryLabel: content.countryName(selectedCountry, this.data.locale),
        guides: guides,
        guideCarouselEnabled: guides.length > 1,
        routes: content.getReferenceList(data).slice(0, 4),
        destTabs: destinations.map((group) => group.tab),
        destTab,
        destinations
      });
    }, true);
  },

  onCountryTap() {
    const countries = this.data.countries || [];
    if (countries.length < 2) return;
    wx.showActionSheet({
      itemList: countries.map((item) => content.countryName(item, this.data.locale)),
      success: (res) => {
        const next = countries[res.tapIndex];
        if (!next || next.id === content.getSelectedCountryId()) return;
        content.setSelectedCountryId(next.id);
        this.setData({ selectedCountry: next, selectedCountryLabel: content.countryName(next, this.data.locale), destTab: 0 });
        this.applyRemoteContent();
      }
    });
  },

  // 轮播切换
  onHeroChange(e) {
    this.setData({ heroCurrent: e.detail.current });
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

  // 奢享体验：先浏览服务详情，再进入咨询。
  onLuxuryTap(e) {
    const type = e.currentTarget.dataset.id === 'yacht' ? 'yacht' : 'jet';
    wx.navigateTo({ url: '/pages/luxury/detail?type=' + type });
  },

  // 导游名片轮播：使用 item 的路径，后续可直接增加更多名片。
  onGuideTap(e) {
    const guide = this.data.guides[e.currentTarget.dataset.index || 0];
    if (guide && guide.path) wx.navigateTo({ url: guide.path });
  },

  // 目的地分类切换
  onDestTab(e) {
    this.setData({ destTab: Number(e.currentTarget.dataset.index) });
  },

  // 只使用后台显式关联的景点 ID，不按目的地名称或数组位置猜测。
  onDestTap(e) {
    const id = e.currentTarget.dataset.attractionId;
    const data = this.destinationContent;
    const spot = id && data && data.countryId === content.getSelectedCountryId()
      ? content.getAttraction(id, data) : null;
    if (!spot || (spot.countryId && spot.countryId !== data.countryId)) {
      wx.showToast({ title: '该目的地暂无景点详情', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/attraction/detail?id=' + encodeURIComponent(spot.id) });
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
