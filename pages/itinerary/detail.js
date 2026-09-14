// 行程详情页
// type=reference：参考行程（简单版），id 从 /api/content 的 sampleItineraries 查
// type=custom：定制行程链接（详细版），token 从 /api/trip/:token 拉取（后端私密链接）
// 本地镜像兜底：接口不可用时按 id 匹配（如 PT202610-08 样例）
const content = require('../../data/content');
const mirror = require('../../data/mirror-itineraries');
const { SERVICE_KEYS } = require('../../data/mirror-itineraries');
const { buildShareCard } = require('../../utils/share');

// 统一后端 customTrips 结构 → 页面结构
// 后端字段：orderNo/period/travelers/language/vehicle/guide/totalFee/days[{date,city,slots}] /notices
function adaptCustomTrip(trip) {
  const header = [
    { label: '行程日期 / ITINERARY PERIOD', value: trip.period },
    { label: '订单编号 / ITINERARY NUMBER', value: trip.orderNo },
    { label: '旅客人数 / NUMBER OF VISITORS', value: trip.travelers },
    { label: '语种需求 / PREFERRED LANGUAGES', value: trip.language },
    { label: '计划车型 / PLANNED VEHICLE', value: trip.vehicle },
    { label: '推荐司导 / PRIVATE TOUR GUIDE', value: trip.guide }
  ];
  const schedule = (trip.days || []).map((day, index) => ({
    no: index + 1,
    date: day.date,
    stay: day.city,
    entries: (day.slots || []).map((slot) => ({
      period: slot.period,
      services: slot.services || [],
      attractionIds: slot.attractionIds || [],
      text: ((slot.time ? slot.time + ' ' : '') + slot.text + (slot.desc ? '\n' + slot.desc : '')).trim()
    }))
  }));
  return {
    ...trip,
    type: 'custom',
    id: trip.id,
    token: trip.token || '',
    title: trip.title,
    img: '/assets/images/hero/hero-santorini.jpg',
    period: trip.period,
    days: (trip.days || []).length,
    header,
    fee: trip.totalFee,
    schedule,
    notices: trip.notices || []
  };
}

// 给行程条目挂上景点名称，供 wxml 渲染可点击的景点标签
function decorate(itinerary) {
  if (!itinerary) return null;
  const schedule = (itinerary.schedule || []).map((day) => ({
    ...day,
    key: day.no || day.day,
    entries: (day.entries || []).map((entry) => ({
      ...entry,
      spots: content.getAttractionNames(entry.attractionIds || [])
    }))
  }));
  return { ...itinerary, schedule };
}

function applyItinerary(itinerary, statusBarHeight) {
  if (!itinerary) {
    wx.showToast({ title: '未找到该行程', icon: 'none' });
    return setTimeout(() => wx.navigateBack({ delta: 1 }), 800);
  }
  this.setData({
    statusBarHeight: statusBarHeight || this.data.statusBarHeight,
    itinerary: decorate(itinerary),
    isCustom: itinerary.type === 'custom'
  });
}

Page({
  data: {
    statusBarHeight: 20,
    itinerary: null,
    serviceKeys: SERVICE_KEYS,
    isCustom: false
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const statusBarHeight = sys.statusBarHeight || 20;
    const id = (options && options.id) || '';
    const token = (options && options.token) || '';

    if (token) {
      // 定制行程私密链接：从后端 /api/trip/:token 拉取
      this.fetchTripByToken(token, statusBarHeight);
      return;
    }

    // id：先查本地镜像（含参考行程与定制样例），接口内容就绪后可再查 sampleItineraries
    const local = mirror.getItinerary(id);
    applyItinerary.call(this, local, statusBarHeight);
    if (!local) {
      // 非本地 id，尝试接口 sampleItineraries
      content.loadContent((data) => {
        const remote = (data.sampleItineraries || []).find((item) => item.id === id);
        if (remote) applyItinerary.call(this, remote, statusBarHeight);
      });
    }
  },

  fetchTripByToken(token, statusBarHeight) {
    const app = getApp();
    const base = (app && app.globalData && app.globalData.apiBase) || 'https://sy-greece.com';
    wx.request({
      url: base + '/api/trip/' + token,
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.days) {
          applyItinerary.call(this, adaptCustomTrip(res.data), statusBarHeight);
        } else {
          wx.showToast({ title: (res.data && res.data.error) || '行程链接无效或已失效', icon: 'none' });
          setTimeout(() => wx.navigateBack({ delta: 1 }), 1200);
        }
      },
      fail: () => {
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
        setTimeout(() => wx.navigateBack({ delta: 1 }), 1200);
      }
    });
  },

  // 分享即行程链接：定制行程分享卡片带 token，客户点开直接看到自己的详细行程
  onShareAppMessage() {
    const it = this.data.itinerary;
    const param = it && it.token ? 'token=' + it.token : 'id=' + (it ? it.id : '');
    return {
      title: (it ? it.title : '行程') + ' · 只为一生美好回忆',
      path: '/pages/itinerary/detail?' + param,
      imageUrl: it ? it.img : undefined
    };
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onSpotTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/attraction/detail?id=' + id });
  },

  onCtaTap() {
    wx.switchTab({ url: '/pages/customize/customize' });
  }
});
