// 出行指南：将“出行指南”目录中的资料整理成可快速浏览的旅行卡片
const app = getApp();
const { buildShareCard } = require('../../utils/share');
const i18n = require('../../utils/i18n');

Page({
  data: {
    statusBarHeight: 20,
    locale: 'zh-CN',
    i18n: i18n.getMessages(),
    sections: [
      {
        key: 'prepare',
        kicker: 'PREPARE WELL',
        title: '出发准备',
        intro: '把签证、行李与穿搭先安排好，轻装出发。',
        guides: [
          {
            key: 'visa',
            mark: '签',
            source: '申根签证申请表',
            title: '签证与材料清单',
            desc: '按申请表逐项核对个人信息、行程、住宿与保险资料。',
            points: ['护照与复印件', '行程、住宿与交通', '保险、照片与签名']
          },
          {
            key: 'packing',
            mark: '箱',
            source: '希腊旅行必备物品清单',
            title: '行李怎么带',
            desc: '从证件银行卡到药品、防晒和电子设备，按类别收进行李。',
            points: ['证件与现金卡类', '防晒、常用药品', '转换插头与充电宝']
          },
          {
            key: 'outfit',
            mark: '衣',
            source: '地中海旅行穿搭全攻略',
            title: '四季穿搭方案',
            desc: '用“下装锚定、外套定调”的流动衣橱，应对海岛温差与长时间步行。',
            points: ['4—9月：亚麻与轻棉', '10月—次年3月：叠穿保暖', '舒适鞋履优先']
          }
        ]
      },
      {
        key: 'experience',
        kicker: 'LIVE LIKE GREECE',
        title: '旅途体验',
        intro: '吃得地道、拍得好看，也更懂当地人的生活节奏。',
        guides: [
          {
            key: 'food',
            mark: '食',
            source: '希腊美食与生活方式探索',
            title: '希腊美食地图',
            desc: '从希腊沙拉、Moussaka 到海岛海鲜，边吃边认识地中海生活。',
            points: ['Meze 适合多人分享', '晚餐通常较晚开始', '餐后小费约 5%—10%']
          },
          {
            key: 'photo',
            mark: '光',
            source: '地中海光影诗篇',
            title: '旅行摄影小课',
            desc: '用黄金时刻、九宫格和天然画框，拍出蓝白小镇与海岸的层次。',
            points: ['日出后/日落前一小时', '地平线放在上或下 1/3', '擦镜头、稳住再按快门']
          }
        ]
      },
      {
        key: 'culture',
        kicker: 'READ THE LAND',
        title: '文化深读',
        intro: '先读懂历史与目的地，再走进每一处遗址和岛屿。',
        guides: [
          {
            key: 'athens',
            mark: '城',
            source: '雅典历史古迹与博物馆详解',
            title: '雅典文明巡礼',
            desc: '从卫城、古市集到国家考古博物馆，把遗址、馆藏与游览动线串起来。',
            points: ['先上山，后逛卫城博物馆', '防滑鞋与饮用水必备', '门票与开放时间出发前确认']
          },
          {
            key: 'mythology',
            mark: '神',
            source: '希腊神话谱系解析',
            title: '神话谱系入门',
            desc: '从原始神、泰坦神到奥林匹斯十二主神，读懂雅典娜、宙斯与海神的故事。',
            points: ['原始神：宇宙起源', '泰坦神：第二代神族', '奥林匹斯：神界秩序']
          },
          {
            key: 'destinations',
            mark: '图',
            source: 'Lonely Planet Greece',
            title: '目的地与路线参考',
            desc: '覆盖雅典、伯罗奔尼撒、北希腊与基克拉泽斯群岛，适合做路线灵感库。',
            points: ['雅典与周边古迹', '圣托里尼等基克拉泽斯群岛', '按区域组合行程']
          }
        ]
      }
    ]
  },

  onShareAppMessage() {
    return buildShareCard('/pages/travel-guide/travel-guide');
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
    const copy = i18n.apply(this);
    this.setData({ sections: copy.travel.sections || this.data.sections });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onConsult() {
    app.globalData.pendingLeadType = 'customization';
    wx.switchTab({ url: '/pages/customize/customize' });
  }
});
