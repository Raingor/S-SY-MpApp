const details = {
  'zh-CN': {
    jet: {
      eyebrow: 'PRIVATE AVIATION', title: '全球私人包机', image: '/assets/images/lux/lux-jet.jpg',
      intro: '按你的出发地、时间与同行人数，协助匹配更合适的机型与航线。',
      sections: [
        { title: '适用场景', items: ['商务与家庭私享出行', '多城市衔接与灵活时间安排', '医疗转运等特殊出行需求'] },
        { title: '可协调目的地', items: ['希腊及欧洲主要城市之间的航程', '北美、南美、亚洲、非洲等跨区域行程按需沟通'] },
        { title: '咨询前请准备', items: ['出发与抵达城市、日期和期望时段', '同行人数、儿童年龄与行李情况', '期望机型及必要的地面服务'] }
      ],
      note: '包机资源、航线和最终报价以实际可用性及运营方确认结果为准。', cta: '咨询包机方案'
    },
    yacht: {
      eyebrow: 'PRIVATE YACHTING', title: '希腊游艇出海', image: '/assets/images/lux/lux-yacht.jpg',
      intro: '从单日海湾体验到跳岛航程，按你的节奏匹配帆船、机艇或游艇。',
      sections: [
        { title: '推荐玩法', items: ['雅典或圣托里尼周边单日出海', '基克拉泽斯与克里特等跳岛多日航程', '海上日落、浮潜与船上午餐等体验'] },
        { title: '选择前请确认', items: ['船型、独享或拼船、出海时长', '出发日期、人数及儿童情况', '餐饮、接送和水上活动等服务偏好'] },
        { title: '出行提醒', items: ['6—9 月为常见出海季节，安排受天气与风况影响', '半日或单日航程以当日海况和港口条件为准'] }
      ],
      note: '船只资源、航线和最终报价以实际可用性及船东确认结果为准。', cta: '咨询游艇方案'
    }
  },
  'zh-TW': {
    jet: {
      eyebrow: 'PRIVATE AVIATION', title: '全球私人包機', image: '/assets/images/lux/lux-jet.jpg',
      intro: '按你的出發地、時間與同行人數，協助匹配更合適的機型與航線。',
      sections: [
        { title: '適用情境', items: ['商務與家庭私享出行', '多城市銜接與彈性時間安排', '醫療轉運等特殊出行需求'] },
        { title: '可協調目的地', items: ['希臘及歐洲主要城市之間的航程', '北美、南美、亞洲、非洲等跨區域行程按需溝通'] },
        { title: '諮詢前請準備', items: ['出發與抵達城市、日期和期望時段', '同行人數、兒童年齡與行李情況', '期望機型及必要的地面服務'] }
      ],
      note: '包機資源、航線和最終報價以實際可用性及營運方確認結果為準。', cta: '諮詢包機方案'
    },
    yacht: {
      eyebrow: 'PRIVATE YACHTING', title: '希臘遊艇出海', image: '/assets/images/lux/lux-yacht.jpg',
      intro: '從單日海灣體驗到跳島航程，按你的節奏匹配帆船、機艇或遊艇。',
      sections: [
        { title: '推薦玩法', items: ['雅典或聖托里尼周邊單日出海', '基克拉澤斯與克里特等跳島多日航程', '海上日落、浮潛與船上午餐等體驗'] },
        { title: '選擇前請確認', items: ['船型、獨享或併船、出海時長', '出發日期、人數及兒童情況', '餐飲、接送和水上活動等服務偏好'] },
        { title: '出行提醒', items: ['6—9 月為常見出海季節，安排受天氣與風況影響', '半日或單日航程以當日海況和港口條件為準'] }
      ],
      note: '船隻資源、航線和最終報價以實際可用性及船東確認結果為準。', cta: '諮詢遊艇方案'
    }
  },
  en: {
    jet: {
      eyebrow: 'PRIVATE AVIATION', title: 'Global private charter', image: '/assets/images/lux/lux-jet.jpg',
      intro: 'Share your departure point, timing and party size so we can coordinate a suitable aircraft and route.',
      sections: [
        { title: 'When it helps', items: ['Private business or family travel', 'Flexible timing and multi-city connections', 'Special travel needs, including medical transfers'] },
        { title: 'Destinations', items: ['Greece and major European city pairs', 'Cross-regional itineraries to the Americas, Asia and Africa on request'] },
        { title: 'Have these ready', items: ['Departure and arrival cities, date and preferred time', 'Passenger count, children’s ages and luggage', 'Preferred aircraft and essential ground services'] }
      ],
      note: 'Aircraft, routing and final quotations are subject to real-time availability and operator confirmation.', cta: 'Discuss a charter'
    },
    yacht: {
      eyebrow: 'PRIVATE YACHTING', title: 'Yachting in Greece', image: '/assets/images/lux/lux-yacht.jpg',
      intro: 'From a one-day bay escape to island hopping, we help match the boat to your travel rhythm.',
      sections: [
        { title: 'Suggested experiences', items: ['A day at sea from Athens or Santorini', 'Multi-day island hopping in the Cyclades or around Crete', 'Sunset, snorkelling and lunch on board'] },
        { title: 'Before choosing', items: ['Boat type, private or shared, and duration', 'Date, party size and children', 'Dining, transfers and water-activity preferences'] },
        { title: 'Travel notes', items: ['June to September is a common season; weather and wind shape the plan', 'Sea conditions and port operations determine final day-trip arrangements'] }
      ],
      note: 'Vessels, routes and final quotations are subject to real-time availability and owner confirmation.', cta: 'Discuss a yacht plan'
    }
  }
};

function getLuxuryDetail(type, locale) {
  const group = details[locale] || details['zh-CN'];
  return group[type] || group.jet;
}

module.exports = { getLuxuryDetail };
