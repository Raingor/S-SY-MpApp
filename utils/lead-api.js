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

module.exports = { isSuccessfulLeadResponse };
