// 知识付费能力适配层：只消费 Website/后端真实配置，不在小程序端伪造价格、订单或支付成功。
const auth = require('./auth');

function apiBase() {
  return (getApp().globalData.apiBase || '').replace(/\/$/, '');
}

function request(path, method, data, callback) {
  const token = auth.getAccessToken();
  const headers = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  wx.request({
    url: `${apiBase()}${path}`,
    method: method || 'GET',
    timeout: 15000,
    header: headers,
    data,
    success: (res) => callback(res.statusCode >= 200 && res.statusCode < 300, res.data || {}, res),
    fail: (error) => callback(false, { error: error && error.errMsg }, null)
  });
}

function configFromContent(settings) {
  const source = settings || {};
  const trialSeconds = Number(source.trialSeconds ?? source.videoTrialSeconds ?? source.knowledgeTrialSeconds);
  return {
    trialSeconds: Number.isFinite(trialSeconds) && trialSeconds > 0 ? trialSeconds : 0,
    products: source.products || source.knowledgeProducts || {},
    configured: Number.isFinite(trialSeconds) && trialSeconds > 0
  };
}

function fetchConfig(callback) {
  request('/api/miniprogram/knowledge/config', 'GET', null, (ok, data, res) => {
    if (ok && data) return callback(true, { ...configFromContent(data), ...data }, res);
    callback(false, configFromContent(getApp().globalData.contentSettings), res);
  });
}

function startSimulationSession(phone, callback) {
  const base = apiBase();
  const normalized = String(phone || '').replace(/[^\d+]/g, '');
  if (!base || !/^\+?\d{7,20}$/.test(normalized)) return callback(false, null, { code: 'SIMULATION_PHONE_INVALID' });
  wx.request({
    url: `${base}/api/miniprogram/simulation/session`,
    method: 'POST',
    timeout: 15000,
    header: { 'content-type': 'application/json' },
    data: { phone: normalized },
    success: (res) => {
      const data = res.data || {};
      if (res.statusCode >= 200 && res.statusCode < 300 && data.accessToken && data.user) {
        auth.saveSession(data.accessToken, data.user);
        return callback(true, data.user, data);
      }
      callback(false, null, data);
    },
    fail: (error) => callback(false, null, { error: error && error.errMsg })
  });
}

function fetchEntitlements(callback) {
  request('/api/miniprogram/entitlements', 'GET', null, (ok, data, res) => {
    if (!ok) return callback(false, { simulation: false, member: false, purchases: [], favorites: [], history: [] }, res);
    callback(true, {
      simulation: Boolean(data.simulation),
      member: Boolean(data.member || data.isMember || data.membership),
      memberLabel: data.memberLabel || '',
      purchases: data.purchases || data.unlockedAttractions || [],
      favorites: data.favorites || [],
      history: data.history || [],
      orders: data.orders || []
    }, res);
  });
}

function hasPurchase(entitlements, attractionId) {
  return Boolean((entitlements && entitlements.purchases || []).some((item) => {
    const id = typeof item === 'string' ? item : item && (item.attractionId || item.id);
    return id === attractionId;
  }));
}

function isUnlocked(entitlements, attractionId) {
  return Boolean(entitlements && (entitlements.member || hasPurchase(entitlements, attractionId)));
}

function createOrder(productType, attractionId, callback) {
  request('/api/miniprogram/orders', 'POST', { productType, ...(attractionId ? { attractionId } : {}) }, (ok, data, res) => {
    if (!ok) return callback(false, data, res);
    // 模拟订单明确没有 payment，不得调用 wx.requestPayment，也不能伪造已支付。
    if (data.simulation && data.order && data.order.status === 'pending' && !data.payment) {
      return callback(false, { ...data, code: 'SIMULATION_PAYMENT_PENDING', pendingSimulation: true }, res);
    }
    if (!data.payment) return callback(false, data, res);
    wx.requestPayment({
      ...data.payment,
      success: () => callback(true, { ...data, paymentStatus: 'paid' }, res),
      fail: (error) => callback(false, { ...data, error: error && error.errMsg }, res)
    });
  });
}

function simulateOrderResult(orderId, outcome, callback) {
  const action = outcome === 'failed' ? 'simulate-failed' : 'simulate-paid';
  request(`/api/miniprogram/orders/${encodeURIComponent(orderId)}/${action}`, 'POST', null, (ok, data, res) => {
    callback(ok, data, res);
  });
}

function resetSimulation(callback) {
  request('/api/miniprogram/simulation/reset', 'POST', null, (ok, data, res) => {
    callback(ok, data, res);
  });
}

module.exports = { fetchConfig, startSimulationSession, fetchEntitlements, hasPurchase, isUnlocked, createOrder, simulateOrderResult, resetSimulation };
