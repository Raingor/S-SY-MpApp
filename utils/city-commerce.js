const paid = require('./paid-content');

function hasCityAccess(entitlements, cityId) {
  return paid.isUnlocked(entitlements);
}

function buildPurchaseOptions(products, cityName, copy) {
  const source = products || {};
  const labels = copy || {};
  return [
    { product: 'annualMembership', title: labels.annualPlanTitle || '年会员', description: labels.annualPlanDesc || '', featured: true }
  ].map((option) => {
    const item = source[option.product];
    const available = paid.annualProductAvailable(item);
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
    const product = config && config.products && config.products.annualMembership;
    callback({
      config,
      entitlements,
      products: config && config.products || {},
      priceDisplay: paid.annualProductAvailable(product) ? paid.productPriceDisplay(product) : '',
      unlocked: hasCityAccess(entitlements, cityId),
      member: Boolean(entitlements && entitlements.member),
      simulation: Boolean(config && config.simulation)
    });
  };
  paid.fetchConfig((ok, value) => { config = ok ? value : null; configDone = true; finish(); });
  paid.fetchEntitlements((ok, value) => { entitlements = ok ? value : null; entitlementsDone = true; finish(); });
}

module.exports = { hasCityAccess, buildPurchaseOptions, loadCityState };
