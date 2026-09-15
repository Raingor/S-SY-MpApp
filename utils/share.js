const i18n = require('./i18n');
const SHARE_IMAGE = '/assets/images/hero/hero-santorini.jpg';

function buildShareCard(path) {
  return {
    title: `SY Traveler · ${i18n.getMessages().commonSlogan}`,
    path: path || '/pages/index/index',
    imageUrl: SHARE_IMAGE
  };
}

const SHARE_TITLE = `SY Traveler · ${i18n.getMessages().commonSlogan}`;

module.exports = { SHARE_TITLE, buildShareCard };
