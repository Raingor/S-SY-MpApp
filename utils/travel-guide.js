// Website 的 travelGuide 位于 /api/content 顶层；文档映射优先以 settings 为准。
function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function localized(item, key, locale) {
  const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : '';
  return text(item && item[key + suffix]) || text(item && item[key]);
}
function points(item, locale) {
  const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : '';
  const value = item && item['points' + suffix];
  const source = Array.isArray(value) && value.length ? value : item && item.points;
  return (Array.isArray(source) ? source : []).map(text).filter(Boolean);
}
function documentUrl(value, base) {
  const raw = text(value);
  if (/^https:\/\//i.test(raw)) return raw;
  return /^\/docs\/[^\s]+$/i.test(raw) ? String(base || '').replace(/\/$/, '') + raw : '';
}
function guideView(data, copy, locale, base) {
  const remote = data && data.travelGuide;
  const configured = remote && typeof remote === 'object' && !Array.isArray(remote);
  const source = configured ? remote : copy;
  const settings = data && data.settings;
  const docs = settings && settings.travelGuideDocs && typeof settings.travelGuideDocs === 'object'
    ? settings.travelGuideDocs : configured && remote.docs || {};
  const enabled = !configured || remote.enabled !== false;
  const sections = enabled ? (Array.isArray(source.sections) ? source.sections : []).map((section) => ({
    key: section.key,
    kicker: text(section.kicker),
    title: localized(section, 'title', locale),
    intro: localized(section, 'intro', locale),
    // guides 仅供旧 API/i18n 回退；远端 cards 空数组必须保持为空。
    guides: (Array.isArray(configured ? section.cards : section.guides) ? (configured ? section.cards : section.guides) : []).map((card) => ({
      key: card.key, mark: text(card.mark), source: text(card.source),
      title: localized(card, 'title', locale), desc: localized(card, 'desc', locale),
      points: points(card, locale), docUrl: documentUrl(docs[card.key], base)
    }))
  })) : [];
  return {
    guideEnabled: enabled, guideConfigured: Boolean(configured),
    guideKicker: configured ? text(source.kicker) : 'TRAVEL GUIDE',
    guideTitle: localized(source, 'title', locale),
    guideSubtitle: localized(source, 'subtitle', locale),
    sections
  };
}
module.exports = { guideView, documentUrl };
