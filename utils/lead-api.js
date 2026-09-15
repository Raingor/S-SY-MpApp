// 留资接口响应校验：避免网站前端 fallback 返回 HTML 200 时被误判为提交成功。
const i18n = require('./i18n');
function isSuccessfulLeadResponse(res) {
  if (!res || res.statusCode < 200 || res.statusCode >= 300) return false;
  if (res.statusCode === 204) return true;

  const headers = res.header || {};
  const contentTypeKey = Object.keys(headers).find((key) => key.toLowerCase() === 'content-type');
  const contentType = contentTypeKey ? headers[contentTypeKey] : '';
  if (contentType) return /json/i.test(contentType);
  return Boolean(res.data && typeof res.data === 'object');
}

function leadErrorMessage(res) {
  const copy = i18n.getMessages();
  const code = res && res.data && res.data.code;
  if ((res && res.statusCode === 401) || code === 'MINIPROGRAM_LOGIN_REQUIRED') return copy.validation.loginRequired;
  if ((res && res.statusCode === 403) || code === 'PHONE_BIND_REQUIRED') return copy.profile.bindPhoneDesc;
  if (res && res.statusCode === 422) return (res.data && res.data.error) || copy.submitFailed;
  if (res && res.statusCode >= 500) return copy.networkError;
  return (res && res.data && res.data.error) || copy.submitFailed;
}

module.exports = { isSuccessfulLeadResponse, leadErrorMessage };
