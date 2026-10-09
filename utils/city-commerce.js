const paid = require('./paid-content');

function includesId(items, id) {
  return (Array.isArray(items) ? items : []).some((item) => {
    const value = typeof item === 'string' ? item : item && (item.cityId || item.id);
    return String(value || '') === String(id || '');
  });
}

function hasCityAccess(entitlements, cityId) {
  return Boolean(entitlements && (entitlements.member || includesId(entitlements.unlockedCities, cityId)));
}

function buildPurchaseOptions(products, cityName, copy) {
  const source = products || {};
  const labels = copy || {};
  return [
    { product: 'city', title: `${cityName || ''} ${labels.cityPlanTitle || '城市导览包'}`.trim(), description: labels.cityPlanDesc || '', featured: false },
    { product: 'annualMembership', title: labels.annualPlanTitle || '年会员', description: labels.annualPlanDesc || '', featured: true }
  ].map((option) => {
    const item = source[option.product];
    const available = Boolean(item && item.enabled !== false && item.price !== undefined && item.price !== null && String(item.price).trim() !== '');
    return {
      ...option,
      available,
      priceDisplay: available ? paid.productPriceDisplay(item) : (labels.priceUnavailable || '价格待后台配置')
    };
  });
}

function loadCityState(cityId, callback) {
  let config = null;
  let entitlements = null;
  let configDone = false;
  let entitlementsDone = false;
  const finish = () => {
    if (!configDone || !entitlementsDone) return;
    const product = config && config.products && config.products.city;
    callback({
      config,
      entitlements,
      products: config && config.products || {},
      priceDisplay: paid.productPriceDisplay(product),
      unlocked: hasCityAccess(entitlements, cityId),
      member: Boolean(entitlements && entitlements.member),
      simulation: Boolean(config && config.simulation)
    });
  };
  paid.fetchConfig((ok, value) => { config = ok ? value : null; configDone = true; finish(); });
  paid.fetchEntitlements((ok, value) => { entitlements = ok ? value : null; entitlementsDone = true; finish(); });
}

module.exports = { hasCityAccess, buildPurchaseOptions, loadCityState };
