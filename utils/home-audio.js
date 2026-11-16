// 首页播放后台配置的卫城试听音频：真人讲解视频原声或人工录制的游览攻略，不从景点音轨列表猜选音源。
const HOME_AUDIO_KINDS = ['human-video-audio', 'guide-audio'];

function getHomeAudioPreview(data, base) {
  const item = data && data.home && data.home.audioPreview;
  if (!item || item.enabled === false || HOME_AUDIO_KINDS.indexOf(item.kind) < 0 ||
    item.attractionId !== 'acropolis') return null;
  // guide-audio 用 sourceAudioId（录制音频），human-video-audio 用 sourceVideoId（视频提取原声）。
  const source = typeof item.sourceAudioId === 'string' && item.sourceAudioId.trim()
    ? item.sourceAudioId.trim()
    : (typeof item.sourceVideoId === 'string' ? item.sourceVideoId.trim() : '');
  if (!source) return null;
  const value = typeof item.previewUrl === 'string' ? item.previewUrl.trim() : '';
  const url = value.startsWith('/') && !value.startsWith('//') ? String(base || '').replace(/\/$/, '') + value : value;
  const path = url.split(/[?#]/)[0];
  // 只消费已转换的音频或试听接口；绝不把原视频/完整播放地址交给首页播放器。
  if (!/^https:\/\/[^/?#\s]+\//i.test(url) ||
    !/\.(?:m4a|mp3|aac|wav)$|\/preview(?:\/|$)/i.test(path)) return null;
  const seconds = Number(item.previewSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return {
    kind: item.kind,
    attractionId: 'acropolis',
    sourceAudioId: source,
    sourceVideoId: source,
    previewUrl: url,
    previewSeconds: Math.min(60, seconds)
  };
}

module.exports = { getHomeAudioPreview };