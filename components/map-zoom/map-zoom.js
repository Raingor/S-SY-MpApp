const i18n = require('../../utils/i18n');

// 私有地图的应用内放大查看：双指缩放/拖动，不进系统预览（无保存/转发菜单）。
Component({
  properties: {
    open: { type: Boolean, value: false, observer(value) { if (value) this.setData({ scaleValue: 1 }); } },
    image: { type: String, value: '' }
  },
  data: { scaleValue: 1, hint: '' },
  lifetimes: {
    attached() { this.setData({ hint: i18n.getMessages().heritage.mapViewOnly || '' }); }
  },
  methods: {
    noop() {},
    close() { this.triggerEvent('close'); }
  }
});
