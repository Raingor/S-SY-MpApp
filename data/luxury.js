// 奢享体验（私人包机 / 游艇租赁）内容与首页卡片文案。
// 三种语言的 sections 结构、条目数保持一致，避免切换语言后信息量缩水。
const details = {
  'zh-CN': {
    jet: {
      eyebrow: 'GLOBAL CHARTER FLIGHTS', title: '全球私人包机服务', image: '/assets/images/lux/lux-jet.jpg',
      intro: '旅行包机、医疗转运等按需协调；提交出发地、时间和同行信息后，为你匹配合适的机型与航线。',
      sections: [
        { title: '服务类型', items: ['旅行包机：适合高隐私、行程灵活或多城市衔接的出行需求', '医疗包机：可按医疗转运等特殊需求协调服务', '四季均可按实际资源与航线情况沟通安排'] },
        { title: '可协调目的地', items: ['欧洲：希腊、荷兰、法国、德国、西班牙、意大利、英国、瑞典、芬兰、罗马尼亚及中欧地区', '北美：美国；南美：阿根廷', '亚洲：迪拜、沙特、科威特、哈萨克斯坦、印度', '非洲：摩洛哥、南非；其他起降城市可按需求确认'] },
        { title: '定制前请准备', items: ['出发与抵达城市、日期、期望时段及是否需要地面服务', '同行人数、儿童年龄、语言需求与行李件数', '行李尺寸、类型（硬壳或软壳）及重量等信息'] },
        { title: '报价与确认', items: ['报价参考：单程 6,000—50,000 欧元起，具体以实际行程与可用机型为准', '最终报价需根据定制包机方案与供应方确认', '包机服务按方案约定预付至指定账户'] }
      ],
      note: '包机资源、航线、医疗相关安排及最终报价，均以实际可用性、运营方资质和最终确认结果为准。', cta: '咨询包机方案'
    },
    yacht: {
      eyebrow: 'CHARTER YACHTING SERVICE', title: '希腊游艇租赁服务', image: '/assets/images/lux/lux-yacht.jpg',
      intro: '从雅典、圣托里尼单日出海，到跳岛多日航程；按人数、船型、日期与航线匹配游艇方案。',
      sections: [
        { title: '航线范围', items: ['多日：基克拉迪群岛、爱奥尼亚群岛、北爱琴海群岛、萨罗尼克湾、斯波拉提群岛、多德卡尼斯群岛等', '单日：雅典、圣托里尼、格利法达、扎金索斯、米克诺斯、科孚岛、帕罗斯、哈尔基季基、莱夫卡扎等'] },
        { title: '服务说明', items: ['各类游艇租赁服务通常包含船长、船员及相关接送安排，具体以船只方案为准', '可按帆船或机动游艇、独享或拼船、半日或多日航程进行匹配', '餐饮、水上活动及岸上接送等可按实际需求确认'] },
        { title: '季节与报价因素', items: ['每年 6—9 月为希腊出海的常见适宜季节；其他季节天气偏凉、风浪较大', '价格主要受船型、租赁方式、出行时间、航程时长及所需服务影响', '如已确定日期与路线，可优先匹配；也可由你自行指定船只'] },
        { title: '预订确认', items: ['半日或单日航程需以当日海况、港口条件和船只档期为准', '游艇服务按方案约定预付至指定账户后确认预订'] }
      ],
      note: '船只资源、航线和最终报价以实际可用性及船东确认结果为准。', cta: '咨询游艇方案'
    }
  },
  'zh-TW': {
    jet: {
      eyebrow: 'PRIVATE AVIATION', title: '全球私人包機', image: '/assets/images/lux/lux-jet.jpg',
      intro: '旅行包機、醫療轉運等按需協調；提交出發地、時間和同行資訊後，為你匹配合適的機型與航線。',
      sections: [
        { title: '服務類型', items: ['旅行包機：適合高隱私、行程彈性或多城市銜接的出行需求', '醫療包機：可按醫療轉運等特殊需求協調服務', '四季均可按實際資源與航線情況溝通安排'] },
        { title: '可協調目的地', items: ['歐洲：希臘、荷蘭、法國、德國、西班牙、義大利、英國、瑞典、芬蘭、羅馬尼亞及中歐地區', '北美：美國；南美：阿根廷', '亞洲：杜拜、沙烏地、科威特、哈薩克、印度', '非洲：摩洛哥、南非；其他起降城市可按需求確認'] },
        { title: '諮詢前請準備', items: ['出發與抵達城市、日期、期望時段及是否需要地面服務', '同行人數、兒童年齡、語言需求與行李件數', '行李尺寸、類型（硬殼或軟殼）及重量等資訊'] },
        { title: '報價與確認', items: ['報價參考：單程 6,000—50,000 歐元起，具體以實際行程與可用機型為準', '最終報價需根據定製包機方案與供應方確認', '包機服務按方案約定預付至指定帳戶'] }
      ],
      note: '包機資源、航線、醫療相關安排及最終報價，均以實際可用性、營運方資質和最終確認結果為準。', cta: '諮詢包機方案'
    },
    yacht: {
      eyebrow: 'PRIVATE YACHTING', title: '希臘遊艇出海', image: '/assets/images/lux/lux-yacht.jpg',
      intro: '從雅典、聖托里尼單日出海，到跳島多日航程；按人數、船型、日期與航線匹配遊艇方案。',
      sections: [
        { title: '航線範圍', items: ['多日：基克拉澤斯群島、愛奧尼亞群島、北愛琴海群島、薩羅尼克灣、斯波拉提群島、多德卡尼斯群島等', '單日：雅典、聖托里尼、格利法達、扎金索斯、米克諾斯、科孚島、帕羅斯、哈爾基季基、萊夫卡扎等'] },
        { title: '服務說明', items: ['各類遊艇租賃服務通常包含船長、船員及相關接送安排，具體以船隻方案為準', '可按帆船或機動遊艇、獨享或併船、半日或多日航程進行匹配', '餐飲、水上活動及岸上接送等可按實際需求確認'] },
        { title: '季節與報價因素', items: ['每年 6—9 月為希臘出海的常見適宜季節；其他季節天氣偏涼、風浪較大', '價格主要受船型、租賃方式、出行時間、航程時長及所需服務影響', '如已確定日期與路線，可優先匹配；也可由你自行指定船隻'] },
        { title: '預訂確認', items: ['半日或單日航程需以當日海況、港口條件和船隻檔期為準', '遊艇服務按方案約定預付至指定帳戶後確認預訂'] }
      ],
      note: '船隻資源、航線和最終報價以實際可用性及船東確認結果為準。', cta: '諮詢遊艇方案'
    }
  },
  en: {
    jet: {
      eyebrow: 'PRIVATE AVIATION', title: 'Global private charter', image: '/assets/images/lux/lux-jet.jpg',
      intro: 'Travel charters, medical transfers and more, coordinated to your needs. Share your departure point, timing and party size so we can match a suitable aircraft and route.',
      sections: [
        { title: 'Service types', items: ['Travel charter: suited to high-privacy trips, flexible timing or multi-city connections', 'Medical charter: coordinated for medical transfers and similar special needs', 'Available year-round, subject to actual resources and route availability'] },
        { title: 'Destinations we can coordinate', items: ['Europe: Greece, the Netherlands, France, Germany, Spain, Italy, the United Kingdom, Sweden, Finland, Romania and Central Europe', 'North America: the United States; South America: Argentina', 'Asia: Dubai, Saudi Arabia, Kuwait, Kazakhstan and India', 'Africa: Morocco and South Africa; other departure or arrival cities on request'] },
        { title: 'Have these ready', items: ['Departure and arrival cities, date, preferred time window and whether ground services are needed', 'Passenger count, children’s ages, language needs and number of bags', 'Baggage size, type (hard-shell or soft) and weight'] },
        { title: 'Quotation and confirmation', items: ['Indicative pricing: from EUR 6,000 to 50,000 per one-way leg, subject to the actual itinerary and available aircraft', 'The final quotation is confirmed against the tailored charter plan and the operator', 'Charter services are confirmed by prepayment to the designated account as agreed in the plan'] }
      ],
      note: 'Aircraft, routing, medical arrangements and final quotations are subject to real-time availability, operator credentials and final confirmation.', cta: 'Discuss a charter'
    },
    yacht: {
      eyebrow: 'PRIVATE YACHTING', title: 'Yachting in Greece', image: '/assets/images/lux/lux-yacht.jpg',
      intro: 'From single-day sailings out of Athens or Santorini to multi-day island hopping, we match the yacht to your party, boat type, dates and route.',
      sections: [
        { title: 'Route coverage', items: ['Multi-day: the Cyclades, the Ionian Islands, the North Aegean Islands, the Saronic Gulf, the Sporades and the Dodecanese', 'Day trips: Athens, Santorini, Glyfada, Zakynthos, Mykonos, Corfu, Paros, Halkidiki and Lefkada'] },
        { title: 'What the service covers', items: ['Yacht charters usually include the captain, crew and related transfers, subject to the vessel plan', 'We can match sailing or motor yachts, private or shared, and half-day or multi-day itineraries', 'Dining, water activities and shore transfers can be arranged on request'] },
        { title: 'Season and pricing factors', items: ['June to September is the usual season for sailing in Greece; other months are cooler with rougher seas', 'Pricing depends mainly on boat type, charter method, travel dates, trip length and services required', 'Confirmed dates and routes get priority; you may also nominate a specific vessel'] },
        { title: 'Booking confirmation', items: ['Half-day and day-trip sailings depend on sea conditions, port operations and the vessel schedule on the day', 'Yacht services are booked once prepayment is made to the designated account as agreed in the plan'] }
      ],
      note: 'Vessels, routes and final quotations are subject to real-time availability and owner confirmation.', cta: 'Discuss a yacht plan'
    }
  }
};

// 首页奢享体验卡片：与详情页共用同一份多语言文案，避免页面内硬编码中文。
const cards = {
  'zh-CN': [
    { id: 'jet', img: '/assets/images/lux/lux-jet.jpg', name: '私人包机', desc: '雅典—圣岛直达\n海景航线俯瞰基克拉泽斯群岛' },
    { id: 'yacht', img: '/assets/images/lux/lux-yacht.jpg', name: '游艇出海', desc: '帆船/机艇包船\n火山岛浮潜 · 海上落日晚宴' }
  ],
  'zh-TW': [
    { id: 'jet', img: '/assets/images/lux/lux-jet.jpg', name: '私人包機', desc: '雅典—聖島直達\n海景航線俯瞰基克拉澤斯群島' },
    { id: 'yacht', img: '/assets/images/lux/lux-yacht.jpg', name: '遊艇出海', desc: '帆船／機艇包船\n火山島浮潛 · 海上落日晚宴' }
  ],
  en: [
    { id: 'jet', img: '/assets/images/lux/lux-jet.jpg', name: 'Private jet charter', desc: 'Direct Athens–Santorini\nCyclades views from the air' },
    { id: 'yacht', img: '/assets/images/lux/lux-yacht.jpg', name: 'Yacht day charter', desc: 'Sailing or motor yacht\nIslet snorkelling · dinner at sea' }
  ]
};

function getLuxuryDetail(type, locale) {
  const group = details[locale] || details['zh-CN'];
  return group[type] || group.jet;
}

function getLuxuryCards(locale) {
  return cards[locale] || cards['zh-CN'];
}

module.exports = { getLuxuryDetail, getLuxuryCards };
