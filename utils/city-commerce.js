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
      priceDisplay: paid.productPriceDisplay(product),
      unlocked: hasCityAccess(entitlements, cityId),
      member: Boolean(entitlements && entitlements.member),
      simulation: Boolean(config && config.simulation)
    });
  };
  paid.fetchConfig((ok, value) => { config = ok ? value : null; configDone = true; finish(); });
  paid.fetchEntitlements((ok, value) => { entitlements = ok ? value : null; entitlementsDone = true; finish(); });
}

module.exports = { hasCityAccess, loadCityState };
