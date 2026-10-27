// Website 后台上传的地图走私有接口：仅在线浏览，不提供下载。
// 这类 URL 必须直接用 image 组件渲染，不能走 wx.previewImage（长按菜单可保存到相册）。
const PRIVATE_MAP_PATTERN = /\/api\/miniprogram\/attraction-map\//i;

function isPrivateMapUrl(value) {
  return typeof value === 'string' && PRIVATE_MAP_PATTERN.test(value.trim());
}

module.exports = { isPrivateMapUrl };
