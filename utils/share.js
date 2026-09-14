const SHARE_TITLE = '只为一生美好回忆';
const SHARE_IMAGE = '/assets/images/hero/hero-santorini.jpg';

function buildShareCard(path) {
  return {
    title: SHARE_TITLE,
    path: path || '/pages/index/index',
    imageUrl: SHARE_IMAGE
  };
}

module.exports = { SHARE_TITLE, buildShareCard };
