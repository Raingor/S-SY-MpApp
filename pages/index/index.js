// P1 首页：品牌头图轮播 / 五大服务入口 / 甄选路线 / 奢享体验 / 精选目的地 / 品牌页脚
const app = getApp();
const content = require('../../data/content');
const { buildShareCard } = require('../../utils/share');
const i18n = require('../../utils/i18n');
const { getLuxuryCards } = require('../../data/luxury');
const { getHomeAudioPreview } = require('../../utils/home-audio');
const CHANNELS_USER_NAME = 'sphh8gpNu8tw4yv';

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    // Hero 图片与文案均来自后端 /api/content 的 home，不内嵌本地内容。
    heroList: [],
    heroCopy: { eyebrow: '', title: '', description: '' },
    heroStatus: 'loading',
    heroCurrent: 0,
    countries: [],
    selectedCountry: null,
    selectedCountryLabel: '',
    // 服务入口只由 Website /api/content 提供；接口缺字段时不伪造本地内容。
    entries: [],
    // 导游名片轮播：数据来自后台 /api/content，不再内嵌旧文案，避免后台修改后前台不同步。
    guides: [],
    guideCarouselEnabled: false,
    humanitiesFilms: [],
    filmCount: 0,
    homeAudio: {
      src: 'https://sy-greece.com/audio/selected-routes-intro.m4a'
    },
    routeAudioPlaying: false,
    routeAudioLoading: false,
    routeAudioCurrentTime: '0:00',
    routeAudioPreviewSeconds: 60,
    routeAudioDuration: '1:00',
    routeAudioPreviewNote: '',
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
    destTabs: [],
    destinations: []
  },

  onShareAppMessage() {
    return buildShareCard('/pages/index/index', this);
  },

  getRouteAudioContext() {
    if (!this.routeAudioContext) {
      const audio = wx.createInnerAudioContext();
      audio.autoplay = false;
      // 语音导览是用户主动点击播放的内容，不受 iOS 静音拨片影响。
      audio.obeyMuteSwitch = false;
      audio.onPlay(() => this.onRouteAudioPlay());
      audio.onPause(() => this.onRouteAudioPause());
      audio.onStop(() => this.onRouteAudioPause());
      audio.onTimeUpdate(() => this.onRouteAudioTimeUpdate());
      audio.onEnded(() => this.onRouteAudioEnded());
      audio.onError(() => this.onRouteAudioError());
      this.routeAudioContext = audio;
    }
    return this.routeAudioContext;
  },

  onRouteAudioToggle() {
    if (this.data.routeAudioLoading) return;
    if (this.data.routeAudioPreviewEnded) {
      return wx.showToast({ title: this.data.i18n.routeAudio.ended, icon: 'none' });
    }
    if (this.data.routeAudioPlaying) return this.getRouteAudioContext().pause();
    if (this.routeAudioSource) return this.playRouteAudio();
    this.loadRouteAudio();
  },

  loadRouteAudio() {
    this.routeAudioIgnoringStopErrors = false;
    const requestId = this.routeAudioRequestId = (this.routeAudioRequestId || 0) + 1;
    this.setData({ routeAudioLoading: true });
    content.loadContent((data, state) => {
      if (requestId !== this.routeAudioRequestId) return;
      const preview = state && state.source === 'remote' && state.status === 'ready' ? getHomeAudioPreview(data, app.globalData.apiBase) : null;
      if (!preview) return this.onRouteAudioError(this.data.i18n.routeAudio.unavailable);
      this.routeAudioSource = preview.previewUrl;
      const audio = this.getRouteAudioContext();
      audio.src = this.routeAudioSource;
      this.setData({ routeAudioPreviewSeconds: preview.previewSeconds, routeAudioDuration: this.formatAudioTime(preview.previewSeconds) });
      this.updateRouteAudioCopy();
      this.playRouteAudio();
    }, true);
  },

  playRouteAudio() {
    this.routeAudioIgnoringStopErrors = false;
    this.setData({ routeAudioLoading: true });
    if (this.routeAudioStartTimer) clearTimeout(this.routeAudioStartTimer);
    this.routeAudioStartTimer = setTimeout(() => this.onRouteAudioError(), 10000);
    this.getRouteAudioContext().play();
  },

  onRouteAudioError(message) {
    if (this.routeAudioHidden || this.routeAudioIgnoringStopErrors) return;
    this.cancelRouteAudioPending();
    this.routeAudioSource = '';
    this.routeAudioIgnoringStopErrors = true;
    if (this.routeAudioContext) this.routeAudioContext.stop();
    this.setData({ routeAudioPlaying: false, routeAudioLoading: false, routeAudioCurrentTime: '0:00', routeAudioProgress: 0 });
    wx.showToast({ title: message || this.data.i18n.routeAudio.error, icon: 'none' });
  },

  cancelRouteAudioPending() {
    this.routeAudioRequestId = (this.routeAudioRequestId || 0) + 1;
    if (this.routeAudioStartTimer) clearTimeout(this.routeAudioStartTimer);
    if (this.routeAudioRestartTimer) clearTimeout(this.routeAudioRestartTimer);
    this.routeAudioStartTimer = null;
    this.routeAudioRestartTimer = null;
    this.setData({ routeAudioLoading: false });
  },

  updateRouteAudioCopy() {
    this.setData({ routeAudioPreviewNote: this.data.i18n.routeAudio.preview.replace('{duration}', this.data.routeAudioDuration) });
  },

  onRouteAudioPlay() {
    if (this.routeAudioHidden || this.data.routeAudioPreviewEnded) {
      if (this.routeAudioContext) this.routeAudioContext.pause();
      return;
    }
    if (this.routeAudioRestartTimer) {
      clearTimeout(this.routeAudioRestartTimer);
      this.routeAudioRestartTimer = null;
    }
    if (this.routeAudioStartTimer) clearTimeout(this.routeAudioStartTimer);
    this.routeAudioStartTimer = null;
    this.setData({ routeAudioPlaying: true, routeAudioLoading: false });
  },

  onRouteAudioPause() {
    if (this.routeAudioStartTimer) clearTimeout(this.routeAudioStartTimer);
    this.routeAudioStartTimer = null;
    this.setData({ routeAudioPlaying: false, routeAudioLoading: false });
  },

  onRouteAudioTimeUpdate() {
    if (this.routeAudioHidden) return;
    if (this.routeAudioStartTimer) clearTimeout(this.routeAudioStartTimer);
    this.routeAudioStartTimer = null;
    const audio = this.routeAudioContext;
    const currentTime = Number(audio && audio.currentTime) || 0;
    if (this.data.routeAudioPreviewEnded) return;
    const limit = this.data.routeAudioPreviewSeconds;
    if (currentTime < limit) {
      return this.setData({
        routeAudioPlaying: true,
        routeAudioLoading: false,
        routeAudioCurrentTime: this.formatAudioTime(currentTime),
        routeAudioProgress: Math.min(100, currentTime / limit * 100)
      });
    }
    this.getRouteAudioContext().pause();
    this.setData({
      routeAudioPreviewEnded: true,
      routeAudioPlaying: false,
      routeAudioCurrentTime: this.data.routeAudioDuration,
      routeAudioProgress: 100
    });
    wx.showToast({ title: this.data.i18n.routeAudio.ended, icon: 'none' });
  },

  onRouteAudioEnded() {
    if (this.routeAudioStartTimer) clearTimeout(this.routeAudioStartTimer);
    this.routeAudioStartTimer = null;
    this.setData({ routeAudioPlaying: false, routeAudioLoading: false, routeAudioPreviewEnded: true, routeAudioCurrentTime: this.data.routeAudioDuration, routeAudioProgress: 100 });
  },

  onRouteAudioMore() {
    wx.navigateTo({ url: '/pages/knowledge/knowledge?panel=1&track=deep' });
  },

  onRouteAudioRestart() {
    this.cancelRouteAudioPending();
    const audio = this.getRouteAudioContext();
    this.routeAudioIgnoringStopErrors = true;
    audio.stop();
    this.setData({
      routeAudioPlaying: false,
      routeAudioCurrentTime: '0:00',
      routeAudioProgress: 0,
      routeAudioPreviewEnded: false
    }, () => {
      this.routeAudioRestartTimer = setTimeout(() => {
        this.routeAudioRestartTimer = null;
        this.routeAudioIgnoringStopErrors = false;
        if (this.routeAudioSource) this.playRouteAudio();
        else this.loadRouteAudio();
      }, 100);
    });
  },

  onUnload() {
    this.routeAudioHidden = true;
    this.cancelRouteAudioPending();
    this.routeAudioIgnoringStopErrors = true;
    if (this.routeAudioContext) {
      this.routeAudioContext.destroy();
      this.routeAudioContext = null;
    }
  },

  onHide() {
    this.routeAudioHidden = true;
    this.cancelRouteAudioPending();
    if (this.routeAudioContext) {
      this.routeAudioContext.pause();
    }
    this.setData({ routeAudioPlaying: false });
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
    this.routeAudioHidden = false;
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
    this.updateRouteAudioCopy();
    const locale = i18n.getLocale();
    const fallbackLabels = {
      culture: copy.civilization,
      island: copy.islands
    };
    const localizedDestinations = this.destinationContent
      ? content.getHomeDestinations(this.destinationContent, locale, fallbackLabels)
      : null;
    this.setData({
      entries: content.getMiniProgramServiceEntries(this.destinationContent, locale),
      ...(this.filmContent ? { humanitiesFilms: content.getHumanitiesAlbums(this.filmContent, locale).slice(0, 3) } : {}),
      ...(localizedDestinations
        ? {
            destinations: localizedDestinations,
            destTabs: localizedDestinations.map((group) => group.tab),
            destTab: localizedDestinations.length ? Math.min(this.data.destTab, localizedDestinations.length - 1) : 0
          }
        : {}),
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
      // 网络离线时不使用硬编码 Hero 冒充后台内容。
      if (state && state.reason === 'offline') {
        this.filmContent = null;
        this.setData({ heroList: [], heroCopy: { eyebrow: '', title: '', description: '' }, heroStatus: 'empty', humanitiesFilms: [], filmCount: 0 });
        return;
      }
      if (data.countryId && data.countryId !== content.getSelectedCountryId()) return;
      this.destinationContent = data;
      this.filmContent = state && state.source === 'remote' && state.status === 'ready' ? data : null;
      const albums = this.filmContent ? content.getHumanitiesAlbums(data, this.data.locale) : [];
      const home = data.home || { eyebrow: '', title: '', description: '', banners: [] };
      const countries = content.getCountries(data);
      const selectedCountry = countries.find((item) => item.id === content.getSelectedCountryId()) || countries[0] || null;
      const guides = content.getGuides(data);
      const entries = content.getMiniProgramServiceEntries(data, this.data.locale);
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
        entries,
        humanitiesFilms: albums.slice(0, 3),
        filmCount: albums.length,
        guideCarouselEnabled: guides.length > 1,
        routes: content.getReferenceList(data).slice(0, 4),
        destTabs: destinations.map((group) => group.tab),
        destTab,
        destinations,
        heroList: Array.isArray(home.banners) ? home.banners : [],
        heroCopy: {
          eyebrow: home.eyebrow || '',
          title: home.title || (home.banners && home.banners[0] && home.banners[0].title) || '',
          description: home.description || (home.banners && home.banners[0] && home.banners[0].description) || ''
        },
        heroStatus: home.banners && home.banners.length ? 'ready' : 'empty',
        heroCurrent: 0
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
    const heroCurrent = Number(e.detail.current) || 0;
    const banner = this.data.heroList[heroCurrent] || {};
    const home = this.destinationContent && this.destinationContent.home ? this.destinationContent.home : {};
    this.setData({
      heroCurrent,
      heroCopy: {
        eyebrow: home.eyebrow || '',
        title: home.title || banner.title || '',
        description: home.description || banner.description || ''
      }
    });
  },

  // Hero 轮播图点击：首页第一张支持后端 link 前缀；attraction/guide-video/guide-video-album/video 都由 Website 下发。
  onHeroTap() {
    if (this.data.heroCurrent !== 0) return;
    const banner = this.data.heroList[this.data.heroCurrent] || {};
    const link = String(banner.link || '');
    if (!link) return;
    const go = (url) => wx.navigateTo({ url });
    if (link.indexOf('attraction:') === 0) {
      const id = decodeURIComponent(link.slice('attraction:'.length));
      if (id) go('/pages/attraction/detail?id=' + encodeURIComponent(id));
      return;
    }
    if (link.indexOf('guide-video-album:') === 0) {
      const id = decodeURIComponent(link.slice('guide-video-album:'.length));
      if (id) go('/pages/video/detail?album=' + encodeURIComponent(id));
      return;
    }
    if (link.indexOf('guide-video:') === 0) {
      const id = decodeURIComponent(link.slice('guide-video:'.length));
      if (id) go('/pages/video/detail?id=' + encodeURIComponent(id));
      return;
    }
    if (link.indexOf('video:') === 0) {
      const parts = link.slice('video:'.length).split(':');
      const id = decodeURIComponent(parts[0] || '');
      const attractionId = decodeURIComponent(parts[1] || '');
      if (id) go('/pages/video/detail?id=' + encodeURIComponent(id) + (attractionId ? '&attractionId=' + encodeURIComponent(attractionId) : ''));
    }
  },

  // 六大服务入口
  onEntryTap(e) {
    const key = e.currentTarget.dataset.key;
    const routes = {
      customization: () => wx.navigateTo({ url: '/pages/service-flow/service-flow' }),
      guide: () => wx.navigateTo({ url: '/pages/guide/guide' }),
      vehicle: () => wx.navigateTo({ url: '/pages/vehicle/vehicle' }),
      knowledge: () => wx.navigateTo({ url: '/pages/knowledge/knowledge' }),
      business: () => wx.navigateTo({ url: '/pages/business/business' }),
      'travel-guide': () => wx.navigateTo({ url: '/pages/travel-guide/travel-guide' })
    };
    if (routes[key]) routes[key]();
  },

  onFilmsTap() { wx.navigateTo({ url: '/pages/video/index' }); },

  onFilmTap(event) {
    const id = event.currentTarget.dataset.id;
    if (!(this.data.humanitiesFilms || []).some((film) => String(film.id) === String(id))) return;
    wx.navigateTo({ url: '/pages/video/detail?album=' + encodeURIComponent(id) });
  },

  onChannelsTap() {
    const copy = this.data.i18n.homeChannels;
    if (typeof wx.openChannelsUserProfile !== 'function') {
      return wx.showToast({ title: copy.unsupported, icon: 'none' });
    }
    wx.openChannelsUserProfile({
      finderUserName: CHANNELS_USER_NAME,
      fail: () => wx.showToast({ title: copy.openFailed, icon: 'none' })
    });
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

  // 定制行程入口：先看服务流程，页尾 CTA 再进留资表单
  onCustomTripTap() {
    wx.navigateTo({ url: '/pages/service-flow/service-flow' });
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

  // 后台图标加载失败时回退当前语言的文字，不影响其他卡片。
  onDestBadgeIconError(e) {
    const { groupIndex, tileIndex } = e.currentTarget.dataset;
    const group = this.data.destinations[groupIndex];
    const tile = group && group.tiles[tileIndex];
    if (!tile || !tile.badge || !tile.badge.icon) return;
    this.setData({ [`destinations[${groupIndex}].tiles[${tileIndex}].badge.icon`]: '' });
  },

  // 精选目的地先进入后台关联城市的景点列表，再由列表进入具体景点。
  onDestTap(e) {
    const cityId = String(e.currentTarget.dataset.cityId || '').trim();
    const data = this.destinationContent;
    const city = cityId && data && data.countryId === content.getSelectedCountryId()
      ? content.getCities(data).find((item) => item.id === cityId)
      : null;
    if (!city) {
      wx.showToast({ title: this.data.locale === 'en' ? 'This destination is unavailable' : '该目的地暂不可用', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/city/spots?id=' + encodeURIComponent(city.id) });
  },

  onCityTap(e) {
    const cityId = String(e.currentTarget.dataset.cityId || '').trim();
    const data = this.destinationContent;
    const city = cityId && data && data.countryId === content.getSelectedCountryId()
      ? content.getCities(data).find((item) => item.id === cityId)
      : null;
    if (city) wx.navigateTo({ url: '/pages/city/index?id=' + encodeURIComponent(city.id) });
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
