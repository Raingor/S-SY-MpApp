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
        const finish = (canPlayFull) => callback(true, {
          mode: ['free', 'attraction', 'membership', 'album', 'expert', 'locked'].includes(mode) ? mode : 'locked',
          access: canPlayFull ? 'full' : 'preview',
          reason: raw.reason || '',
          previewUrl: absoluteUrl(raw.previewUrl, base),
          // 即便服务端意外同时回了签名字段，也只有 access=full 才允许客户端消费。
          fullUrl: canPlayFull ? absoluteUrl(raw.fullUrl, base) : '',
          previewSeconds: Math.min(60, Math.max(0, Number(raw.previewSeconds) || 60)),
          // 服务端承诺 access=full 时 expiresIn 有限且为正；缺失/无效值一律视为过期。
          fullUrlValidUntil: canPlayFull && Number.isFinite(Number(raw.expiresIn)) && Number(raw.expiresIn) > 0 ? Date.now() + Number(raw.expiresIn) * 1000 : (canPlayFull ? -1 : 0)
        }, 200);
        // 旧 free/城市/景点授权返回 full 时，也必须由服务端权益确认有效会员。
        // 会员状态只作为收紧权限的门槛；完整 URL 仍必须由 access 接口签发。
        if (raw.access !== 'full') return finish(false);
        paidContent.fetchEntitlements((ok, entitlements) => finish(Boolean(ok && paidContent.isUnlocked(entitlements))));
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
