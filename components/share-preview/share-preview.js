const { drawPreview } = require('../../utils/share-preview');

Component({
  lifetimes: {
    detached() { this._detached = true; this._lastPreview = null; }
  },
  methods: {
    render(spec) {
      const key = JSON.stringify(spec);
      if (this._lastPreview && this._lastPreview.key === key) return Promise.resolve(this._lastPreview.path);
      // 同一个 canvas 的绘制串行化，避免连续点击/语言切换的图片相互覆盖。
      const render = () => new Promise((resolve, reject) => {
        this.createSelectorQuery().select('#canvas').fields({ node: true, size: true }).exec((result) => {
          const canvas = result && result[0] && result[0].node;
          if (!canvas || this._detached) return reject(new Error('canvas unavailable'));
          canvas.width = 750;
          canvas.height = 600;
          const exportImage = (photo) => {
            if (this._detached) return reject(new Error('page detached'));
            try {
              drawPreview(canvas.getContext('2d'), spec, photo);
              wx.canvasToTempFilePath({
                canvas, width: 750, height: 600, destWidth: 750, destHeight: 600,
                fileType: 'jpg', quality: 0.9,
                success: (res) => {
                  if (this._detached || !res.tempFilePath) return reject(new Error('export unavailable'));
                  this._lastPreview = { key, path: res.tempFilePath };
                  resolve(res.tempFilePath);
                },
                fail: reject
              }, this);
            } catch (error) { reject(error); }
          };
          if (!spec.image) return exportImage(null);
          // 不下载地图/音频；只有当前页的公开主图会进入分享卡。
          const photo = canvas.createImage();
          let finished = false;
          const finish = (image) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            exportImage(image);
          };
          const timer = setTimeout(() => finish(null), 1000);
          photo.onload = () => finish(photo);
          photo.onerror = () => finish(null);
          photo.src = spec.image;
        });
      });
      const pending = (this._queue || Promise.resolve()).catch(() => {}).then(render);
      this._queue = pending;
      return pending;
    }
  }
});
