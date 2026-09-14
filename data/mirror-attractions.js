// 景点区数据库（参考博物旅人内容结构：城市 → 景点列表 → 景点详情）
// guide = 参观指南；highlights = 必看亮点；deep = 深度文史讲解（免费预览 + 付费解锁）

const cities = [
  {
    id: 'athens', cover: '/assets/images/dest/dest-athens.jpg', name: '雅典', en: 'ATHENS',
    subtitle: '希腊',
    museumCount: 13, guidePointCount: 1303, audioMinutes: 2133,
    price: '€12.99',
    purchaseNote: '城市导览讲解包 · 含全部景点深度讲解',
    mosaic: [
      '/assets/images/hero/hero-acropolis.jpg',
      '/assets/images/dest/dest-athens.jpg',
      '/assets/images/route/route-athens.jpg',
      '/assets/images/dest/dest-delphi.jpg',
      '/assets/images/hero/hero-santorini.jpg',
      '/assets/images/dest/dest-meteora.jpg'
    ]
  },
  {
    id: 'santorini', cover: '/assets/images/dest/dest-santorini.jpg', name: '圣托里尼', en: 'SANTORINI',
    subtitle: '基克拉泽斯群岛',
    museumCount: 6, guidePointCount: 612, audioMinutes: 986,
    price: '€9.99',
    purchaseNote: '城市导览讲解包 · 含全部景点深度讲解',
    mosaic: [
      '/assets/images/hero/hero-santorini.jpg',
      '/assets/images/dest/dest-santorini.jpg',
      '/assets/images/route/route-santorini.jpg',
      '/assets/images/dest/dest-mykonos.jpg',
      '/assets/images/lux/lux-yacht.jpg',
      '/assets/images/hero/hero-couple.jpg'
    ]
  },
  {
    id: 'delphi', cover: '/assets/images/dest/dest-delphi.jpg', name: '德尔斐', en: 'DELPHI',
    subtitle: '中希腊大区',
    museumCount: 3, guidePointCount: 287, audioMinutes: 452,
    price: '€6.99',
    purchaseNote: '城市导览讲解包 · 含全部景点深度讲解',
    mosaic: [
      '/assets/images/dest/dest-delphi.jpg',
      '/assets/images/route/route-heritage.jpg',
      '/assets/images/dest/dest-peloponnese.jpg',
      '/assets/images/hero/hero-acropolis.jpg'
    ]
  },
  {
    id: 'meteora', cover: '/assets/images/dest/dest-meteora.jpg', name: '梅黛奥拉', en: 'METEORA',
    subtitle: '色萨利大区',
    museumCount: 4, guidePointCount: 326, audioMinutes: 518,
    price: '€6.99',
    purchaseNote: '城市导览讲解包 · 含全部景点深度讲解',
    mosaic: [
      '/assets/images/dest/dest-meteora.jpg',
      '/assets/images/route/route-heritage.jpg',
      '/assets/images/hero/hero-acropolis.jpg',
      '/assets/images/dest/dest-delphi.jpg'
    ]
  },
  {
    id: 'crete', cover: '/assets/images/dest/dest-crete.jpg', name: '克里特', en: 'CRETE',
    subtitle: '克里特大区',
    museumCount: 5, guidePointCount: 548, audioMinutes: 874,
    price: '€8.99',
    purchaseNote: '城市导览讲解包 · 含全部景点深度讲解',
    mosaic: [
      '/assets/images/dest/dest-crete.jpg',
      '/assets/images/dest/dest-santorini.jpg',
      '/assets/images/route/route-heritage.jpg',
      '/assets/images/dest/dest-mykonos.jpg'
    ]
  },
  {
    id: 'nafplio', cover: '/assets/images/dest/dest-nafplion.jpg', name: '纳夫普利翁', en: 'NAFPLIO',
    subtitle: '伯罗奔尼撒 · 希腊南部',
    museumCount: 7, guidePointCount: 694, audioMinutes: 1105,
    price: '€9.99',
    purchaseNote: '城市导览讲解包 · 含全部景点深度讲解',
    mosaic: [
      '/assets/images/dest/dest-peloponnese.jpg',
      '/assets/images/route/route-peloponnese.jpg',
      '/assets/images/dest/dest-nafplion.jpg',
      '/assets/images/dest/dest-delphi.jpg'
    ]
  }
];

const CITY_NAMES = { athens: '雅典', santorini: '圣托里尼', delphi: '德尔斐', meteora: '梅黛奥拉', crete: '克里特', nafplio: '纳夫普利翁' };

const attractions = [
  {
    id: 'acropolis',
    sizeLabel: '超大型',
    originalName: 'Ακρόπολη Αθηνών',
    city: 'athens', cityName: '雅典',
    name: '雅典卫城',
    en: 'ACROPOLIS',
    category: '世界文化遗产',
    image: '/assets/images/hero/hero-acropolis.jpg',
    summary: '站在雅典卫城，不只看一座神庙，也读懂古希腊人如何理解秩序、光与人的尺度。超3000年历史的西方文明重要发源地，希腊国宝级文明象征。',
    highlights: [
      { name: '帕特农神庙', desc: '献给雅典娜的主神庙，多立克柱式的巅峰之作，"看起来笔直却处处有曲线"的视觉奇迹。' },
      { name: '伊瑞克提翁神庙', desc: '南柱廊的六尊女像柱是卫城最优雅的身影，原作藏于卫城博物馆。' },
      { name: '卫城山门', desc: '进入圣区的仪式性大门，建筑师用倾斜的柱子制造透视校正。' },
      { name: '雅典娜胜利神庙', desc: '悬崖边的小型爱奥尼亚神庙，纪念波斯战争中的胜利。' },
      { name: '狄俄尼索斯剧场', desc: '西方戏剧的诞生地，埃斯库罗斯与索福克勒斯的首演舞台。' }
    ],
    guide: {
      hours: '夏令季（4–10月）约 08:00–19:30，冬季约 08:00–17:00，节庆与修复工程可能调整，以现场公示为准。',
      tickets: '通用联票（含卫城与斜坡古迹）约 €20–30，旺季以现场为准；欧洲学生及特定群体凭证件减免；强烈建议提前线上购票避开排队。',
      transport: '地铁 2 号线 Akropoli 站步行约 10 分钟；周边停车位紧张，不建议自驾前往。',
      worth: '清晨或傍晚光线最柔和、游人较少；从山门远眺利卡维多斯山与雅典全城是最佳机位。',
      services: '山脚的卫城博物馆展陈卫城原作雕塑；山上近入口处有饮水点与洗手间。',
      family: '步道多为石铺坡道；给孩子讲"雅典娜与波塞冬争夺城市"的故事，参观会更投入。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '夏季山顶无遮挡，务必防晒带水；大理石地面湿滑，请穿防滑步行鞋。',
      notices: ''
    },
    deepDive: {
      preview: '为什么帕特农神庙看起来"笔直"却处处有曲线？Richard 用 1 分钟带你找到第一处细节。',
      locked: ['神庙建筑比例与视觉修正', '雅典娜神话与城邦记忆', '现场观看动线与讲解手册']
    }
  },
  {
    id: 'acropolis-museum',
    sizeLabel: '大型',
    originalName: 'Μουσείο Ακρόπολης',
    city: 'athens', cityName: '雅典',
    name: '雅典卫城博物馆',
    en: 'ACROPOLIS MUSEUM',
    category: '现代博物馆',
    image: '/assets/images/dest/dest-athens.jpg',
    summary: '由建筑师 Bernard Tschumi 设计的玻璃与光之馆，脚下就是考古遗址，帕特农浮雕带在此完整呈现。',
    highlights: [
      { name: '玻璃坡道展厅', desc: '入口斜廊下方的发掘遗址与坡道两侧的古典雕塑，是进入正式展厅前的序章。' },
      { name: '女像柱原作厅', desc: '五尊卡里亚提德女像柱原作在封闭展台上静立，第六尊现存大英博物馆。' },
      { name: '帕特农展厅', desc: '与神庙同比例的玻璃长厅，92 块柱间壁浮雕与 160 米檐部浮雕带按原位陈列。' },
      { name: '考古挖掘现场', desc: '博物馆地基之下是公元前 4000 年起的居住遗址，透过玻璃地板俯瞰层层叠压的历史。' }
    ],
    guide: {
      hours: '周一 09:00–17:00，周二至周日 09:00–20:00，周五延长至 22:00；12 月至 4 月周五开放至 22:00，具体以官网为准。',
      tickets: '旺季 4–10 月 20 欧、淡季 11–3 月 10 欧；18 岁以下与欧盟学生免费；每月部分免费日与考古纪念日免费开放。',
      transport: '地铁 2 号线 Acropoli 站步行 2 分钟，位于卫城东出口下方，与卫城山顶游览动线自然衔接。',
      worth: '周五夜间开放时段氛围最佳，帕特农展厅窗外正对亮灯的卫城本体；预留至少 2 小时。',
      services: '免费寄存柜、二层咖啡厅与餐厅（露台正对卫城）、书店；馆内允许无闪光灯摄影（部分临展区除外）。',
      family: '设有家庭探索路线手册与儿童考古工作坊（周末）；玻璃地板对孩子们极具吸引力，注意牵好手。',
      map: '动线为单向上行：坡道遗址层 → 女像柱与古典雕塑层 → 帕特农顶层展厅，顶层向东俯瞰卫城。',
      shop: '一层书店为雅典最优质的艺术书店之一，复刻文创、考古图册与儿童绘本齐全。',
      accessibility: '全馆无障碍，轮椅可从侧门进入并直达各层；提供轮椅租借与多语种语音导览。',
      exhibitions: '地下一层不定期举办特展，近期关注希腊考古新发现主题；馆方官网每月更新展讯。',
      faq: '包可以带吗？大于 A4 的包须寄存；能拍照吗？常设展可以，禁闪光灯；有中文讲解吗？语音导览含中文版本可租借。',
      notices: '旺季周末下午人流密集，建议上午或周五夜间前往；顶层展厅温度较低，备一件薄外套。'
    },
    deepDive: {
      preview: '免费预览：女像柱、浮雕带与玻璃地板下的遗址，一座为卫城而生的博物馆。',
      locked: ['馆藏精讲音频', '帕特农浮雕图文导览', '策展动线深度解读']
    }
  },
  {
    id: 'athens-landmarks',
    sizeLabel: '大型',
    originalName: 'Σύνταγμα & Κέντρο Αθηνών',
    city: 'athens', cityName: '雅典',
    name: '雅典地标巡礼',
    en: 'SYNTAGMA & CITY LANDMARKS',
    category: '首都地标',
    image: '/assets/images/dest/dest-athens.jpg',
    summary: '宪法广场、国家议会大厦（原皇宫）、无名英雄纪念碑、皇家花园、扎皮翁宫与第一届现代奥运会体育场，一条动线读懂现代希腊的国家叙事。',
    highlights: [
      { name: '总统卫队换岗仪式', desc: '每逢整点在无名英雄纪念碑前举行，身着传统裙装护卫的标志性一幕；周日 11:00 的大换岗更为隆重。' },
      { name: '泛雅典娜体育场', desc: '第一届现代奥林匹克运动会主场馆，也是奥运圣火交接仪式场地，全大理石建造。' },
      { name: '皇家花园与扎皮翁宫', desc: '市中心难得的绿荫，散步至扎皮翁宫，看新古典主义的雅典。' },
      { name: '国家议会大厦', desc: '原为皇宫，门前宪法广场是雅典人集会与庆典的中心。' }
    ],
    guide: {
      hours: '广场与外部地标全天开放；换岗仪式每整点一次，周日 11:00 为大换岗。',
      tickets: '广场、花园与纪念碑免费；泛雅典娜体育场参观约 €10，以现场为准。',
      transport: '地铁 Syntagma 站出站即达；各地标步行皆在 15 分钟圈内。',
      worth: '把换岗仪式安排在整点前 10 分钟到场占位；傍晚沿皇家花园走向体育场一路舒适。',
      services: '宪法广场周边咖啡与餐饮密集，适合中途休息。',
      family: '换岗仪式的慢动作正步对孩子极具吸引力；皇家花园是跑放电的好去处。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '拍摄卫队请保持距离，勿使用闪光灯；大型集会活动日广场可能管制。',
      notices: ''
    },
    deepDive: {
      preview: '卫队的裙装、垂穗与慢动作正步，每一处细节都有出处。先听一段免费预览。',
      locked: ['希腊独立史与卫队传统', '新古典主义建筑漫步路线', '换岗仪式观看攻略']
    }
  },
  {
    id: 'likavitos',
    sizeLabel: '中型',
    originalName: 'Λυκαβηττός',
    city: 'athens', cityName: '雅典',
    name: '利卡维多斯山',
    en: 'LIKAVITOS HILL',
    category: '城市观景',
    image: '/assets/images/route/route-athens.jpg',
    summary: '雅典都会区最高自然观景点（277米），从狼山之巅360°俯瞰无与伦比的雅典都会区和爱琴海全景，全面领略"众神眷顾之城"的浪漫与壮丽。',
    highlights: [
      { name: '山顶全景平台', desc: '360°俯瞰雅典全城、卫城与远处的爱琴海，日落与夜景时段最佳。' },
      { name: '圣乔治小教堂', desc: '白色小教堂是山顶地标，攀登至此的传统终点。' },
      { name: '山顶缆车', desc: '从 Kolonaki 区乘缆车登顶，坡道穿越山体与城市屋檐。' },
      { name: '夜景餐厅', desc: '山顶知名餐厅需预订，晚餐后专车送回酒店最从容。' }
    ],
    guide: {
      hours: '山体全天开放；缆车约 09:00–次日 02:30 运行，天气恶劣可能停运。',
      tickets: '登山步道免费；缆车单程约 €10、往返约 €15，以现场为准。',
      transport: '缆车站位于 Kolonaki 区 Aristippou 街；自驾可沿山路直达山顶停车场。',
      worth: '日落前 1 小时登顶，一次看完白天、日落与夜景三种雅典。',
      services: '山顶有餐厅与咖啡座，傍晚风大建议带外套。',
      family: '缆车体验深受孩子喜爱；步道较陡，儿童建议缆车上下。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '夏季傍晚山顶拥挤，晚餐务必提前预订。',
      notices: ''
    },
    deepDive: {
      preview: '狼山的名字来自一个关于狼与神明的传说，1 分钟听懂它的来历。',
      locked: ['雅典城市地理与山丘体系', '最佳拍摄时段与机位', '山顶餐厅预订攻略']
    }
  },
  {
    id: 'benaki-museum',
    sizeLabel: '大型',
    originalName: 'Μουσείο Μπενάκη',
    city: 'athens', cityName: '雅典',
    name: '贝纳基博物馆',
    en: 'BENAKI MUSEUM',
    category: '博物馆',
    image: '/assets/images/dest/dest-athens.jpg',
    summary: '为纪念马其顿·贝纳基斯而建，藏品涵盖从史前时期到现代希腊的艺术、伊斯兰艺术、亚洲艺术以及欧洲装饰艺术。',
    highlights: [
      { name: '希腊历史长廊', desc: '从史前到现代希腊的完整叙事，一部可以行走的希腊通史。' },
      { name: '伊斯兰艺术馆藏', desc: '世界顶级的伊斯兰艺术收藏之一，青铜器与陶瓷精品荟萃。' },
      { name: '亚洲艺术与中国瓷器', desc: '远东艺术馆藏，含中国古代瓷器与绘画精品。' },
      { name: '新古典主义宅邸', desc: '博物馆本身就是雅典最优雅的新古典主义建筑之一。' }
    ],
    guide: {
      hours: '周三与周日约 10:00–18:00，周四至周六延长至 22:00（部分展厅），周一/周二闭馆，以官网公示为准。',
      tickets: '主馆约 €15（旺季以现场为准），特定群体减免；周四晚间部分时段免费。',
      transport: '位于 Kolonaki 区 Vassilissis Sofias 大道，地铁 Evangelismos 站步行约 8 分钟。',
      worth: '顶层咖啡馆的卫城视角露台是隐藏彩蛋；配合国家考古博物馆形成一日双馆动线。',
      services: '馆内咖啡厅、纪念品商店与顶层露台餐厅；大型背包需寄存。',
      family: '中国瓷器与兵器展厅对孩子最友好；展线紧凑，1.5–2 小时可看完。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '馆内禁止使用闪光灯；临展与常设展可能分开售票。',
      notices: ''
    },
    deepDive: {
      preview: '一座私人宅邸如何长成国家级博物馆？1 分钟免费预览讲它的故事。',
      locked: ['贝纳基斯家族与藏品源流', '希腊现代史的物证阅读', '双馆动线与时段安排']
    }
  },
  {
    id: 'national-archaeological-museum',
    sizeLabel: '超大型',
    originalName: 'Εθνικό Αρχαιολογικό Μουσείο',
    city: 'athens', cityName: '雅典',
    name: '雅典国家考古博物馆',
    en: 'NATIONAL ARCHAEOLOGICAL MUSEUM',
    category: '博物馆',
    image: '/assets/images/dest/dest-athens.jpg',
    summary: '希腊最重要的文物馆藏，从迈锡尼黄金面具到安提基特拉机械，一部浓缩的地中海古代文明史。',
    highlights: [
      { name: '阿伽门农黄金面具', desc: '迈锡尼文明的巅峰之作，史前世界最著名的金器。' },
      { name: '安提基特拉机械', desc: '两千多年前的"天文计算机"，古代世界最精密的齿轮装置。' },
      { name: '安提基特拉青年铜像', desc: '海底打捞出的古典时期青铜像，优雅的原地转身。' },
      { name: '青铜器与雕塑长廊', desc: '从古风到希腊化时期的雕塑序列，读懂人体表现的演变。' },
      { name: '圣托里尼壁画画廊', desc: '阿克罗蒂里遗址出土的 fresco，3600 年前的爱琴海生活。' }
    ],
    guide: {
      hours: '约 09:00–20:00（旺季），周一或节假日可能调整，以官网公示为准。',
      tickets: '约 €15（旺季以现场为准），特定群体减免；语音导览另计。',
      transport: '地铁 Victoria 站步行约 10 分钟，或地铁 1 号线 Thissio 后打车前往。',
      worth: '建议留 2–3 小时；先看迈锡尼与圣托里尼展厅，再走雕塑长廊。',
      services: '馆内咖啡厅与纪念品商店齐备；大型背包需寄存。',
      family: '安提基特拉机械与青铜像对孩子最友好，可配"寻宝式"参观任务。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '馆内禁止使用闪光灯；旺季午后旅行团密集，上午参观更从容。',
      notices: ''
    },
    deepDive: {
      preview: '一件展品一个时代：从陶片与铜像开始，认识被时间保留下来的线索。',
      locked: ['镇馆之宝深度解读', '米诺斯与迈锡尼时间线', '两小时精华动线']
    }
  },
  {
    id: 'oia',
    sizeLabel: '大型',
    originalName: 'Οία',
    city: 'santorini', cityName: '圣托里尼',
    name: '伊亚小镇',
    en: 'OIA',
    category: '蓝白小镇',
    image: '/assets/images/dest/dest-santorini.jpg',
    summary: '被誉为"世界最奢华的极致浪漫小镇"。漫步悬崖步道，蓝顶教堂与风车观景台是世界著名的历史和文化地标，远眺圣托里尼绝美天际线和火山岛自然奇观。',
    highlights: [
      { name: '蓝顶教堂', desc: '白色教堂与蓝色圆顶构成圣托里尼最经典的画面，明信片主角。' },
      { name: '风车观景台', desc: '悬崖边的老风车群，俯瞰火山岛与爱琴海的日落最佳位置。' },
      { name: '悬崖步道', desc: '沿悬崖蜿蜒的白墙小巷，每一步都是基克拉泽斯风情的取景框。' },
      { name: 'Ammoudi 海湾', desc: '悬崖脚下的红色小渔港，海鲜餐厅与跳水者的天堂。' }
    ],
    guide: {
      hours: '小镇全天开放；日落时段（约 18:00–21:00，随季节）为客流高峰。',
      tickets: '免费开放；部分观景平台由商铺维护，消费即可使用。',
      transport: '从费拉乘车约 20 分钟；镇内步行为主，行李建议委托酒店接驳。',
      worth: '清晨的伊亚安静空旷；傍晚在风车观景台看"世界最美日落"。',
      services: '悬崖步道沿途布满精品店、画廊与咖啡座。',
      family: '悬崖边缘无护栏路段需牵好孩子；台阶较多，婴儿车不便。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '夏季日落时分人潮拥挤，提前 40 分钟占位；穿平底鞋走石阶。',
      notices: ''
    },
    deepDive: {
      preview: '蓝与白为什么成了圣托里尼的肤色？从一段免费预览开始。',
      locked: ['基克拉泽斯建筑源流', '悬崖小镇空间阅读', '避开人潮的拍摄路线']
    }
  },
  {
    id: 'fira',
    sizeLabel: '中型',
    originalName: 'Φηρά',
    city: 'santorini', cityName: '圣托里尼',
    name: '费拉小镇',
    en: 'FIRA',
    category: '岛屿首府',
    image: '/assets/images/dest/dest-santorini.jpg',
    summary: '圣托里尼首府，面朝爱琴海的悬崖都会。大都会圣母报喜主教堂、三钟教堂等地标与网红悬崖咖啡馆、精品店和艺术画廊，深入感受圣托里尼的生活脉搏。',
    highlights: [
      { name: '大都会圣母报喜主教堂', desc: '费拉地标性的白色大教堂与钟楼，米白与香草色的典雅组合。' },
      { name: '三钟教堂', desc: '三口钟悬挂于蓝色穹顶之下，明信片上的费拉符号。' },
      { name: '悬崖咖啡馆', desc: '面朝爱琴海的网红咖啡馆，海风与咖啡一起慢慢来。' },
      { name: '旧港缆车', desc: '连接费拉与旧港的缆车与骡道，悬崖上下的经典体验。' }
    ],
    guide: {
      hours: '小镇全天开放；商店与咖啡馆多为 10:00–23:00。',
      tickets: '免费开放；缆车单程约 €6，以现场为准。',
      transport: '岛上巴士枢纽所在地，往返各镇均在此换乘；机场乘车约 15 分钟。',
      worth: '傍晚沿悬崖主路散步，把精品店、画廊与日落一次逛完。',
      services: '银行、药房、超市与诊所齐备，是岛上生活机能中心。',
      family: '缆车与骡道是孩子的最爱；悬崖主路推车基本可行。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '游轮停靠日（约 08:00–17:00）小镇拥挤，错峰体验更佳。',
      notices: ''
    },
    deepDive: {
      preview: '费拉的悬崖之下藏着被火山灰掩埋的旧港故事，先听免费预览。',
      locked: ['火山喷发与岛屿史', '悬崖建筑的空间逻辑', '旧港上下四种方式']
    }
  },
  {
    id: 'pyrgos',
    sizeLabel: '中型',
    originalName: 'Πύργος Καλλίστης',
    city: 'santorini', cityName: '圣托里尼',
    name: '皮尔戈斯山城小镇',
    en: 'PYRGOS KALLISTIS',
    category: '中世纪山城',
    image: '/assets/images/route/route-santorini.jpg',
    summary: '圣托里尼中部富有浓厚中世纪风格的魅力小镇。山顶Kasteli城堡俯瞰葡萄园、白色村落和爱琴海，安静和古朴的海岛小镇慢生活。',
    highlights: [
      { name: 'Kasteli 城堡遗址', desc: '威尼斯人修建的山顶城堡，全岛制高点之一，360°环视圣托里尼。' },
      { name: '山城小巷', desc: '未过度商业化的白墙巷弄，本地人真实生活的模样。' },
      { name: '葡萄酒庄', desc: '山脚葡萄园环抱，圣岛火山土葡萄酒的品鉴地。' },
      { name: '日落观景', desc: '比伊亚更安静的日落选择，游客少、视野开阔。' }
    ],
    guide: {
      hours: '小镇全天开放；城堡遗址全天可进入。',
      tickets: '免费开放；周边酒庄品酒约 €20–40/人，需预约。',
      transport: '从费拉乘车约 15 分钟；山道弯多，建议包车前往。',
      worth: '上午光线穿巷最美；傍晚登城堡看日落比伊亚更从容。',
      services: '镇上有多家本地餐厅与咖啡座，游客少无需排队。',
      family: '巷弄坡道平缓，适合家庭漫步；酒庄多为庭院式，孩子可活动。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '镇内设施较少，按需自备饮水；周日部分店铺休息。',
      notices: ''
    },
    deepDive: {
      preview: 'Kasteli 城堡为什么建在全岛最高点？1 分钟免费预览告诉你答案。',
      locked: ['威尼斯统治时期的岛屿', '火山土葡萄种植的秘密', '本地餐厅选择指南']
    }
  },
  {
    id: 'black-beach',
    sizeLabel: '中型',
    originalName: 'Παραλία Περίσσας',
    city: 'santorini', cityName: '圣托里尼',
    name: '圣托里尼黑沙滩',
    en: 'PERISSA BLACK BEACH',
    category: '海滩休闲',
    image: '/assets/images/dest/dest-santorini.jpg',
    summary: '火山造就的黑色沙滩。东南岛黑沙滩海滩游泳、躺椅休闲、近海划船等海滩活动和休闲，是蓝白小镇之外另一种圣岛打开方式。',
    highlights: [
      { name: '黑色火山沙滩', desc: '火山碎屑形成的细黑沙滩，海水清澈见底。' },
      { name: 'Mesa Vouno 岩山', desc: '沙滩尽头的巨岩山体，山顶有古阿波罗神庙遗址。' },
      { name: '海滩俱乐部', desc: '躺椅、水上运动与沙滩酒吧一线排开，躺平一下午。' },
      { name: '近海划船与桨板', desc: '平静的近海水域适合划船、SUP 等水上活动。' }
    ],
    guide: {
      hours: '海滩全天开放；海滩俱乐部躺椅约 09:00–19:00 运营。',
      tickets: '海滩免费；躺椅与水上项目按项目收费（约 €10–40）。',
      transport: '从费拉乘车约 25 分钟；夏季有海滩巴士直达。',
      worth: '上午水面最平静适合水上活动；午后沙滩吸热，注意烫脚。',
      services: '淋浴、更衣与餐饮在海滩俱乐部内，消费即可使用。',
      family: '近海浅水区适合孩子玩水，提前准备泳衣泳具与遮阳。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '黑色沙滩正午吸热极烫，建议穿沙滩鞋；随身物品勿离人。',
      notices: ''
    },
    deepDive: {
      preview: '黑沙滩的每一粒沙都是一次喷发的证据，免费预览 1 分钟。',
      locked: ['圣岛火山地理全解', '海滩活动安全须知', '环岛海滩对比']
    }
  },
  {
    id: 'delphi',
    sizeLabel: '大型',
    originalName: 'Δελφοί',
    city: 'delphi', cityName: '德尔斐',
    name: '德尔斐考古遗址',
    en: 'DELPHI',
    category: '世界文化遗产',
    image: '/assets/images/dest/dest-delphi.jpg',
    summary: '沿着山路进入德尔斐，神谕、山谷与古代世界的中心在这里交叠。古希腊人眼中的"世界之脐"，阿波罗神庙与山谷视线构成的圣地剧场。',
    highlights: [
      { name: '阿波罗神庙', desc: '圣地的核心，皮提亚女祭司在此传达影响古代世界的神谕。' },
      { name: '雅典人宝库', desc: '保存最完好的多立克宝库，檐壁雕刻着赫拉克勒斯与忒修斯。' },
      { name: '大地之脐 Omphalos', desc: '被视为世界中心标志的蛋形石，两鹰相会的传说。' },
      { name: '古剧场与运动场', desc: '可容纳五千人的剧场俯瞰山谷，其上是泛希腊皮提亚运动会场地。' },
      { name: '德尔斐博物馆', desc: '驾战车者铜像与"世界之脐"原作所在地。' }
    ],
    guide: {
      hours: '遗址与博物馆约 08:30–15:30（冬季）/ 08:00–20:00（夏季），以官网为准。',
      tickets: '遗址与博物馆联票约 €12–20（旺季以现场为准），特定群体减免。',
      transport: '距雅典约 2.5 小时车程，山路弯多；多数游客选择包车或一日游。',
      worth: '清晨山谷薄雾中的遗址最有神性；站在古剧场顶层俯瞰 Pleistos 山谷。',
      services: '入口处有咖啡与小卖部；博物馆内有纪念品店。',
      family: '上行步道较陡，给孩子讲"神谕怎么回答国王的问题"会一路有趣。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '全程石阶较多，穿运动鞋；夏季无遮挡需防晒。',
      notices: ''
    },
    deepDive: {
      preview: '德尔斐为什么被称为"世界的肚脐"？先听一段关于 omphalos 石的免费预览。',
      locked: ['阿波罗神庙遗址详解', '神谕制度与古代旅行', '山谷视线与遗址阅读路线']
    }
  },
  {
    id: 'meteora',
    sizeLabel: '超大型',
    originalName: 'Μετέωρα',
    city: 'meteora', cityName: '梅黛奥拉',
    name: '梅黛奥拉修道院群',
    en: 'METEORA',
    category: '世界文化遗产',
    image: '/assets/images/dest/dest-meteora.jpg',
    summary: '修道院悬于岩柱之上，人与自然、信仰与时间共同完成了这幅景观。24 座修道院曾建于"天空之柱"，现存六座仍在使用。',
    highlights: [
      { name: '大梅黛奥拉修道院', desc: '最大也最著名的一座，教堂与博物馆都在岩顶之上。' },
      { name: '瓦尔拉姆修道院', desc: '以绳索与吊篮运送物资数百年，如今的吊桥步道是必经体验。' },
      { name: '圣三一修道院', desc: '007 系列电影的取景地，孤立于一根岩柱之巅。' },
      { name: '岩柱地质奇观', desc: '约 6000 万年前河床沉积抬升形成的石林，从观景台看最震撼。' }
    ],
    guide: {
      hours: '各修道院轮休（多为 09:00–17:00），每周各关闭一天，行前务必核对轮休日。',
      tickets: '每座修道院约 €3–5，只收现金；观景台免费。',
      transport: '距雅典约 4.5 小时车程；卡兰巴卡镇是住宿与出发基地。',
      worth: '日落观景台看"悬空"的修道院剪影；清晨云海中的岩柱如仙境。',
      services: '修道院内提供遮肩长裙/围裙租借；卡兰巴卡镇餐饮住宿齐备。',
      family: '石阶与吊桥对孩子像探险；台阶多，注意安全与体力分配。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '进修道院须遮盖肩膀与膝盖、勿穿拖鞋；部分区域禁止拍照。',
      notices: ''
    },
    deepDive: {
      preview: '为什么修道院要建在高耸岩柱之上？用 1 分钟了解梅黛奥拉的第一层答案。',
      locked: ['岩柱地质与修道院选址', '东正教壁画阅读提示', '拍摄时段与参访礼仪']
    }
  },
  {
    id: 'knossos',
    sizeLabel: '大型',
    originalName: 'Κνωσός',
    city: 'crete', cityName: '克里特',
    name: '克诺索斯王宫',
    en: 'KNOSSOS PALACE',
    category: '世界文化遗产',
    image: '/assets/images/dest/dest-crete.jpg',
    summary: '米诺斯文明留下迷宫般的宫殿，也留下欧洲最早的城市想象。公元前 2000 年的克里特王宫，米诺斯迷宫传说的考古现场。',
    highlights: [
      { name: '西宫大院与阶梯', desc: '多层建筑与采光井的巧妙组合，史前建筑的巅峰。' },
      { name: '公牛壁画', desc: '跃牛游戏（taurokathapsia）壁画，米诺斯艺术的代表作。' },
      { name: '王座厅', desc: '欧洲最古老的石制王座，米诺斯祭司王可能的仪式之所。' },
      { name: '欧洲之最早排水系统', desc: '陶管排水与多层建筑，4,000 年前的市政工程。' }
    ],
    guide: {
      hours: '夏季约 08:00–20:00，冬季约 08:30–15:00，以官网公示为准。',
      tickets: '约 €15（旺季以现场为准）；与伊拉克利翁考古博物馆联票更划算。',
      transport: '距伊拉克利翁市区约 20 分钟车程，市内巴士可直达。',
      worth: '清晨开门时进入，避开旅行团；配合伊拉克利翁博物馆看原作壁画。',
      services: '现场导览与讲解器可租；树荫较多，但仍建议防晒。',
      family: '"迷宫里的牛头怪"故事是最好的导览，孩子会自己找米诺陶的房间。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '遗址多为碎石路面，穿运动鞋；旺季排队较长建议早到。',
      notices: ''
    },
    deepDive: {
      preview: '从一只陶片开始，认识克里特王宫中被时间保留下来的生活线索。',
      locked: ['米诺斯文明时间线', '迷宫神话的考古线索', '壁画、仪式与王宫空间']
    }
  },
  {
    id: 'nafplio',
    sizeLabel: '中型',
    originalName: 'Ναύπλιο',
    city: 'nafplio', cityName: '纳夫普利翁',
    name: '纳夫普利翁',
    en: 'NAFPLIO',
    category: '海滨老城',
    image: '/assets/images/dest/dest-nafplion.jpg',
    summary: '希腊第一代首都的威尼斯风老港小城。棕榈滨海大道、石板老城与三座要塞，伯罗奔尼撒最宜居的度假据点。',
    highlights: [
      { name: '帕拉米迪堡垒', desc: '999 级台阶之上的威尼斯要塞，俯瞰整个阿尔戈利斯湾。' },
      { name: '老城石板巷', desc: '新古典宅邸与三角广场，转角都是咖啡馆与手作店。' },
      { name: '布尔齐海上要塞', desc: '老港防波堤尖端的海上小堡，明信片里的纳夫普利翁。' },
      { name: '滨海大道', desc: '傍晚沿棕榈大道散步看落日，本地人的日常。' }
    ],
    guide: {
      hours: '老城全天开放；帕拉米迪堡垒夏季约 08:00–20:00，冬季缩短。',
      tickets: '老城免费；帕拉米迪堡垒约 €8（旺季以现场为准）。',
      transport: '距雅典约 2 小时车程；往返周边古迹（埃皮达鲁斯/迈锡尼）以包车最便利。',
      worth: '傍晚登帕拉米迪看落日，再下老城吃一顿海鲜晚餐。',
      services: '老城餐厅、精品旅馆与手信店密集，步行即达。',
      family: '堡垒探秘与海滩玩水可组合；999 级台阶量力而行（也可驱车上山）。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '夏季周末雅典游客涌入，住宿建议提前预订。',
      notices: ''
    },
    deepDive: {
      preview: '一座小城当过整个希腊的首都？免费预览 1 分钟讲清它的身世。',
      locked: ['威尼斯与奥斯曼的双面遗产', '老城建筑漫步路线', '周边一日游组合']
    }
  },
  {
    id: 'epidaurus',
    sizeLabel: '大型',
    originalName: 'Αρχαίο Θέατρο Επιδαύρου',
    city: 'nafplio', cityName: '纳夫普利翁',
    name: '埃皮达鲁斯古剧场',
    en: 'EPIDAURUS THEATRE',
    category: '世界文化遗产',
    image: '/assets/images/dest/dest-peloponnese.jpg',
    summary: '公元前 4 世纪的医疗圣地与完美声学剧场。献给医神阿斯克勒庇俄斯的圣地中，保存最完好的古希腊剧场至今仍在演出。',
    highlights: [
      { name: '古剧场', desc: '14,000 座位的声学奇迹——舞台上撕一张纸，最后一排都听得见。' },
      { name: '医神圣地遗址', desc: '古代世界的"疗愈中心"，神庙、宿舍与医疗建筑的庞大遗存。' },
      { name: '考古博物馆', desc: '圣地出土的医疗器具与建筑构件。' },
      { name: '夏季古代戏剧节', desc: '每年 6–8 月希腊艺术节在此上演古希腊戏剧。' }
    ],
    guide: {
      hours: '夏季约 08:00–20:00，冬季约 08:30–15:30，以官网公示为准。',
      tickets: '联票（剧场+圣地+博物馆）约 €12–20（旺季以现场为准）。',
      transport: '距纳夫普利翁约 30 分钟车程，公共交通班次少，建议包车。',
      worth: '站到剧场中心圆点上试一试自己的声音；夏季戏剧节演出需提前订票。',
      services: '入口有咖啡与小卖部；树荫稀少注意防晒。',
      family: '"声音实验"是最好的亲子项目；让全家坐在最后一排听悄悄话。',
      map: '',
      shop: '',
      accessibility: '',
      exhibitions: '',
      faq: '剧场台阶高且无扶手，上下注意安全；旺季旅行团集中在 10:00–14:00。',
      notices: ''
    },
    deepDive: {
      preview: '为什么 2,400 年前的剧场声学至今无解？先听免费预览。',
      locked: ['古代医学与疗愈仪式', '剧场声学原理解读', '戏剧节观演攻略']
    }
  }
];

function getCities() {
  return cities.map((city) => ({
    ...city,
    count: attractions.filter((item) => item.cityId === city.id).length
  }));
}

function getAttractionsByCity(cityId) {
  if (!cityId || cityId === 'all') return attractions;
  return attractions.filter((item) => item.city === cityId);
}

function getAttraction(id) {
  return attractions.find((item) => item.id === id) || null;
}

function getAttractionNames(ids) {
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => {
    const item = getAttraction(id);
    return item ? { id, name: item.name } : null;
  }).filter(Boolean);
}

module.exports = { cities, attractions, getCities, getAttractionsByCity, getAttraction, getAttractionNames };
