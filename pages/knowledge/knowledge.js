// 服务4：景点付费文史知识库（目录、免费预览与付费解锁占位）
const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    activeIndex: 0,
    spots: [
      { name: '雅典卫城', en: 'ACROPOLIS', category: '文明溯源', image: '/assets/images/dest/dest-athens.jpg', intro: '站在雅典卫城，不只看一座神庙，也读懂古希腊人如何理解秩序、光与人的尺度。', preview: '为什么帕特农神庙看起来“笔直”却处处有曲线？Richard 用 1 分钟带你找到第一处细节。', locked: ['神庙建筑比例与视觉修正', '雅典娜神话与城邦记忆', '现场观看动线与讲解手册'] },
      { name: '德尔斐', en: 'DELPHI', category: '圣地人文', image: '/assets/images/dest/dest-delphi.jpg', intro: '沿着山路进入德尔斐，神谕、山谷与古代世界的中心在这里交叠。', preview: '德尔斐为什么被称为“世界的肚脐”？先听一段关于 omphalos 石的免费预览。', locked: ['阿波罗神庙遗址详解', '神谕制度与古代旅行', '山谷视线与遗址阅读路线'] },
      { name: '克里特王宫', en: 'KNOSSOS', category: '神话与考古', image: '/assets/images/dest/dest-crete.jpg', intro: '米诺斯文明留下迷宫般的宫殿，也留下欧洲最早的城市想象。', preview: '从一只陶片开始，认识克里特王宫中被时间保留下来的生活线索。', locked: ['米诺斯文明时间线', '迷宫神话的考古线索', '壁画、仪式与王宫空间'] },
      { name: '梅黛奥拉', en: 'METEORA', category: '建筑与信仰', image: '/assets/images/dest/dest-meteora.jpg', intro: '修道院悬于岩柱之上，人与自然、信仰与时间共同完成了这幅景观。', preview: '为什么修道院要建在高耸岩柱之上？用 1 分钟了解梅黛奥拉的第一层答案。', locked: ['岩柱地质与修道院选址', '东正教壁画阅读提示', '拍摄时段与参访礼仪'] }
    ]
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onSpotTap(e) {
    this.setData({ activeIndex: Number(e.currentTarget.dataset.index) });
  },

  onPreviewAudio() {
    wx.showToast({ title: '1分钟试听片段待上传', icon: 'none' });
  },

  onUnlock() {
    wx.showModal({
      title: '付费解锁功能开发中',
      content: '当前仅开放文字预览，支付与会员权限尚未接入，请勿在此页面付款。',
      confirmText: '知道了',
      showCancel: false
    });
  },

  onConsult() {
    app.globalData.pendingLeadType = 'knowledge-base';
    wx.switchTab({ url: '/pages/customize/customize' });
  }
});
