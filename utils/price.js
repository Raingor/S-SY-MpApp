// 后台价格展示适配：小程序只显示已明确配置为人民币的价格，不做汇率换算。
function formatCnyPrice(item) {
  if (!item || String(item.currency || '').toUpperCase() !== 'CNY') return '';
  const value = item.priceCny;
  if (value === undefined || value === null || value === '') return '';
  const text = String(value).trim();
  if (!text) return '';
  return text.startsWith('¥') ? text : '¥' + text;
}

module.exports = { formatCnyPrice };
