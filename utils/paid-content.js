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

function fetchOrders(callback) {
  request('/api/miniprogram/orders', 'GET', null, (ok, data, res) => {
    if (ok && Array.isArray(data.items)) return callback(true, data.items, '', res);
    callback(false, [], (data && data.error) || '暂时无法加载订单', res);
  });
}

function fetchOrder(orderId, callback) {
  if (!orderId) return callback(false, null, '订单编号无效', null);
  request(`/api/miniprogram/orders/${encodeURIComponent(orderId)}`, 'GET', null, (ok, data, res) => {
    if (ok && data && data.order) return callback(true, data.order, '', res);
    callback(false, null, (data && data.error) || '暂时无法加载订单详情', res);
  });
}

function fetchEntitlements(callback) {
  const token = auth.getAccessToken();
  // 免费试看不需要登录；未登录时不要请求需要 Bearer Token 的权益接口，
  // 避免在控制台产生 401，同时保持未购买状态供试看计时逻辑使用。
  if (!token) {
    return callback(false, { simulation: false, member: false, purchases: [], favorites: [], history: [], orders: [] }, null);
  }

  const requestEntitlements = () => request('/api/miniprogram/entitlements', 'GET', null, (ok, data, res) => {
    if (!ok) return callback(false, { simulation: false, member: false, purchases: [], favorites: [], history: [], orders: [] }, res);
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

  // 模拟支付关闭后，旧的本地模拟 Token 不能拿去访问真实支付权益接口。
  // 先读取当前支付配置：模拟环境继续保留模拟会话，真实环境清除旧会话并按游客处理。
  if (auth.isSimulationToken(token)) {
    return fetchConfig((ok, config) => {
      if (ok && config.simulation) return requestEntitlements();
      auth.clearSession();
      callback(false, { simulation: false, member: false, purchases: [], favorites: [], history: [], orders: [] }, null);
    });
  }
  requestEntitlements();
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
    // 即使服务端错误附带 payment，模拟订单也绝不能进入真实微信支付。
    if (data.simulation) {
      return callback(false, { ...data, code: 'SIMULATION_PAYMENT_PENDING', pendingSimulation: Boolean(data.order && data.order.status === 'pending') }, res);
    }
    if (!data.payment) return callback(false, data, res);
    wx.requestPayment({
      ...data.payment,
      success: () => waitForOrder(data.order && data.order.id, 0, (statusData) => {
        if (statusData && statusData.order && statusData.order.status === 'paid') return callback(true, { ...data, ...statusData, paymentStatus: 'paid' }, res);
        if (statusData && statusData.order && statusData.order.status === 'failed') return callback(false, { ...data, ...statusData, code: 'PAYMENT_FAILED' }, res);
        callback(true, { ...data, ...statusData, paymentStatus: 'pending', code: 'PAYMENT_PENDING' }, res);
      }),
      fail: (error) => callback(false, { ...data, error: error && error.errMsg }, res)
    });
  });
}

function waitForOrder(orderId, attempt, callback) {
  if (!orderId) return callback(null);
  request(`/api/miniprogram/orders/${encodeURIComponent(orderId)}`, 'GET', null, (ok, data) => {
    if (ok && data && data.order && ['paid', 'failed', 'closed'].includes(data.order.status)) return callback(data);
    if (attempt >= 7) return callback(ok ? data : null);
    setTimeout(() => waitForOrder(orderId, attempt + 1, callback), 800);
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

module.exports = { fetchConfig, startSimulationSession, fetchOrders, fetchOrder, fetchEntitlements, hasPurchase, isUnlocked, createOrder, simulateOrderResult, resetSimulation };
