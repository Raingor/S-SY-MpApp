const content = require('../../data/content');
const i18n = require('../../utils/i18n');
const paid = require('../../utils/paid-content');
const guideVideo = require('../../utils/guide-video');
const { goBack } = require('../../utils/navigation');
const { buildShareCard } = require('../../utils/share');

function tr(item, key, locale) {
  const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : '';
  return item[key + suffix] || item[key] || '';
}
function duration(value) {
  const seconds = Math.floor(Number(value));
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') : '—';
}

Page({
  data: {
    i18n: i18n.getMessages(),
    locale: 'zh-CN',
    statusBarHeight: 20,
    loading: true,
    failed: false,
    isAlbum: false,
    isHumanities: false,
    album: null,
    sections: [],
    visibleSections: [],
    sectionTabs: [],
    activeSection: 'all',
    visibleEpisodeCount: 0,
    activeEpisodeId: '',
    activeEpisode: null,
    activeEpisodePurchased: false,
    video: null,
    videoOpen: null,
    videoState: 'idle',
    activeTab: 'episodes',
    scrollIntoView: ''
  },
  onLoad(options) {
    this.videoId = options && options.id || '';
    this.attractionId = options && options.attractionId || '';
    this.albumId = options && options.album || '';
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20, isAlbum: Boolean(this.albumId), isHumanities: Boolean(this.albumId) });
  },
  onShow() {
    i18n.apply(this);
    this.refresh();
  },
  refresh() {
    const requestId = (this._loadId || 0) + 1;
    this._loadId = requestId;
    if (!this.albumId && !this.videoId) {
      return this.setData({ loading: false, album: null, video: null, isAlbum: false });
    }
    this.setData({
      loading: true,
      failed: false,
      videoOpen: null,
      videoState: 'idle',
      activeEpisodeId: '',
      activeEpisode: null,
      activeEpisodePurchased: false
    });
    content.loadContent((data, state) => {
      if (requestId !== this._loadId) return;
      if (!state || state.source !== 'remote' || state.status !== 'ready') {
        return this.setData({ loading: false, failed: true });
      }
      if (this.albumId) {
        const album = content.getGuideVideoAlbum(data, this.albumId, this.data.locale);
        if (!album) return this.setData({ loading: false, failed: false, album: null, video: null, isAlbum: true, isHumanities: true });
        this.setAlbum(album);
        return;
      }
      const films = content.getHumanitiesFilms(data, this.data.locale);
      const candidates = this.attractionId
        ? content.getGuideVideos(data, this.attractionId).concat(films)
        : (data.guideVideos || []).concat(films);
      const video = candidates.find((item) => String(item.id) === String(this.videoId)) || null;
      this._spot = video && video.attractionId ? content.getAttraction(video.attractionId, data) : null;
      this.setData({
        isAlbum: false,
        album: null,
        video,
        isHumanities: Boolean(video && video.category === 'humanities'),
        videoOpen: null,
        videoState: 'idle',
        activeTab: 'episodes',
        loading: false,
        failed: false
      });
      this.localize();
      if (video) this.markPurchase(requestId);
    }, true);
  },

  // ---------- 专辑模式：一个专辑 + 分类章节 + 多集节目 ----------
  prepareEpisode(item) {
    const locale = this.data.locale;
    const id = String(item && item.id || '');
    return {
      ...item,
      id,
      purchased: Boolean(item && item.purchased) || Boolean(this._purchased && this._purchased[id]),
      active: false,
      displayTitle: (item && item.displayTitle) || tr(item, 'title', locale),
      displayDescription: (item && item.displayDescription) || tr(item, 'description', locale),
      displayDuration: (item && item.displayDuration) || duration(item && item.durationSeconds)
    };
  },
  buildSections(album) {
    const locale = this.data.locale;
    const rawSections = album && album.sections && album.sections.length
      ? album.sections
      : [{ key: '', title: '', titleTw: '', titleEn: '', sort: 0, episodes: (album && album.episodes) || [] }];
    return rawSections.map((section) => ({
      ...section,
      displayTitle: section.displayTitle || tr(section, 'title', locale) || (section.key || ''),
      episodes: (section.episodes || []).map((item) => this.prepareEpisode(item))
    })).filter((section) => section.episodes.length);
  },
  filterSections(sections, activeSection) {
    const list = (sections || []).filter((section) => section.episodes && section.episodes.length);
    if (!activeSection || activeSection === 'all') return list;
    return list.filter((section) => String(section.key) === String(activeSection));
  },
  markActive(sections, activeId) {
    return (sections || []).map((section) => ({
      ...section,
      episodes: (section.episodes || []).map((item) => ({ ...item, active: String(item.id) === String(activeId) }))
    }));
  },
  visibleCount(sections) {
    return (sections || []).reduce((sum, section) => sum + (section.episodes ? section.episodes.length : 0), 0);
  },
  buildSectionTabs(sections) {
    const allLabel = this.data.i18n.humanitiesFilms.allSections || '';
    const fallback = this.data.i18n.humanitiesFilms.episodes || '';
    return [{ key: 'all', displayTitle: allLabel }].concat((sections || []).map((section) => ({
      key: String(section.key || ''),
      displayTitle: section.displayTitle || fallback
    })));
  },
  setAlbum(album) {
    this._purchased = this._purchased || {};
    const sections = this.buildSections(album);
    const visibleSections = this.filterSections(sections, 'all');
    this.setData({
      isAlbum: true,
      isHumanities: true,
      album,
      sections,
      visibleSections,
      sectionTabs: this.buildSectionTabs(sections),
      activeSection: 'all',
      visibleEpisodeCount: this.visibleCount(visibleSections),
      activeEpisodeId: '',
      activeEpisode: null,
      activeEpisodePurchased: false,
      video: null,
      videoOpen: null,
      videoState: 'idle',
      activeTab: 'episodes',
      loading: false,
      failed: false
    });
  },
  findEpisode(album, id) {
    const key = String(id || '');
    const top = (album && album.episodes) || [];
    const hit = top.find((item) => String(item.id) === key);
    if (hit) return hit;
    const sections = (album && album.sections) || [];
    for (let i = 0; i < sections.length; i += 1) {
      const episode = (sections[i].episodes || []).find((item) => String(item.id) === key);
      if (episode) return episode;
    }
    return null;
  },
  firstEpisode(album) {
    if (album && album.episodes && album.episodes.length) return album.episodes[0];
    const sections = (album && album.sections) || [];
    for (let i = 0; i < sections.length; i += 1) {
      if (sections[i].episodes && sections[i].episodes.length) return sections[i].episodes[0];
    }
    return null;
  },
  selectEpisode(id) {
    const album = this.data.album;
    if (!album) return null;
    const raw = this.findEpisode(album, id);
    if (!raw) return null;
    const episode = this.prepareEpisode(raw);
    episode.active = true;
    const sections = this.markActive(this.data.sections, episode.id);
    const visibleSections = this.filterSections(sections, this.data.activeSection);
    this.setData({
      activeEpisodeId: episode.id,
      activeEpisode: episode,
      activeEpisodePurchased: episode.purchased,
      videoOpen: episode,
      videoState: 'loading',
      sections,
      visibleSections,
      visibleEpisodeCount: this.visibleCount(visibleSections)
    });
    return episode;
  },
  onSectionTap(event) {
    const key = event.currentTarget.dataset.key;
    const activeSection = key === undefined ? 'all' : String(key);
    const sections = this.markActive(this.data.sections, '');
    const visibleSections = this.filterSections(sections, activeSection);
    this.setData({
      activeSection,
      sections,
      visibleSections,
      visibleEpisodeCount: this.visibleCount(visibleSections),
      activeEpisodeId: '',
      activeEpisode: null,
      activeEpisodePurchased: false,
      videoOpen: null,
      videoState: 'idle',
      scrollIntoView: ''
    });
  },
  onEpisodeTap(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    this.selectEpisode(id);
  },
  onAlbumAbout() {
    this.setData({ scrollIntoView: '' });
    this.setData({ scrollIntoView: 'video-intro' });
  },
  handleAlbumAccess(state, videoId) {
    if (!this.data.album || !videoId) return;
    if (state !== 'ready' && state !== 'login' && state !== 'purchase' && state !== 'member') return;
    this._purchased = this._purchased || {};
    const purchased = state === 'ready';
    const changed = Boolean(this._purchased[videoId]) !== purchased;
    this._purchased[videoId] = purchased;
    const activeId = this.data.activeEpisodeId;
    const nextState = String(activeId) === String(videoId) ? state : this.data.videoState;
    // 父页把同一个 episode 对象回写给组件会再次触发鉴权；已购状态没变时必须停下，否则 loading→ready 无限循环（页面频闪）。
    if (!changed) {
      if (nextState !== this.data.videoState) this.setData({ videoState: nextState });
      return;
    }
    const sections = this.buildSections(this.data.album);
    const marked = this.markActive(sections, this.data.activeEpisodeId);
    const visibleSections = this.filterSections(marked, this.data.activeSection);
    const rawActive = this.data.activeEpisodeId ? this.findEpisode(this.data.album, this.data.activeEpisodeId) : null;
    const activeEpisode = rawActive ? this.prepareEpisode(rawActive) : null;
    if (activeEpisode) activeEpisode.active = true;
    const videoOpen = this.data.videoOpen && String(this.data.videoOpen.id) === String(videoId)
      ? { ...this.data.videoOpen, purchased }
      : this.data.videoOpen;
    this.setData({
      sections: marked,
      visibleSections,
      visibleEpisodeCount: this.visibleCount(visibleSections),
      activeEpisode,
      activeEpisodePurchased: activeEpisode ? activeEpisode.purchased : this.data.activeEpisodePurchased,
      videoOpen,
      videoState: nextState
    });
  },

  // ---------- 单集模式：景点 guide-video 或旧 humanities id ----------
  markPurchase(requestId) {
    const purchaseId = (this._purchaseId || 0) + 1;
    this._purchaseId = purchaseId;
    paid.fetchEntitlements((ok, entitlements) => {
      if (requestId !== this._loadId || purchaseId !== this._purchaseId || !this.data.video) return;
      this.setData({ video: { ...this.data.video, purchased: ok && guideVideo.isPurchased(entitlements, this.videoId) } });
    });
  },
  localize() {
    const video = this.data.video;
    if (!video) return;
    const subject = this._spot ? (this.data.locale === 'en' ? this._spot.en || this._spot.name : tr(this._spot, 'name', this.data.locale)) : '';
    this.setData({ video: { ...video, displayTitle: tr(video, 'title', this.data.locale), displaySubject: subject, displayDescription: tr(video, 'description', this.data.locale), displayDuration: duration(video.durationSeconds) } });
  },
  onTabTap(event) {
    const intro = event.currentTarget.dataset.section === 'intro';
    this.setData({ activeTab: intro ? 'intro' : 'episodes', scrollIntoView: '' });
    this.setData({ scrollIntoView: intro ? 'video-intro' : 'video-program' });
  },
  onPlay() {
    if (this.data.isAlbum) return this.onAlbumPlay();
    if (!this.data.video) return;
    if (this.data.failed || this.data.loading) return wx.showToast({ title: this.data.i18n.heritage.networkFailed, icon: 'none' });
    // 先看课程介绍，再点节目/购买按钮；购买与播放始终在本页展开，不弹浮层。
    this.setData({ activeTab: 'episodes', scrollIntoView: '' });
    this.setData({ scrollIntoView: 'video-program' });
    if (!this.data.videoOpen) return this.setData({ videoOpen: this.data.video, videoState: 'loading' });
    const player = this.selectComponent && this.selectComponent('#video-player');
    if (!player) return;
    // 人文影集不提供单独购买入口；只有景点讲解才走购买。
    const actions = { login: 'onLogin', error: 'reload', ready: 'play', member: 'onMember' };
    if (!this.data.isHumanities) actions.purchase = 'onBuy';
    const action = actions[player.data.state];
    if (action) player[action]();
  },
  onAlbumPlay() {
    if (!this.data.album) return;
    if (this.data.failed || this.data.loading) return wx.showToast({ title: this.data.i18n.heritage.networkFailed, icon: 'none' });
    let target = this.data.activeEpisode;
    if (!target) {
      const first = this.firstEpisode(this.data.album);
      if (first) target = this.selectEpisode(first.id);
    }
    if (target && (!this.data.videoOpen || String(this.data.videoOpen.id) !== String(target.id))) {
      this.selectEpisode(target.id);
    }
    this.setData({ scrollIntoView: '' });
    this.setData({ scrollIntoView: 'video-program' });
    const player = this.selectComponent && this.selectComponent('#video-player');
    if (!player) return;
    // 专辑模式只承载人文影集：不展示也不触发单独购买。
    const actions = { login: 'onLogin', error: 'reload', ready: 'play', member: 'onMember' };
    const action = actions[player.data.state];
    if (action) player[action]();
  },
  onVideoAccessChange(event) {
    const state = event.detail && event.detail.state;
    const videoId = event.detail && event.detail.videoId;
    if (this.data.isAlbum) return this.handleAlbumAccess(state, videoId);
    const video = this.data.video;
    if (!video || !this.data.videoOpen || String(videoId) !== String(video.id)) return;
    // 仅服务端 access 的 ready / locked 结果刷新锁标，支付回调本身不解锁。
    const purchased = state === 'ready' ? true : (state === 'login' || state === 'purchase' || state === 'member' ? false : video.purchased);
    this._purchaseId = (this._purchaseId || 0) + 1;
    this.setData({ videoState: state, video: { ...video, purchased } });
  },
  onLogin() {
    const player = this.selectComponent && this.selectComponent('#video-player');
    if (player && player.onLogin) player.onLogin();
  },
  // 年会员专属影集：跳到会员购买页，不在本页出现单独购买入口。
  onMember() {
    wx.navigateTo({ url: '/pages/membership/shop' });
  },
  onBack() { goBack(); },
  onUnload() {
    this._loadId = (this._loadId || 0) + 1;
    this.setData({ videoOpen: null });
  },
  onShareAppMessage() {
    if (this.albumId) return buildShareCard('/pages/video/detail?album=' + encodeURIComponent(this.albumId), this);
    return buildShareCard('/pages/video/detail?id=' + encodeURIComponent(this.videoId || '') + (this.attractionId ? '&attractionId=' + encodeURIComponent(this.attractionId) : ''), this);
  }
});
