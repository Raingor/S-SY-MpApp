const content = require('../../data/content');
const i18n = require('../../utils/i18n');
const { goBack } = require('../../utils/navigation');

const REQUIRED_KINDS = ['hours', 'tickets', 'transport', 'map'];
const SECTION_ICONS = { hours: '◷', tickets: '◇', transport: '↗', map: '⌖' };

function localized(item, key, locale) {
  const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : '';
  return item && (item[key + suffix] || item[key]) || '';
}
function isFaqSection(item, locale) {
  const names = [localized(item, 'title', locale), item && item.title, item && item.titleTw, item && item.titleEn];
  return /faq/i.test(`${item && item.id || ''} ${item && item.kind || ''}`) || names.some((name) => /faq|常见问题|常見問題|常见问答|常見問答/i.test(String(name || '')));
}
function hasRich(value) { return Array.isArray(value) ? value.length > 0 : Boolean(String(value || '').trim()); }
function localizedRich(item, locale, legacy) {
  const nodes = localized(item, 'nodes', locale);
  if (hasRich(nodes)) return nodes;
  const html = localized(item, 'bodyHtml', locale);
  return hasRich(html) ? html : (legacy || '');
}
function preserveLineBreaks(value) {
  if (Array.isArray(value)) {
    return value.flatMap((node) => {
      if (!node || typeof node !== 'object') return [node];
      if (typeof node.text === 'string') {
        const lines = node.text.split(/\r\n|\r|\n/);
        return lines.flatMap((text, index) => [
          { ...node, text },
          ...(index < lines.length - 1 ? [{ name: 'br' }] : [])
        ]);
      }
      if (Array.isArray(node.children)) return [{ ...node, children: preserveLineBreaks(node.children) }];
      return [node];
    });
  }
  return typeof value === 'string' ? value.replace(/\r\n|\r|\n/g, '<br/>') : value;
}

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    spot: null,
    sections: [],
    customSections: [],
    activeKind: 'hours',
    activeSection: null,
    loading: true,
    failed: false
  },

  onLoad(options) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    i18n.apply(this);
    this.spotId = String((options && options.id) || '');
    this.requestedKind = (options && options.kind) || 'hours';
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    this.loadSpot();
  },

  onShow() {
    i18n.apply(this);
    if (this.rawSpot) this.applySpot(this.rawSpot);
  },

  loadSpot() {
    if (!this.spotId) return this.setData({ loading: false, failed: true });
    this.setData({ loading: true, failed: false });
    content.loadContent((data, state) => {
      if (!state || state.source !== 'remote' || state.status !== 'ready') {
        this.rawSpot = null;
        return this.setData({ loading: false, failed: true, spot: null, sections: [], customSections: [], activeSection: null });
      }
      const spot = content.getAttraction(this.spotId, data);
      if (!spot) {
        this.rawSpot = null;
        return this.setData({ loading: false, failed: true, spot: null, sections: [], customSections: [], activeSection: null });
      }
      this.rawSpot = spot;
      this.setData({ loading: false, failed: false });
      this.applySpot(spot);
    }, true);
  },

  applySpot(spot) {
    const locale = this.data.locale;
    const info = spot.visitorInfo || {};
    const guide = spot.guide || {};
    const rawSections = Array.isArray(spot.visitorInfoSections) ? spot.visitorInfoSections : [];
    const byKind = new Map(rawSections.map((section) => [section.kind || section.id, section]));
    const labels = (this.data.i18n.contentPage && this.data.i18n.contentPage.guideLabels) || {};
    const sections = REQUIRED_KINDS.map((kind) => {
      const source = byKind.get(kind) || { kind };
      const map = source.map && typeof source.map === 'object' ? source.map : {};
      let legacy = '';
      if (kind !== 'map') legacy = localized(info, kind, locale) || localized(guide, kind, locale);
      else legacy = localized(map, 'description', locale) || localized(info, 'map', locale) || localized(guide, 'map', locale);
      const sourceNodes = localized(source, 'nodes', locale);
      const sourceHtml = localized(source, 'bodyHtml', locale);
      const hasRichSource = hasRich(sourceNodes) || hasRich(sourceHtml);
      let richNodes = localizedRich(source, locale, legacy);
      const hoursText = kind === 'hours' && !hasRichSource ? legacy : '';
      if (kind === 'hours') richNodes = hasRichSource ? preserveLineBreaks(richNodes) : '';
      const isDemo = source.isDemo === true;
      const mapImage = kind === 'map' ? (map.image || info.mapImage || guide.mapImage || '') : '';
      const mapUrl = kind === 'map' ? (map.url || localized(info, 'mapUrl', locale) || guide.mapUrl || '') : '';
      return {
        ...source,
        kind,
        icon: SECTION_ICONS[kind],
        displayTitle: localized(source, 'title', locale) || labels[kind] || kind,
        richNodes,
        hoursText,
        isDemo,
        hasContent: hasRich(richNodes),
        mapImage,
        mapUrl,
        sourceUrl: kind === 'map' ? (source.sourceUrl || map.sourceUrl || info.sourceUrl || guide.sourceUrl || '') : '',
        sourceTitle: kind === 'map' ? (localized(source, 'sourceTitle', locale) || localized(map, 'sourceTitle', locale) || localized(info, 'sourceTitle', locale) || '') : '',
        verifiedAt: kind === 'map' ? (source.verifiedAt || map.verifiedAt || info.verifiedAt || guide.verifiedAt || '') : ''
      };
    });
    const customSections = (spot.customSections || []).filter((item) => item && item.status === 'published' && !isFaqSection(item, locale)).map((item) => {
      const richNodes = localizedRich(item, locale, '');
      const displayTitle = localized(item, 'title', locale);
      return { ...item, displayTitle, richNodes, hasContent: hasRich(richNodes) };
    }).filter((item) => item.displayTitle)
      .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    const selected = sections.find((section) => section.kind === this.requestedKind) || sections[0];
    this.setData({
      spot: { ...spot, displayName: localized(spot, 'name', locale) || spot.name || '' },
      sections,
      customSections,
      activeKind: selected.kind,
      activeSection: selected
    });
  },

  onTabTap(e) {
    const kind = e.currentTarget.dataset.kind;
    const section = this.data.sections.find((item) => item.kind === kind);
    if (!section) return;
    this.requestedKind = kind;
    this.setData({ activeKind: kind, activeSection: section });
  },

  onMapTap() {
    const section = this.data.activeSection || {};
    if (section.mapImage) return wx.previewImage({ urls: [section.mapImage], fail: () => wx.showToast({ title: this.data.i18n.heritage.mapFailed, icon: 'none' }) });
    if (/^https:\/\//i.test(section.mapUrl || '')) return wx.setClipboardData({ data: section.mapUrl });
  },

  onSourceTap() {
    const url = this.data.activeSection && this.data.activeSection.sourceUrl;
    if (/^https:\/\//i.test(url || '')) wx.setClipboardData({ data: url });
  },

  onRichTextTap(e) {
    const href = e && e.detail && e.detail.href;
    if (/^https:\/\//i.test(href || '')) wx.setClipboardData({ data: href });
  },

  onBack() { goBack(); }
});
