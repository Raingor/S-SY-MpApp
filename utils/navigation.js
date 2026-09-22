// 页面从分享卡片冷启动时可能没有上一页，统一提供返回兜底。
const TAB_PAGES = new Set([
  '/pages/index/index',
  '/pages/customize/customize',
  '/pages/profile/profile'
]);

function goBack(fallback = '/pages/index/index') {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  if (pages.length > 1) return wx.navigateBack({ delta: 1 });
  if (TAB_PAGES.has(fallback)) return wx.switchTab({ url: fallback });
  wx.reLaunch({ url: fallback });
}

module.exports = { goBack };
