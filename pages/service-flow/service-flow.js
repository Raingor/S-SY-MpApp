// 定制旅行服务流程页：按 BlueSeacoast 服务流程图呈现三泳道流程；CTA 跳转定制留资表单。
const i18n = require('../../utils/i18n');
const { buildShareCard } = require('../../utils/share');
const app = getApp();

// 三泳道 ↔ 八步骤：把流程图的「您/中文客服/希腊团队」责任线映射到每个阶段。
const STEP_LANES = ['you', 'crew', 'you', 'you', 'crew', 'you', 'crew', 'crew'];
const STEP_STAGES = [0, 0, 0, 1, 1, 1, 2, 2];

Page({
  data: { statusBarHeight: 20, locale: 'zh-CN', i18n: i18n.getMessages(), flow: null, groupedSteps: [] },

  onShareAppMessage() {
    return buildShareCard('/pages/customize/customize');
  },

  onLoad() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    this.applyLocale();
  },

  onShow() {
    this.applyLocale();
  },

  applyLocale() {
    const locale = i18n.getLocale();
    const flow = i18n.getMessages(locale).serviceFlow;
    // 8 步骤按流程图责任线归属泳道（'you'/'crew'/'greece'），再按 3/3/2 分入三阶段。
    const laneByKind = { you: flow.laneYou, crew: flow.laneCrew, greece: flow.laneGreece };
    const stages = [flow.stage1, flow.stage2, flow.stage3];
    const groupedSteps = stages.map((title, stageIndex) => ({
      title,
      steps: flow.steps
        .map((step, index) => ({ ...step, index: index + 1, lane: laneByKind[STEP_LANES[index]] }))
        .filter((step, index) => STEP_STAGES[index] === stageIndex)
    }));
    this.setData({ locale, flow, groupedSteps });
  },

  onStartCustomize() {
    // customize 是 tabBar 页：从非 tab 页跳转必须用 switchTab，navigateTo 会失败。
    app.globalData.pendingTabReset = true;
    wx.switchTab({ url: '/pages/customize/customize' });
  }
});
