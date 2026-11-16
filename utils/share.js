const i18n = require('./i18n');
const content = require('../data/content');
const { pagePreview } = require('./share-preview');
const SHARE_IMAGE = '/assets/images/hero/hero-santorini.jpg';

// 后台按页面路径配置的转发卡：标题/图片优先，缺失字段回落页面首图与页面标题。
function configuredCard(route, locale) {
  const app = typeof getApp === 'function' ? getApp() : null;
  const cards = app && app.globalData ? app.globalData.shareCards : null;
  return content.localizeShareCard(content.getShareCard(cards, route), locale);
}

function buildShareCard(path, page) {
  let target = path || '/pages/index/index';
  // 账户与旅客资料页分享公共入口，不截取个人屏幕；定制行程保留原有主动分享链接。
  if (/^\/pages\/profile\//.test(target)) target = '/pages/index/index';
  const spec = pagePreview(target, target === path ? page : { data: { i18n: i18n.getMessages() } });
  const locale = (target === path && page && page.data && page.data.locale) || i18n.getLocale();
  const configured = configuredCard(target, locale);
  if (configured) {
    if (configured.title) {
      spec.title = configured.title;
      spec.overrideTitle = configured.title;
    }
    if (configured.description) spec.summary = configured.description;
    if (configured.image) {
      spec.image = configured.image;
      spec.overrideImage = configured.image;
    }
  }
  const card = {
    // 后台标题（含景点级 shareTitle）直接使用，不再拼接页面摘要；否则沿用页面标题+摘要。
    title: spec.overrideTitle
      ? Array.from(spec.overrideTitle).slice(0, 120).join('')
      : Array.from(spec.title + (spec.summary ? '｜' + spec.summary : '')).slice(0, 120).join(''),
    path: target,
    imageUrl: spec.overrideImage || spec.image || SHARE_IMAGE
  };
  if (!spec.title) card.title = `${i18n.getMessages().brandEn} · ${i18n.getMessages().commonSlogan}`;
  // 后台分享标题仍优先；配置图作为卡片主图，叠加当前页摘要，不再只发一张无内容封面。
  const preview = target === path && page && typeof page.selectComponent === 'function' && page.selectComponent('#share-preview');
  if (!preview || typeof preview.render !== 'function') return card;
  // 微信分享 promise 有时间上限；失败/超时用当前主图兜底，不截取可能含个人资料的屏幕。
  card.promise = new Promise((resolve) => {
    let settled = false;
    const finish = (imageUrl) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ title: card.title, path: card.path, imageUrl: imageUrl || card.imageUrl });
    };
    const timer = setTimeout(() => finish(), 2200);
    Promise.resolve().then(() => preview.render(spec)).then(finish, () => finish());
  });
  return card;
}

const SHARE_TITLE = `${i18n.getMessages().brandEn} · ${i18n.getMessages().commonSlogan}`;

module.exports = { SHARE_TITLE, buildShareCard };