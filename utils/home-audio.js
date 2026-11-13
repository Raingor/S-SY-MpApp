// 首页播放真人卫城视频提取的试听音频，不从景点音轨列表猜选音源。
function getHomeAudioPreview(data, base) {
  const item = data && data.home && data.home.audioPreview;
  if (!item || item.enabled === false || item.kind !== 'human-video-audio' ||
    item.attractionId !== 'acropolis' || typeof item.sourceVideoId !== 'string' || !item.sourceVideoId.trim()) return null;
  const value = typeof item.previewUrl === 'string' ? item.previewUrl.trim() : '';
  const url = value.startsWith('/') && !value.startsWith('//') ? String(base || '').replace(/\/$/, '') + value : value;
  const path = url.split(/[?#]/)[0];
  // 只消费已转换的音频或试听接口；绝不把原视频/完整播放地址交给首页播放器。
  if (!/^https:\/\/[^/?#\s]+\//i.test(url) ||
    !/\.(?:m4a|mp3|aac|wav)$|\/preview(?:\/|$)/i.test(path)) return null;
  const seconds = Number(item.previewSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return {
    kind: 'human-video-audio',
    attractionId: 'acropolis',
    sourceVideoId: item.sourceVideoId.trim(),
    previewUrl: url,
    previewSeconds: Math.min(60, seconds)
  };
}

module.exports = { getHomeAudioPreview };
