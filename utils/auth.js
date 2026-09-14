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
  wx.setStorageSync(TOKEN_KEY, accessToken);
  wx.setStorageSync(USER_KEY, user);
  const state = getApp().globalData.auth;
  state.accessToken = accessToken;
  state.user = user;
}

function clearSession() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(USER_KEY);
  const state = getApp().globalData.auth;
  state.accessToken = '';
  state.user = null;
}

function login(callback) {
  const apiBase = getApiBase();
  if (!apiBase) return callback(false, null, '登录接口尚未配置');
  wx.login({
    success: (loginResult) => {
      if (!loginResult.code) return callback(false, null, '微信登录凭证获取失败');
      wx.request({
        url: `${apiBase}/api/miniprogram/auth/wx-login`,
        method: 'POST',
        timeout: 15000,
        header: { 'content-type': 'application/json' },
        data: { code: loginResult.code },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.accessToken && res.data.user) {
            saveSession(res.data.accessToken, res.data.user);
            return callback(true, res.data.user);
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
        saveSession(token, res.data.user);
        return callback(true, res.data.user);
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
        saveSession(token, res.data.user);
        return callback(true, res.data.user);
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

module.exports = {
  getAccessToken,
  getCachedUser,
  login,
  fetchMe,
  bindPhone,
  ensurePhoneBound,
  getUserState,
  clearSession,
  getAppState
};
