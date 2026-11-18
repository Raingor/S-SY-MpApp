// 照片资源出口：包内素材与官网 CDN 之间只在这里切换。
// 表为空时原样返回本地路径，包体与行为完全不变；在 REMOTE_IMAGES 里逐条填入
// 官网地址后即改用远程文件，删掉对应本地 JPG 才能释放主包体积。
// 说明：微信 <image> 直接加载 https 图片不需要 downloadFile 合法域名，
// 只需远端返回可公开访问的 image/* 响应。
const REMOTE_IMAGES = {
  '/assets/images/hero/hero-santorini.jpg': 'https://www.sy-greece.com/images/hero-santorini.webp',
  '/assets/images/hero/hero-acropolis.jpg': 'https://www.sy-greece.com/images/hero-acropolis.webp',
  '/assets/images/hero/hero-couple.jpg': 'https://www.sy-greece.com/images/hero-couple.webp',
  '/assets/images/route/route-athens.jpg': 'https://www.sy-greece.com/images/route-athens.webp',
  '/assets/images/route/route-santorini.jpg': 'https://www.sy-greece.com/images/route-santorini.webp',
  '/assets/images/route/route-peloponnese.jpg': 'https://www.sy-greece.com/images/route-peloponnese.webp',
  '/assets/images/route/route-heritage.jpg': 'https://www.sy-greece.com/images/route-heritage.webp',
  '/assets/images/dest/dest-athens.jpg': 'https://www.sy-greece.com/images/dest-athens.webp',
  '/assets/images/dest/dest-santorini.jpg': 'https://www.sy-greece.com/images/dest-santorini.webp',
  '/assets/images/dest/dest-mykonos.jpg': 'https://www.sy-greece.com/images/dest-mykonos.webp',
  '/assets/images/dest/dest-delphi.jpg': 'https://www.sy-greece.com/images/dest-delphi.webp',
  '/assets/images/dest/dest-meteora.jpg': 'https://www.sy-greece.com/images/dest-meteora.webp',
  '/assets/images/dest/dest-crete.jpg': 'https://www.sy-greece.com/images/dest-crete.webp',
  '/assets/images/dest/dest-nafplion.jpg': 'https://www.sy-greece.com/images/dest-nafplion.webp',
  '/assets/images/dest/dest-peloponnese.jpg': 'https://www.sy-greece.com/images/dest-peloponnese.webp',
  '/assets/images/lux/lux-jet.jpg': 'https://www.sy-greece.com/images/lux-jet.webp',
  '/assets/images/lux/lux-yacht.jpg': 'https://www.sy-greece.com/images/lux-yacht.webp',
};

function asset(path) {
  if (typeof path !== 'string' || !path) return path || '';
  return REMOTE_IMAGES[path] || path;
}

function assetAll(list) {
  return Array.isArray(list) ? list.map(asset) : [];
}

module.exports = { asset, assetAll, REMOTE_IMAGES };
