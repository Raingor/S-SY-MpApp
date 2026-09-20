// 微信用户登录与手机号绑定；微信 AppSecret 只应保存在 Website 服务端。
const i18n = require('./i18n');
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
  const app = getApp();
  return wx.getStorageSync(TOKEN_KEY) || (app.globalData.auth && app.globalData.auth.accessToken) || '';
}

function getCachedUser() {
  const cached = wx.getStorageSync(USER_KEY);
  return cached && typeof cached === 'object' ? cached : getApp().globalData.auth.user;
}

function isSimulationToken(token) {
  return /^sim[-_:]/i.test(String(token || '')) || /^smpv1\./i.test(String(token || ''));
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

// 仅当昵称是用户真实设置（非 fallback 随机名）且与服务端不同步时才回传；
// 「用户XXXX」随机名是本地展示兑底，服务端会拒绝（422 INVALID_NICKNAME）。
function persistNicknameIfNeeded(serverNickname, nickname, done) {
  const isFallback = /^用户\d{4}$/.test(String(nickname || ''));
  if (isFallback) return done();
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
  const copy = i18n.getMessages();
  const apiBase = getApiBase();
  if (!apiBase) return callback(false, null, copy.validation.notConfigured);
  const cached = getCachedUser();
  const loginNickname = resolveNickname('', cached && cached.nickname);
  wx.login({
    success: (loginResult) => {
      if (!loginResult.code) return callback(false, null, copy.networkError);
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
          callback(false, null, copy.networkError);
        },
        fail: () => callback(false, null, copy.networkError)
      });
    },
    fail: () => callback(false, null, copy.networkError)
  });
}

function fetchMe(callback) {
  const copy = i18n.getMessages();
  const token = getAccessToken();
  const apiBase = getApiBase();
  if (!token || !apiBase) return callback(false, null, copy.validation.loginRequired);
  if (isSimulationToken(token)) return callback(true, getCachedUser(), '');
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
      callback(false, null, copy.validation.loginRequired);
    },
    fail: () => callback(false, null, copy.networkError)
  });
}

function bindPhone(code, callback) {
  const copy = i18n.getMessages();
  const token = getAccessToken();
  const apiBase = getApiBase();
  if (!token) return callback(false, null, copy.validation.loginRequired);
  if (!apiBase) return callback(false, null, copy.validation.notConfigured);
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
      callback(false, null, copy.submitFailed);
    },
    fail: () => callback(false, null, copy.networkError)
  });
}

function promptLogin(callback) {
  const copy = i18n.getMessages();
  wx.showModal({
    title: copy.validation.loginRequired,
    content: copy.profile.loginDesc,
    confirmText: copy.profile.wechatLogin,
    cancelText: copy.know,
    success: (res) => {
      if (res.confirm) wx.switchTab({ url: '/pages/profile/profile' });
      callback(false);
    },
    fail: () => callback(false)
  });
}

function promptBindPhone(callback) {
  const copy = i18n.getMessages();
  wx.showModal({
    title: copy.profile.bindPhone,
    content: copy.profile.bindPhoneDesc,
    confirmText: copy.profile.bind,
    cancelText: copy.know,
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
  if (isSimulationToken(token)) return callback(true, getCachedUser());
  // “我的”页每次显示时向服务端确认，避免手机号在其他端绑定后仍显示旧状态。
  fetchMe((ok, user) => callback(ok, user));
}

function requestAuth(path, method, data, callback) {
  const copy = i18n.getMessages();
  const token = getAccessToken();
  const apiBase = getApiBase();
  if (!token || !apiBase) return callback(false, null, copy.validation.loginRequired);
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
      callback(false, res.data || null, (res.data && res.data.error) || copy.submitFailed);
    },
    fail: () => callback(false, null, copy.networkError)
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

function uploadAvatar(filePath, callback) {
  const copy = i18n.getMessages();
  const token = getAccessToken();
  const apiBase = getApiBase();
  if (!token || !apiBase) return callback(false, null, copy.validation.loginRequired);
  if (!filePath) return callback(false, null, copy.profile.avatarChange);
  wx.uploadFile({
    url: `${apiBase}/api/miniprogram/profile/avatar`,
    filePath,
    name: 'file',
    timeout: 30000,
    header: { Authorization: `Bearer ${token}` },
    success: (res) => {
      let data = null;
      try { data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data; } catch (error) {}
      if (res.statusCode >= 200 && res.statusCode < 300 && data && data.user) {
        const savedUser = saveSession(token, {
          ...data.user,
          avatar: data.user.avatarUrl || data.user.avatar || ''
        });
        return callback(true, savedUser, '');
      }
      callback(false, null, (data && data.error) || copy.submitFailed);
    },
    fail: () => callback(false, null, copy.networkError)
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
  uploadAvatar,
  fetchMyLeads,
  fetchMyCollection,
  createMyItem,
  updateMyItem,
  deleteMyItem,
  fetchMyCoupons,
  saveSession,
  clearSession,
  getAppState
};
