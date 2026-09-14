// 行程详情页
// type=reference：页面直接展示的参考行程（简单版）
// type=custom：定制行程链接（详细版，参数对齐定制旅程表），分享路径带 id 即行程链接
const { getItinerary, SERVICE_KEYS } = require('../../data/itineraries');
const { getAttractionNames } = require('../../data/attractions');
const { buildShareCard } = require('../../utils/share');

// 给行程条目挂上景点名称，供 wxml 渲染可点击的景点标签
function decorate(itinerary) {
  if (!itinerary) return null;
  const schedule = (itinerary.schedule || []).map((day) => ({
    ...day,
    key: day.no || day.day,
    entries: (day.entries || []).map((entry) => ({
      ...entry,
      spots: getAttractionNames(entry.attractionIds || [])
    }))
  }));
  return { ...itinerary, schedule };
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
    const itinerary = decorate(getItinerary((options && options.id) || ''));
    if (!itinerary) {
      wx.showToast({ title: '未找到该行程', icon: 'none' });
      return setTimeout(() => wx.navigateBack({ delta: 1 }), 800);
    }
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      itinerary,
      isCustom: itinerary.type === 'custom'
    });
  },

  // 分享即行程链接：定制行程分享卡片带 id，客户点开直接看到自己的详细行程
  onShareAppMessage() {
    const it = this.data.itinerary;
    return {
      title: (it ? it.title : '行程') + ' · 只为一生美好回忆',
      path: '/pages/itinerary/detail?id=' + (it ? it.id : ''),
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
