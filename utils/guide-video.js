// 游览攻略视频：播放资格与签名 URL 只由服务端 accessUrl 决定；客户端不伪造权益。
const auth = require('./auth');

function apiBase() {
  return (getApp().globalData.apiBase || '').replace(/\/$/, '');
}

// 契约：guideVideo 商品固定 168 CNY；与服务端同值校验，配置不符不展示购买入口。
function productValid(product) {
  return Boolean(product && product.productType === 'guideVideo' &&
    Number(product.price) === 168 && String(product.currency || 'CNY').toUpperCase() === 'CNY');
}

function priceDisplay(product) {
  return productValid(product) ? `¥${Number(product.price).toFixed(2)}` : '';
}

function fetchAccess(video, callback) {
  if (!video || !video.id || !video.accessUrl) return callback(false, null, 400);
  const url = /^https:\/\//i.test(video.accessUrl) ? video.accessUrl : apiBase() + video.accessUrl;
  const token = auth.getAccessToken();
  const headers = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  wx.request({
    url, method: 'GET', timeout: 12000, header: headers,
    success: (res) => {
      const raw = res.data || {};
      if (res.statusCode !== 200 || !raw || typeof raw !== 'object') return callback(false, null, res.statusCode);
      const access = raw.access === 'full' ? 'full' : 'locked';
      const expiresIn = Number(raw.expiresIn);
      callback(true, {
        access,
        reason: raw.reason || '',
        // 完整播放 URL 必须是 HTTPS 签名地址；锁定时绝不保留任何可播地址。
        playUrl: access === 'full' && /^https:\/\//i.test(String(raw.playUrl || '')) ? raw.playUrl : '',
        // 签名 URL 有效期有限（约600s）；缺失/无效视为已过期，播放前必须重新鉴权。
        validUntil: access === 'full' && Number.isFinite(expiresIn) && expiresIn > 0 ? Date.now() + expiresIn * 1000 : (access === 'full' ? -1 : 0),
        unlockedVia: raw.unlockedVia || '',
        product: productValid(raw.product) ? raw.product : null
      }, res.statusCode);
    },
    fail: () => callback(false, null, 0)
  });
}

module.exports = { fetchAccess, productValid, priceDisplay };
