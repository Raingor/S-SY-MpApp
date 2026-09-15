// 行程数据库
// custom    = 提交需求表后单独发送给客户的定制行程链接（详细版，参数对齐定制旅程表）
//
// schedule 服务标记字段 services 对应：接送/陪同/讲解/酒店/门票/机票/船票（★）
// attractions = 行程条目关联的景点 id（见 data/attractions.js），可点击跳转景点详情

const SERVICE_KEYS = ['接送', '陪同', '讲解', '酒店', '门票', '机票', '船票'];

// 参考行程（镜像，与后端 sampleItineraries 对齐：6 条 sample-* id 体系）
// 数据源：S-SY-Website/data/site-data.json（commit 164d1ec），本地图片映射为小程序素材
const reference = [
  {
    id: "sample-athens-3d",
    type: 'reference',
    title: "雅典经典三日",
    img: "/assets/images/route/route-athens.jpg",
    tag: "短途 · 中转",
    days: 3,
    highlights: "卫城、博物馆与老城的黄金组合，适合转机、商务间隙或首次到访。",
    crowd: "适合：中转停留 / 商务出行",
    schedule: [
      {
        day: 1,
        city: "雅典",
        entries: [ { period: '', text: "抵达雅典 · 普拉卡老城漫步\n专人接机入住后，傍晚漫步普拉卡石板巷与阿纳菲奥提卡彩色小屋区，屋顶晚餐远眺卫城夜景。", attractionIds: [] } ]
      },
      {
        day: 2,
        city: "雅典",
        entries: [ { period: '', text: "雅典卫城 · 卫城博物馆\n清晨避开人流登卫城，东出口直接衔接卫城博物馆；下午宪法广场看换岗，黄昏登利卡维多斯山看日落。", attractionIds: ["acropolis", "acropolis-museum"] } ]
      },
      {
        day: 3,
        city: "雅典",
        entries: [ { period: '', text: "国家考古博物馆 · 送机\n上午在国家考古博物馆看阿伽门农黄金面具，中午逛蒙纳斯提拉奇跳蚤市场，专车送机。", attractionIds: ["national-archaeological-museum"] } ]
      },
    ]
  },
  {
    id: "sample-ae-6d",
    type: 'reference',
    title: "雅典 + 圣托里尼六日",
    img: "/assets/images/route/route-santorini.jpg",
    tag: "经典 · 双城",
    days: 6,
    highlights: "经典蓝白组合：两天雅典看文明，三天圣岛住悬崖酒店看日落，节奏从容。",
    crowd: "适合：首次到访 / 轻松节奏",
    schedule: [
      {
        day: 1,
        city: "雅典",
        entries: [ { period: '', text: "抵达雅典 · 地标巡礼\n接机入住后游览宪法广场、议会大厦与无名英雄纪念碑，傍晚登利卡维多斯山看夜景晚餐。", attractionIds: [] } ]
      },
      {
        day: 2,
        city: "雅典",
        entries: [ { period: '', text: "雅典卫城深度游\n下午前往卫城，世界文化遗产与 3000 年文明现场；晚上温泉湖畔景观餐厅。", attractionIds: ["acropolis"] } ]
      },
      {
        day: 3,
        city: "圣托里尼",
        entries: [ { period: '', text: "飞抵圣托里尼 · 伊亚悬崖酒店\n内陆航班 45 分钟直达，入住伊亚悬崖酒店开启蓝白假期，晚上悬崖海景餐厅晚餐。", attractionIds: ["oia"] } ]
      },
      {
        day: 4,
        city: "圣托里尼",
        entries: [ { period: '', text: "伊亚 · 费拉小镇\n上午伊亚蓝顶教堂与风车观景台，下午费拉小镇悬崖咖啡馆与艺术画廊，晚上悬崖餐厅晚餐。", attractionIds: ["oia"] } ]
      },
      {
        day: 5,
        city: "圣托里尼",
        entries: [ { period: '', text: "皮尔戈斯 · 黑沙滩\n上午中世纪山城小镇与城堡俯瞰，下午黑沙滩海滩休闲，晚上日落海鲜餐厅收官。", attractionIds: ["pyrgos"] } ]
      },
      {
        day: 6,
        city: "雅典",
        entries: [ { period: '', text: "返回雅典 · 回国\n上午航班返回雅典，值机协助后启程回国。", attractionIds: [] } ]
      },
    ]
  },
  {
    id: "sample-heritage-7d",
    type: 'reference',
    title: "文明溯源七日",
    img: "/assets/images/route/route-heritage.jpg",
    tag: "文明 · 溯源",
    days: 7,
    highlights: "雅典、德尔斐、梅黛奥拉三大世界遗产连线，中文向导随行把神话讲成故事。",
    crowd: "适合：世遗深度 / 人文爱好者",
    schedule: [
      {
        day: 1,
        city: "雅典",
        entries: [ { period: '', text: "抵达雅典 · 老城欢迎晚宴\n接机入住，傍晚普拉卡老城漫步与屋顶餐厅晚宴。", attractionIds: [] } ]
      },
      {
        day: 2,
        city: "雅典",
        entries: [ { period: '', text: "雅典考古核心日\n卫城、卫城博物馆与古代市集，梳理古典雅典的城市脉络。", attractionIds: ["acropolis", "acropolis-museum"] } ]
      },
      {
        day: 3,
        city: "德尔斐",
        entries: [ { period: '', text: "德尔斐 · 阿拉霍瓦\n驱车前往「世界中心」，阿波罗神庙与古剧场，傍晚宿山脚小镇阿拉霍瓦。", attractionIds: ["delphi"] } ]
      },
      {
        day: 4,
        city: "卡兰巴卡",
        entries: [ { period: '', text: "梅黛奥拉修道院（上）\n大梅黛奥拉与瓦尔拉姆两座修道院，黄昏观景台看石柱群光影。", attractionIds: ["meteora"] } ]
      },
      {
        day: 5,
        city: "雅典",
        entries: [ { period: '', text: "梅黛奥拉（下）· 返回雅典\n清晨再访圣三一修道院，午后返回雅典自由休整。", attractionIds: ["meteora"] } ]
      },
      {
        day: 6,
        city: "雅典",
        entries: [ { period: '', text: "国家考古博物馆 · 苏尼翁角日落\n上午博物馆精讲，黄昏驱车阿提加最南端波塞冬神庙看爱琴海日落。", attractionIds: ["national-archaeological-museum"] } ]
      },
      {
        day: 7,
        city: "雅典",
        entries: [ { period: '', text: "自由活动 · 送机\n根据航班时间自由活动或补购手信，专车送机返程。", attractionIds: [] } ]
      },
    ]
  },
  {
    id: "sample-family-7d",
    type: 'reference',
    title: "经典三城家庭游",
    img: "/assets/images/route/route-peloponnese.jpg",
    tag: "亲子 · 家庭",
    days: 7,
    highlights: "雅典、纳夫普利翁与伯罗奔尼撒的神话遗迹连成一线，每天车程控制在两小时内，节奏松紧由家庭自己定。",
    crowd: "适合：亲子家庭 / 轻松度假",
    schedule: [
      {
        day: 1,
        city: "雅典",
        entries: [ { period: '', text: "抵达雅典 · 适应时差\n接机入住适合家庭的公寓式酒店，傍晚宪法广场看换岗、国家花园散步，早睡倒时差。", attractionIds: ["athens-landmarks"] } ]
      },
      {
        day: 2,
        city: "雅典",
        entries: [ { period: '', text: "卫城亲子寻宝 · 普拉卡\n上午深度游览卫城与卫城博物馆，下午普拉卡老城亲子寻宝游戏，晚餐希腊烤肉家庭餐。", attractionIds: ["acropolis", "acropolis-museum"] } ]
      },
      {
        day: 3,
        city: "纳夫普利翁",
        entries: [ { period: '', text: "科林斯运河 · 纳夫普利翁\n跨越科林斯运河抵达海边老城，帕拉米迪城堡俯瞰海湾，傍晚老城漫步与冰淇淋时间。", attractionIds: ["nafplio"] } ]
      },
      {
        day: 4,
        city: "纳夫普利翁",
        entries: [ { period: '', text: "迈锡尼 · 埃皮达鲁斯古剧场\n上午探秘狮子门与阿伽门农墓（神话现场课），下午古剧场测试 2400 年前的传声奇迹，孩子可在剧场中心朗读体验。", attractionIds: ["epidaurus"] } ]
      },
      {
        day: 5,
        city: "纳夫普利翁",
        entries: [ { period: '', text: "波罗斯岛跳岛 · 海滩下午\n乘船登波罗斯岛，钟楼与柠檬林漫步，海鲜午餐后海滩自由活动与游泳。", attractionIds: [] } ]
      },
      {
        day: 6,
        city: "雅典",
        entries: [ { period: '', text: "返回雅典 · 告别晚宴\n上午返回雅典，下午利卡维多斯山看全城日落，晚上普拉卡告别晚宴与民俗歌舞。", attractionIds: ["likavitos"] } ]
      },
      {
        day: 7,
        city: "雅典",
        entries: [ { period: '', text: "国家考古博物馆 · 送机\n上午看阿伽门农黄金面具（衔接迈锡尼行程），专车送机返程。", attractionIds: ["national-archaeological-museum"] } ]
      },
    ]
  },
  {
    id: "sample-ae-5d",
    type: 'reference',
    title: "雅典 + 圣托里尼五日",
    img: "/assets/images/route/route-santorini.jpg",
    tag: "蜜月 · 情侣",
    days: 5,
    highlights: "蜜月经典：两天雅典看文明，两天圣岛住悬崖酒店看日落，节奏从容。",
    crowd: "适合：蜜月婚礼 / 浪漫之旅",
    schedule: [
      {
        day: 1,
        city: "雅典",
        entries: [ { period: '', text: "抵达雅典 · 地标巡礼\n上午·雅典国际机场接机，入住市区酒店休整；下午·雅典地标巡礼：宪法广场换岗仪式、皇家花园、泛雅典娜体育场", attractionIds: ["athens-landmarks"] } ]
      },
      {
        day: 2,
        city: "雅典",
        entries: [ { period: '', text: "卫城深度 · 温泉湖晚餐\n上午·雅典卫城深度游览（以实际购票时间为准）；下午·普拉卡老城与国家考古博物馆；晚上·Lake Vouliagmeni 天然温泉湖畔餐厅晚餐（须预订）", attractionIds: ["acropolis", "national-archaeological-museum"] } ]
      },
      {
        day: 3,
        city: "圣托里尼",
        entries: [ { period: '', text: "飞抵圣托里尼 · 悬崖酒店\n上午·飞往圣托里尼，入住伊亚悬崖酒店；下午·酒店休整或悬崖步道漫步；晚上·悬崖海景餐厅晚餐，静享爱琴海暮色", attractionIds: [] } ]
      },
      {
        day: 4,
        city: "圣托里尼",
        entries: [ { period: '', text: "伊亚 · 费拉小镇\n上午·伊亚小镇：蓝顶教堂、风车观景台与悬崖步道；下午·费拉小镇：主教堂、三钟教堂与悬崖咖啡馆；晚上·知名悬崖餐厅晚餐（须预订）", attractionIds: ["fira", "oia"] } ]
      },
      {
        day: 5,
        city: "雅典",
        entries: [ { period: '', text: "返回雅典 · 回国\n上午·圣托里尼机场返回雅典，转乘回国航班", attractionIds: [] } ]
      },
    ]
  },
  {
    id: "sample-heritage-9d",
    type: 'reference',
    title: "全遗产环游九日",
    img: "/assets/images/route/route-heritage.jpg",
    tag: "深度 · 定制",
    days: 9,
    highlights: "雅典、德尔斐、梅黛奥拉、圣托里尼与克里特连线，全希腊世界遗产一次走完。",
    crowd: "适合：深度文化 / 沉浸体验",
    schedule: [
      {
        day: 1,
        city: "雅典",
        entries: [ { period: '', text: "抵达雅典 · 地标与夜景\n上午·雅典国际机场接机，入住市区酒店休整；下午·雅典地标巡礼，傍晚利卡维多斯山夜景", attractionIds: ["athens-landmarks"] } ]
      },
      {
        day: 2,
        city: "雅典",
        entries: [ { period: '', text: "雅典考古核心\n上午·雅典卫城深度游览；下午·国家考古博物馆", attractionIds: ["acropolis", "national-archaeological-museum"] } ]
      },
      {
        day: 3,
        city: "卡兰巴卡",
        entries: [ { period: '', text: "德尔斐 · 卡兰巴卡\n上午·前往德尔斐：阿波罗神庙与\"世界之脐\"；晚上·穿越山脉抵达卡兰巴卡小镇入住", attractionIds: ["delphi"] } ]
      },
      {
        day: 4,
        city: "雅典",
        entries: [ { period: '', text: "梅黛奥拉修道院\n上午·梅黛奥拉修道院群：悬于岩柱之巅的信仰奇观；晚上·返回雅典休整", attractionIds: ["meteora"] } ]
      },
      {
        day: 5,
        city: "圣托里尼",
        entries: [ { period: '', text: "飞抵圣托里尼 · 伊亚\n上午·飞往圣托里尼，入住悬崖酒店；下午·伊亚小镇蓝顶教堂与风车观景台", attractionIds: ["oia"] } ]
      },
      {
        day: 6,
        city: "圣托里尼",
        entries: [ { period: '', text: "皮尔戈斯 · 黑沙滩\n上午·皮尔戈斯山城小镇与 Kasteli 城堡；下午·黑沙滩海滩休闲与水上活动", attractionIds: ["black-beach", "pyrgos"] } ]
      },
      {
        day: 7,
        city: "克里特",
        entries: [ { period: '', text: "克里特 · 克诺索斯王宫\n上午·飞往克里特岛，探访克诺索斯王宫迷宫；下午·伊拉克利翁考古博物馆", attractionIds: ["knossos"] } ]
      },
      {
        day: 8,
        city: "克里特",
        entries: [ { period: '', text: "干尼亚威尼斯老港\n上午·干尼亚老城威尼斯港漫步；晚上·海滨晚餐后返回酒店", attractionIds: [] } ]
      },
      {
        day: 9,
        city: "雅典",
        entries: [ { period: '', text: "返回雅典 · 送机\n上午·返回雅典，专车送机回国", attractionIds: [] } ]
      },
    ]
  },
];


// 定制行程：提交需求表后，顾问一对一制作，以行程链接形式单独发送给客户
const custom = [
  {
    id: 'PT202610-08',
    type: 'custom',
    title: '希腊精品定制旅程 · 雅典+圣托里尼',
    customer: '李女士',
    img: '/assets/images/hero/hero-santorini.jpg',
    period: '2026.10.05 – 10.10',
    days: 6,
    header: [
      { label: '行程日期 / ITINERARY PERIOD', value: '20261005~1010' },
      { label: '订单编号 / ITINERARY NUMBER', value: 'PT202610-08' },
      { label: '旅客人数 / NUMBER OF VISITORS', value: '1成年人+2孩子（10岁/4岁）' },
      { label: '语种需求 / PREFERRED LANGUAGES', value: '中文普通话/英语' },
      { label: '计划车型 / PLANNED VEHICLE', value: '欧6标准及以上七座奔驰商务车' },
      { label: '推荐司导 / PRIVATE TOUR GUIDE', value: '希腊文旅金牌司导 · 欧美澳高等教育 · 欧盟+美国+中国驾照' }
    ],
    fee: '€5,188',
    schedule: [
      {
        no: 1, date: '1005', stay: '雅典',
        entries: [
          { period: '上午', services: ['接送', '陪同', '讲解'], attractionIds: [],
            text: '雅典国际机场接机送至The Dolli at Acropolis酒店入住后休整（航班待定，当天微信服务群实时沟通）' },
          { period: '中午', services: [], attractionIds: [],
            text: '多利酒店顶楼用餐或按需推荐附近餐厅' },
          { period: '下午', services: ['接送', '陪同', '讲解'], attractionIds: ['athens-landmarks'],
            text: '15:00 前往雅典主要地标性景点\n游览首都宪法广场、国家议会大厦（原皇宫）、无名英雄纪念碑、皇家花园、扎皮翁宫等，观赏总统卫队换岗仪式、途径希腊总理府和总统府，游览第一届现代奥林匹克运动会体育场和奥运圣火交接仪式场地' },
          { period: '晚上', services: ['接送', '陪同', '讲解'], attractionIds: ['likavitos'],
            text: '18:30 前往登顶雅典都会区最高自然观景点——利卡维多斯山（狼山）\n从狼山之巅360°俯瞰无与伦比的雅典都会区和爱琴海全景，全面领略"众神眷顾之城"的浪漫与壮丽\n19:30 狼山顶知名夜景餐厅晚餐（须预订）\n品尝地中海特色美食美酒，静享希腊式完美休闲度假夜生活，晚餐后专车送回酒店' }
        ]
      },
      {
        no: 2, date: '1006', stay: '雅典',
        entries: [
          { period: '下午', services: ['接送', '陪同', '讲解', '门票'], attractionIds: ['acropolis'],
            text: '17:00 前往雅典卫城（以实际购票时间为准）\n游览世界文化遗产杰出代表、希腊国宝级文明象征——雅典卫城，体验超3000年历史的西方文明重要发源地' },
          { period: '晚上', services: ['接送', '陪同', '讲解'], attractionIds: [],
            text: '19:00 Lake Vouliagmeni雅典著名天然温泉湖畔餐厅晚餐（须预订）\n这里是雅典将自然景观和美食体验结合到极致的最独特湖景餐厅，傍晚时日落氛围绝美浪漫，夜晚格调灯光融合湖面山体倒影，完美诠释地中海风情极致放松自然的休闲度假体验' }
        ]
      },
      {
        no: 3, date: '1007', stay: '圣托里尼',
        entries: [
          { period: '上午', services: ['接送', '陪同', '讲解'], attractionIds: [],
            text: '从雅典国际机场飞往世界级旅游度假海岛、爱琴海的蓝白童话——圣托里尼（航班待定）\n抵达后入住Canaves Oia Epitome伊亚小镇悬崖酒店，从许多人梦想中"希腊的样子"开启蓝白假期' },
          { period: '中午', services: ['接送'], attractionIds: [],
            text: '酒店午餐' },
          { period: '下午', services: ['接送', '陪同', '讲解'], attractionIds: [],
            text: '酒店休整或周边漫步游览（当天根据实际情况定）' },
          { period: '晚上', services: ['接送', '陪同', '讲解'], attractionIds: [],
            text: '18:00 悬崖海景餐厅Lycabettus Restaurant晚餐（须预订）\n海风轻拂，夕阳渐落，爱琴海在暮色中渐渐沉静，一席精致晚餐、一杯美酒，伴着海风慢慢入夜，海风、灯影、美食与远方的蓝，在这一刻交织成一段恰到好处的爱琴海假日时光' }
        ]
      },
      {
        no: 4, date: '1008', stay: '圣托里尼',
        entries: [
          { period: '上午', services: ['接送', '陪同', '讲解'], attractionIds: ['oia'],
            text: '09:30 前往被誉为"世界最奢华的极致浪漫小镇"伊亚的地标性景点\n漫步悬崖步道，游览世界著名的历史和文化地标性景点——蓝顶教堂和风车观景台等，远眺圣托里尼绝美天际线和火山岛自然奇观，领略蔚蓝爱琴海的温柔、宁静与壮丽，感受基克拉泽斯风情悠闲浪漫海岛生活' },
          { period: '中午', services: ['接送', '陪同'], attractionIds: [],
            text: '当地特色餐厅午餐后送回酒店休整（当天按需推荐）' },
          { period: '下午', services: ['接送', '陪同', '讲解'], attractionIds: ['fira'],
            text: '15:00 前往圣托里尼首府费拉小镇\n游览大都会圣母报喜主教堂、三钟教堂等费拉镇地标性景点，打卡网红悬崖咖啡馆、精品店和艺术画廊等，面朝爱琴海，海风轻轻吹来，深入感受圣托里尼的生活脉搏，慢享其独有的蓝白浪漫' },
          { period: '晚上', services: ['接送', '陪同', '讲解'], attractionIds: [],
            text: '18:00 知名悬崖餐厅MIA\'S Restaurant Santorini晚餐（须预订）\n把时间交给爱琴海，把晚餐交给景观、美食、服务俱佳的MIA\'S，暮色渐浓，夕阳在海面铺开一层金色的光，伴着徐徐海风拂面，享用来自地中海的新鲜海味和圣托里尼特色美酒' }
        ]
      },
      {
        no: 5, date: '1009', stay: '圣托里尼',
        entries: [
          { period: '上午', services: ['接送', '陪同', '讲解'], attractionIds: ['pyrgos'],
            text: '10:00 前往圣托里尼中部富有浓厚中世纪风格的魅力小镇——皮尔戈斯山城小镇Pyrgos Kallistis\n游览山顶Kasteli城堡，俯瞰葡萄园、白色村落和爱琴海，感受安静和古朴的海岛小镇慢生活' },
          { period: '中午', services: ['接送', '陪同'], attractionIds: [],
            text: '皮尔戈斯小镇当地特色餐厅午餐（当天按需推荐）' },
          { period: '下午', services: ['接送', '陪同', '讲解'], attractionIds: ['black-beach'],
            text: '15:00 前往东南岛黑沙滩海滩游泳、躺椅休闲、近海划船等海滩活动和休闲（提前准备泳衣等游泳衣物）' },
          { period: '晚上', services: ['接送', '陪同', '讲解'], attractionIds: [],
            text: '18:00 知名日落海鲜餐厅Basalt Restaurant晚餐（须预订），为此次旅程画上圆满句号\n圣托里尼最后一晚，以爱琴海Ammoudi海湾的一顿晚餐作别，晚风、落日、海浪，还有满桌鲜美渔获，看世界最美夕阳一点点沉入海平线，带着满满的回忆，把最后一眼爱琴海绘入心里' }
        ]
      },
      {
        no: 6, date: '1010', stay: '',
        entries: [
          { period: '上午', services: ['接送', '陪同'], attractionIds: [],
            text: '圣托里尼机场返回雅典国际机场（航班待定）' },
          { period: '下午', services: ['接送'], attractionIds: [],
            text: '回国航班值机及有关协助，送至安检口启程回国，服务结束' }
        ]
      }
    ],
    notices: [
      {
        title: '服务须知',
        items: [
          '行程有关的车辆使用费、油费、过路费、高速费、停车费已包含；包车行程的接送和陪同均含英语翻译服务。',
          '司导单日全天最长服务时间及里程：10小时300公里每天（旅程表既定行程除外），超时费50欧元每小时，超里程费1欧元每公里。',
          '旅行全程车内禁止吸烟，违者罚金100欧元每次，罚金应在当日交清。',
          '希腊境内机票、门票、船票、住宿等是否包含以确定的定制旅程表版本为准，您的所有自主选择性消费均未包含在报价内。'
        ]
      },
      {
        title: '免费服务',
        items: [
          '包车行程途中按需免费提供矿泉水。',
          '包车行程按需免费提供拨打希腊境内电话15分钟每人。',
          '包车行程途中按需免费提供无线网络热点，限非视频用途。',
          '如遇节日、天气、罢工、交通管制等不可抗力原因导致原计划日程变动，免费为您制订替代方案。',
          '包车行程全程按需免费提供入驻酒店两公里内至多两次生活用品代购和日程安排之外的接送服务。'
        ]
      },
      {
        title: '出行提醒',
        items: [
          '出行前确定持有有效申根签证，并确保护照在计划离境时间之前还有至少六个月有效期。',
          '如进入教堂和修道院等宗教场所，肩膀和膝盖必须遮盖，勿穿拖鞋，保持安静庄重。',
          '尊重古迹，触摸、攀爬古迹和从考古遗址中带走任何石头、陶片等均属违法行为，处罚非常严厉。',
          '希腊晚餐时间一般为八点后；用餐服务小费非强制，可随心而定表达善意。'
        ]
      },
      {
        title: '紧急联系方式',
        items: [
          '希腊境内紧急电话：报警 100 · 医疗急救 166 · 火灾 199 · 海岸警卫队 108',
          '中国驻希腊使馆：总机 +30-2160036690 · 领事部 +30-2106723282',
          '希腊旅行管家：Ikoniou 94, Nea Smyrni 17123, Athens · 手机 +30-6973573863'
        ]
      }
    ]
  }
];

function getItinerary(id) {
  const all = reference.concat(custom);
  return all.find((item) => item.id === id) || null;
}

function getReferenceList() {
  return reference;
}

module.exports = { SERVICE_KEYS, reference, custom, getItinerary, getReferenceList };
