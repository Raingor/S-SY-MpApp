// 仅消费 Website 的鉴权回查，不由前端推断会员或已购权益。
const auth = require('./auth');
const paidContent = require('./paid-content');
function absoluteUrl(value, base) {
  if (typeof value !== 'string' || !value) return '';
  if (value.startsWith('/')) return base + value;
  return /^https:\/\//i.test(value) ? value : '';
}
function getAccess(id, callback) {
  if (!id) return callback(false, null, 404);
  const base = String(getApp().globalData.apiBase || '').replace(/\/$/, '');
  const token = auth.getAccessToken();
  const requestAccess = (accessToken) => {
    const headers = { 'content-type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    wx.request({
      url: `${base}/api/miniprogram/audio/${encodeURIComponent(id)}/access`,
      method: 'GET', timeout: 12000, header: headers,
      success: (response) => {
        const raw = response.data || {};
        if (response.statusCode !== 200 || !raw || typeof raw !== 'object') return callback(false, null, response.statusCode);
        const mode = raw.unlockMode;
        callback(true, {
          mode: ['free', 'attraction', 'membership', 'locked'].includes(mode) ? mode : 'locked',
          access: raw.access === 'full' ? 'full' : 'preview',
          reason: raw.reason || '',
          previewUrl: absoluteUrl(raw.previewUrl, base),
          // 即便服务端意外同时回了签名字段，也只有 access=full 才允许客户端消费。
          fullUrl: raw.access === 'full' ? absoluteUrl(raw.fullUrl, base) : '',
          previewSeconds: Math.min(60, Math.max(0, Number(raw.previewSeconds) || 60))
        }, 200);
      },
      fail: () => callback(false, null, 0)
    });
  };
  if (token && auth.isSimulationToken(token)) {
    // 避免模拟开关关闭后拿陈旧测试 token 请求正式权限；模拟只在明确启用时带 token。
    return paidContent.fetchConfig((ok, config) => {
      if (!ok || !config.simulation) { auth.clearSession(); return requestAccess(''); }
      requestAccess(token);
    });
  }
  requestAccess(token);
}
module.exports = { getAccess };
