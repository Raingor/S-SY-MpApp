// 微信用户登录与手机号绑定；微信 AppSecret 只应保存在 Website 服务端。
const TOKEN_KEY = 'sy_mp_access_token';
const USER_KEY = 'sy_mp_user';

function getAppState() {
  const app = getApp();
  return app.globalData;
}

function getApiBase() {
  return (getApp().globalData.apiBase || '').replace(/\/$/, '');
}

function getAccessToken() {
  return wx.getStorageSync(TOKEN_KEY) || getApp().globalData.auth.accessToken || '';
}

function getCachedUser() {
  const cached = wx.getStorageSync(USER_KEY);
  return cached && typeof cached === 'object' ? cached : getApp().globalData.auth.user;
}

function saveSession(accessToken, user) {
  // 服务端可能暂时只返回鉴权字段；同一用户的本地昵称/头像继续保留。
  const previous = getCachedUser();
  const nextUser = previous && previous.id === user.id ? { ...previous, ...user } : user;
  wx.setStorageSync(TOKEN_KEY, accessToken);
  wx.setStorageSync(USER_KEY, nextUser);
  const state = getApp().globalData.auth;
  state.accessToken = accessToken;
  state.user = nextUser;
  return nextUser;
}

function fallbackNickname() {
  return `用户${Math.floor(1000 + Math.random() * 9000)}`;
}

function usableNickname(value) {
  const nickname = String(value || '').trim();
  return nickname && nickname !== '微信用户' ? nickname : '';
}

function resolveNickname(serverNickname, cachedNickname) {
  // 本地已保存的昵称优先，避免每次刷新遇到旧接口的“微信用户”时重新随机。
  return usableNickname(cachedNickname) || usableNickname(serverNickname) || fallbackNickname();
}

function persistNicknameIfNeeded(serverNickname, nickname, done) {
  if (usableNickname(serverNickname) === nickname) return done();
  requestAuth('/api/miniprogram/profile', 'PATCH', { nickname }, () => done());
}

function clearSession() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(USER_KEY);
  const state = getApp().globalData.auth;
  state.accessToken = '';
  state.user = null;
}

function login(callback, profile) {
  const apiBase = getApiBase();
  if (!apiBase) return callback(false, null, '登录接口尚未配置');
  const cached = getCachedUser();
  const loginNickname = resolveNickname('', cached && cached.nickname);
  wx.login({
    success: (loginResult) => {
      if (!loginResult.code) return callback(false, null, '微信登录凭证获取失败');
      wx.request({
        url: `${apiBase}/api/miniprogram/auth/wx-login`,
        method: 'POST',
        timeout: 15000,
        header: { 'content-type': 'application/json' },
        data: {
          code: loginResult.code,
          nickname: loginNickname,
          ...(profile && profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {})
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.accessToken && res.data.user) {
            const user = {
              ...res.data.user,
              nickname: resolveNickname(res.data.user.nickname, cached && cached.nickname),
              ...(profile && profile.avatarUrl ? { avatarUrl: profile.avatarUrl, avatar: profile.avatarUrl } : {})
            };
            const savedUser = saveSession(res.data.accessToken, user);
            return callback(true, savedUser);
          }
          callback(false, null, '微信登录服务暂不可用');
        },
        fail: () => callback(false, null, '网络异常，请稍后重试')
      });
    },
    fail: () => callback(false, null, '微信登录凭证获取失败')
  });
}

function fetchMe(callback) {
  const token = getAccessToken();
  const apiBase = getApiBase();
  if (!token || !apiBase) return callback(false, null, '登录状态已失效');
  wx.request({
    url: `${apiBase}/api/miniprogram/auth/me`,
    method: 'GET',
    timeout: 15000,
    header: { Authorization: `Bearer ${token}` },
    success: (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.user) {
        const cached = getCachedUser();
        const user = {
          ...res.data.user,
          nickname: resolveNickname(res.data.user.nickname, cached && cached.nickname),
          ...(res.data.user.avatarUrl ? { avatar: res.data.user.avatarUrl } : {})
        };
        const savedUser = saveSession(token, user);
        return persistNicknameIfNeeded(res.data.user.nickname, user.nickname, () => callback(true, savedUser));
      }
      clearSession();
      callback(false, null, '登录状态已失效');
    },
    fail: () => callback(false, null, '网络异常，请稍后重试')
  });
}

function bindPhone(code, callback) {
  const token = getAccessToken();
  const apiBase = getApiBase();
  if (!token) return callback(false, null, '请先完成微信登录');
  if (!apiBase) return callback(false, null, '绑定接口尚未配置');
  wx.request({
    url: `${apiBase}/api/miniprogram/auth/phone`,
    method: 'POST',
    timeout: 15000,
    header: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    data: { code },
    success: (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.user) {
        const cached = getCachedUser();
        const user = {
          ...res.data.user,
          nickname: resolveNickname(res.data.user.nickname, cached && cached.nickname),
          ...(res.data.user.avatarUrl ? { avatar: res.data.user.avatarUrl } : {})
        };
        const savedUser = saveSession(token, user);
        return persistNicknameIfNeeded(res.data.user.nickname, user.nickname, () => callback(true, savedUser));
      }
      callback(false, null, '手机号绑定失败，请稍后重试');
    },
    fail: () => callback(false, null, '网络异常，请稍后重试')
  });
}

function promptLogin(callback) {
  wx.showModal({
    title: '请先微信登录',
    content: '登录后才能继续使用预约和咨询服务。',
    confirmText: '去登录',
    cancelText: '稍后',
    success: (res) => {
      if (res.confirm) wx.switchTab({ url: '/pages/profile/profile' });
      callback(false);
    },
    fail: () => callback(false)
  });
}

function promptBindPhone(callback) {
  wx.showModal({
    title: '请先绑定手机号',
    content: '为便于顾问确认需求，提交预约或咨询前需要绑定手机号。',
    confirmText: '去绑定',
    cancelText: '稍后',
    success: (res) => {
      if (res.confirm) wx.switchTab({ url: '/pages/profile/profile' });
      callback(false);
    },
    fail: () => callback(false)
  });
}

// 提交表单前调用；ready 回调拿到最新用户和 token，blocked 状态会引导去“我的”。
function ensurePhoneBound(ready, blocked) {
  const token = getAccessToken();
  if (!token) return promptLogin(blocked || (() => {}));
  // 每次提交前都向服务端确认 token 和手机号状态，不信任本地缓存。
  fetchMe((ok, user) => {
    if (!ok) return promptLogin(blocked || (() => {}));
    if (!user.phoneBound) return promptBindPhone(blocked || (() => {}));
    ready(user, token);
  });
}

function getUserState(callback) {
  const token = getAccessToken();
  if (!token) return callback(false, null);
  // “我的”页每次显示时向服务端确认，避免手机号在其他端绑定后仍显示旧状态。
  fetchMe((ok, user) => callback(ok, user));
}

function requestAuth(path, method, data, callback) {
  const token = getAccessToken();
  const apiBase = getApiBase();
  if (!token || !apiBase) return callback(false, null, '请先微信登录');
  wx.request({
    url: `${apiBase}${path}`,
    method,
    timeout: 15000,
    header: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    data,
    success: (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) return callback(true, res.data || {}, '');
      callback(false, res.data || null, (res.data && res.data.error) || '请求失败');
    },
    fail: () => callback(false, null, '网络异常，请稍后重试')
  });
}

function updateProfile(payload, callback) {
  const token = getAccessToken();
  requestAuth('/api/miniprogram/profile', 'PATCH', payload, (ok, data, message) => {
    if (!ok || !data.user) return callback(false, null, message || '个人资料保存失败');
    const savedUser = saveSession(token, data.user);
    callback(true, savedUser, '');
  });
}

function fetchProfile(callback) {
  requestAuth('/api/miniprogram/profile', 'GET', null, (ok, data, message) => {
    if (ok && data.user && data.stats) {
      const cached = getCachedUser();
      const user = {
        ...data.user,
        nickname: resolveNickname(data.user.nickname, cached && cached.nickname),
        ...(data.user.avatarUrl ? { avatar: data.user.avatarUrl } : {})
      };
      const savedUser = saveSession(getAccessToken(), user);
      return persistNicknameIfNeeded(data.user.nickname, user.nickname, () => callback(true, { ...data, user: savedUser }, ''));
    }
    callback(false, null, message || '暂时无法加载个人资料');
  });
}

function fetchMyLeads(options, callback) {
  const query = options || {};
  const params = Object.keys(query)
    .filter((key) => query[key])
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
    .join('&');
  requestAuth(`/api/miniprogram/leads${params ? `?${params}` : ''}`, 'GET', null, (ok, data, message) => {
    if (ok && Array.isArray(data.items)) return callback(true, data.items, '');
    callback(false, [], message || '暂时无法加载记录');
  });
}

function fetchMyCollection(collection, callback) {
  requestAuth(`/api/miniprogram/${collection}`, 'GET', null, (ok, data, message) => {
    if (ok && Array.isArray(data.items)) return callback(true, data.items, '');
    callback(false, [], message || '暂时无法加载资料');
  });
}

function createMyItem(collection, payload, callback) {
  requestAuth(`/api/miniprogram/${collection}`, 'POST', payload, callback);
}

function updateMyItem(collection, itemId, payload, callback) {
  requestAuth(`/api/miniprogram/${collection}/${encodeURIComponent(itemId)}`, 'PATCH', payload, callback);
}

function deleteMyItem(collection, itemId, callback) {
  requestAuth(`/api/miniprogram/${collection}/${encodeURIComponent(itemId)}`, 'DELETE', null, callback);
}

function fetchMyCoupons(callback) {
  requestAuth('/api/miniprogram/coupons', 'GET', null, (ok, data, message) => {
    if (ok && Array.isArray(data.items)) return callback(true, data.items, '');
    callback(false, [], message || '暂时无法加载优惠券');
  });
}

module.exports = {
  getAccessToken,
  getCachedUser,
  login,
  fetchMe,
  bindPhone,
  ensurePhoneBound,
  getUserState,
  fetchProfile,
  updateProfile,
  fetchMyLeads,
  fetchMyCollection,
  createMyItem,
  updateMyItem,
  deleteMyItem,
  fetchMyCoupons,
  clearSession,
  getAppState
};
