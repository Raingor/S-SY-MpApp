// 留资接口响应校验：避免网站前端 fallback 返回 HTML 200 时被误判为提交成功。
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
  const code = res && res.data && res.data.code;
  if ((res && res.statusCode === 401) || code === 'MINIPROGRAM_LOGIN_REQUIRED') return '登录状态已失效，请重新登录';
  if ((res && res.statusCode === 403) || code === 'PHONE_BIND_REQUIRED') return '请先绑定手机号后再提交';
  if (res && res.statusCode === 422) return (res.data && res.data.error) || '提交信息有误，请检查后重试';
  if (res && res.statusCode >= 500) return '咨询服务暂不可用，请稍后重试';
  return (res && res.data && res.data.error) || '提交失败，请稍后重试';
}

module.exports = { isSuccessfulLeadResponse, leadErrorMessage };
