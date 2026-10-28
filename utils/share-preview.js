// 分享预览只取当前页的公开展示字段，不读取表单、用户资料或完整音频地址。
function clean(value) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}
function translated(item, key, locale) {
  const suffix = locale === 'en' ? 'En' : locale === 'zh-TW' ? 'Tw' : '';
  return clean(item && (item[key + suffix] || (key === 'name' && locale === 'en' && item.en) || item[key]));
}
function pagePreview(path, page) {
  const d = page && page.data || {};
  const m = d.i18n || {};
  const locale = d.locale || 'zh-CN';
  const tr = (item, key) => translated(item, key, locale);
  const route = path.split('?')[0];
  const heritage = m.heritage || {};
  const brand = clean(m.brandEn);
  let title = clean(m.brand);
  let summary = clean(m.commonSlogan);
  let image = '';
  let label = brand;
  let overrideImage = '';
  let overrideTitle = '';
  if (route === '/pages/attraction/detail' || route === '/pages/attraction/visitor-section') {
    const s = d.spot || {};
    label = route.endsWith('visitor-section') ? clean(heritage.visitor) : tr(s, 'category');
    title = tr(s, 'name') || title;
    summary = tr(s, 'summary');
    image = s.image;
    if (route.endsWith('/detail')) {
      overrideTitle = clean(s.shareTitle);
      title = overrideTitle || title;
      overrideImage = s.shareImage;
      image = overrideImage || image;
    } else {
      const section = d.activeSection || {};
      title = [title, clean(section.title)].filter(Boolean).join(' · ');
    }
  } else if (route.startsWith('/pages/city/')) {
    const city = d.city || {};
    title = tr(city, 'name') || title;
    summary = tr(city, 'description') || tr(city, 'subtitle');
    image = city.coverImage || city.cover;
  } else if (route === '/pages/knowledge/knowledge') {
    title = d.activePanel === 1 ? heritage.history : (m.knowledgePage || {}).title;
    summary = d.activePanel === 1 ? heritage.albumsIntro : heritage.libraryIntro;
    const first = (d.activePanel === 1 ? d.visibleAlbums : d.hotSpots) || [];
    image = first[0] && (first[0].cover || first[0].image);
  } else if (route === '/pages/guide/guide') {
    const banner = (d.guideBanners || [])[d.guideBannerCurrent || 0] || {};
    title = m.guideService;
    summary = banner.description || banner.title || m.commonSlogan;
    image = banner.img;
  } else if (route === '/pages/travel-guide/travel-guide') {
    title = d.guideTitle || (m.travel || {}).title;
    summary = d.guideSubtitle || (m.travel || {}).subtitle;
  } else if (route === '/pages/service-flow/service-flow') {
    title = (d.flow || {}).title;
    summary = [d.flow && d.flow.stage1, d.flow && d.flow.stage2, d.flow && d.flow.stage3].filter(Boolean).join(' · ');
  } else if (route === '/pages/customize/customize') {
    title = (m.forms || {}).planIntro;
    summary = (m.forms || {}).planSub;
  } else if (route === '/pages/vehicle/vehicle') {
    title = (d.service || {}).title || m.vehicleTitle;
    summary = (d.service || {}).description || m.vehiclePending;
  } else if (route === '/pages/business/business') {
    title = m.businessTitle;
    summary = m.businessDescription;
  } else if (route === '/pages/luxury/detail') {
    title = (d.detail || {}).title;
    summary = (d.detail || {}).intro;
    image = (d.detail || {}).image;
  } else if (route === '/pages/itinerary/detail') {
    const trip = d.itinerary || {};
    title = trip.title;
    // 定制行程原本支持主动转发私密链接，但卡片不展示订单号、日期、旅客或费用。
    summary = trip.type === 'custom' || trip.token ? m.commonSlogan : trip.highlights || trip.summary;
    image = trip.img;
  } else if (route === '/pages/itinerary/index') {
    title = (m.contentPage || {}).referenceTag;
    summary = (d.list || []).slice(0, 3).map((item) => clean(item.title)).filter(Boolean).join(' · ');
    image = d.list && d.list[0] && d.list[0].img;
  } else if (route.startsWith('/pages/audio/')) {
    title = d.title || (d.album || {}).displayTitle;
    summary = d.description || (d.album || {}).displayDescription || d.spotName;
    image = d.cover || d.coverImage || (d.album || {}).cover;
    label = clean(heritage.history);
  } else if (route === '/pages/membership/shop') {
    title = (m.paidContent || {}).memberAnnual;
    summary = (m.paidContent || {}).memberDesc;
  } else if (route === '/pages/index/index') {
    title = (d.heroCopy || {}).title || title;
    summary = (d.heroCopy || {}).description || summary;
    const banner = (d.heroList || [])[d.heroCurrent || 0];
    image = banner && banner.img;
  }
  return { title: clean(title) || clean(m.brand) || brand, summary: clean(summary), image: clean(image), overrideImage: clean(overrideImage), overrideTitle, label: clean(label) || brand, brand };
}

// Canvas 文字按测量宽度换行，含中英文/emoji；末行省略，避免长标题挤出卡片。
function textLines(ctx, value, width, maxLines) {
  const chars = Array.from(clean(value));
  const lines = [];
  let line = '';
  for (let i = 0; i < chars.length; i += 1) {
    const next = line + chars[i];
    if (ctx.measureText(next).width <= width) { line = next; continue; }
    if (lines.length === maxLines - 1) {
      while (line && ctx.measureText(line + '…').width > width) line = Array.from(line).slice(0, -1).join('');
      lines.push(line + '…');
      return lines;
    }
    lines.push(line);
    line = chars[i];
  }
  if (line) lines.push(line);
  return lines;
}
function drawPreview(ctx, spec, photo) {
  const width = 750;
  ctx.fillStyle = '#0C1B33';
  ctx.fillRect(0, 0, width, 600);
  if (photo) {
    const scale = Math.max(width / photo.width, 290 / photo.height);
    const w = photo.width * scale;
    const h = photo.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, 290);
    ctx.clip();
    ctx.drawImage(photo, (width - w) / 2, photo.height > photo.width ? 0 : (290 - h) / 2, w, h);
    ctx.restore();
    const gradient = ctx.createLinearGradient(0, 170, 0, 290);
    gradient.addColorStop(0, 'rgba(12,27,51,0)');
    gradient.addColorStop(1, '#0C1B33');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 170, width, 120);
  } else {
    ctx.fillStyle = '#123754';
    ctx.fillRect(42, 48, 666, 8);
  }
  const top = photo ? 312 : 108;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#D8C396';
  ctx.font = '22px sans-serif';
  ctx.fillText(textLines(ctx, spec.label, 666, 1)[0] || '', 42, top);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px sans-serif';
  const title = textLines(ctx, spec.title, 666, 2);
  title.forEach((line, index) => ctx.fillText(line, 42, top + 38 + index * 52));
  ctx.font = '26px sans-serif';
  ctx.fillStyle = '#DCE4ED';
  const bodyTop = top + 46 + title.length * 52;
  textLines(ctx, spec.summary, 666, photo ? 2 : 5).forEach((line, index) => ctx.fillText(line, 42, bodyTop + index * 36));
  ctx.fillStyle = '#D8C396';
  ctx.fillRect(42, 552, 36, 2);
  ctx.font = '18px sans-serif';
  ctx.fillText(spec.brand || '', 94, 544);
}

module.exports = { clean, pagePreview, textLines, drawPreview };
