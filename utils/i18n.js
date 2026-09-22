// 小程序统一语言状态：仅支持简体中文、繁体中文、英文。
const STORAGE_KEY = 'sy_mp_locale';
const SUPPORTED_LOCALES = ['zh-CN', 'zh-TW', 'en'];

const messages = {
  'zh-CN': {
    locale: '简体中文',
    brand: '希腊旅行管家',
    brandEn: 'Greece Travel Butler',
    language: '语言',
    languageHint: '切换后立即应用到小程序界面',
    home: '首页',
    contact: '立即联系',
    mine: '我的',
    back: '返回上一页',
    loading: '正在加载…',
    loadingProfile: '正在加载个人资料…',
    submitting: '提交中…',
    submitFailed: '提交失败',
    networkError: '网络异常',
    know: '知道了',
    okay: '好的',
    select: '请选择',
    copySuccess: '已复制',
    commonSlogan: '只为一生美好回忆',
    search: '搜索路线 / 景点 / 资讯咨询',
    viewAll: '查看全部',
    customize: '行程定制',
    guide: '古迹讲解',
    vehicle: '在地用车',
    knowledge: '文史知识库',
    business: '希腊商旅',
    travelGuide: '出行指南',
    consultation: '资讯咨询',
    booking: '预约咨询',
    resources: '资源对接',
    freePreview: '免费预览',
    businessSupport: '随行咨询',
    practicalGuide: '实用攻略', businessTitle: '希腊商旅', businessSubtitle: '一站式随行服务', businessDescription: 'Richard 李顾问提供中英双语沟通、商务行程规划与语言陪同咨询，帮助你把拜访、会议与文化体验安排得更从容。', businessTag1: '涉外商务陪同', businessTag2: '会议口译 / 文件笔译', businessTag3: '企业拜访咨询', businessNote: '仅提供商务陪同咨询、行程策划与语言翻译对接；交通、场地、劳务由客户直接与希腊本土主体签约。', vehicleTitle: '在地用车资源', vehicleSubtitle: '对接咨询', vehicleDescription: '根据出行节奏，咨询希腊本地车型与司导资源，顾问协助你完成预约对接。', vehicleTag1: '欧6车型信息', vehicleTag2: '中英双语咨询', vehicleTag3: '按需匹配', vehicleNote: '仅提供用车信息咨询与预约对接，车辆及司导劳务由客户直接与希腊本土主体签约结算。',
    profile: {
      login: '登录 希腊旅行管家',
      loginDesc: '微信登录后，绑定手机号即可预约服务',
      wechatLogin: '微信登录',
      change: '修改',
      phoneBound: '已绑定手机号',
      phoneRequired: '请绑定手机号后预约服务',
      changePhone: '修改绑定手机号',
      bindPhone: '完成手机号绑定',
      changePhoneDesc: '重新授权微信手机号即可更新绑定',
      bindPhoneDesc: '预约或提交咨询前，需要先绑定手机号',
      reauthorize: '重新授权',
      bind: '绑定手机号',
      myJourney: '我的旅程',
      appointments: '预约',
      trips: '行程',
      coupons: '优惠券',
      records: '资料',
      profileHelp: '资料与帮助',
      editProfile: '修改个人资料',
      travelers: '常用出行人',
      visa: '护照签证资料',
      service: '联系客服',
      about: '关于我们 · 只为一生美好回忆',
      avatarChange: '更换',
      avatarUploading: '上传中',
      avatarNote: '点击头像获取微信头像，也可从相册或相机选择',
      avatarChooseFromAlbum: '从相册或相机选择',
      nickname: '昵称',
      nicknamePlaceholder: '请输入昵称',
      nicknameNote: '昵称仅在本页面修改，返回其他页面不会自动变化。',
      phone: '手机号',
      unboundPhone: '未绑定手机号',
      phoneNote: '手机号用于顾问确认需求，点击“重新授权”即可更新绑定。',
      save: '保存修改',
      saved: '已保存',
      avatarUpdated: '头像已更新',
      phoneUpdated: '手机号已更新'
    },
    forms: {
      destination: '咨询目的地',
      destinationPlaceholder: '如：圣岛 + 雅典',
      travelDate: '出行时间',
      chooseDate: '选择出行日期',
      travelDays: '出行天数',
      choosePeriod: '选择咨询周期',
      travelers: '出行人数',
      chooseTravelers: '选择出行人数',
      childAge: '儿童年龄',
      childAgeHint: '（如无儿童可不填）',
      childAgePlaceholder: '如：6岁、10岁',
      carDistance: '单日车程上限',
      chooseDistance: '选择可接受的车程',
      budget: '人均预算',
      chooseBudget: '选择预算参考',
      theme: '咨询主题',
      multiSelect: '（可多选）',
      requirements: '需求描述',
      requirementsPlaceholder: '说说你对这次行程资讯咨询的期待：文化重点、餐厅偏好、特别安排…',
      phone: '联系电话',
      phonePlaceholder: '24小时内联系您',
      submitConsultation: '提交咨询 · 获取行程方案',
      planIntro: '告诉我你的想法，一起读懂希腊',
      planSub: '1v1 中文顾问 · 24 小时内回复行程资讯',
      formOverview: '01 · 行程概况',
      formPreferences: '02 · 旅行偏好',
      formContact: '03 · 需求与联系',
      knowledgeLead: '你好，我想咨询景点文史知识库与一对一线上人文咨询',
      compliance: '仅提供目的地行程方案资讯咨询服务。',
      businessCycle: '商务周期',
      companionDuration: '陪同时长',
      languageNeeds: '语言需求',
      industryNeeds: '行业对接需求',
      industryRequired: '（必填）',
      industryPlaceholder: '例如：寻找某行业企业拜访、展厅参观或会议口译支持…',
      people: '随行人数',
      contactMethod: '联系方式',
      contactChoose: '（二选一）',
      wechat: '微信',
      wechatPlaceholder: '请输入微信号',
      phonePlaceholderShort: '请输入手机号',
      submitBusiness: '提交商旅咨询',
      businessTitle: '告诉我们你的商务计划',
      businessTip: '提交后，顾问将在24小时内联系你确认服务范围。',
      vehiclePlan: '说说你的用车计划',
      vehicleTip: '提交后，顾问将在24小时内联系你说明对接方式。',
      vehicleDate: '出行日期',
      vehicleDuration: '陪同 / 用车时长',
      vehicleType: '希望车型',
      vehicleRoute: '路线与用车需求',
      vehicleRoutePlaceholder: '例如：雅典机场接送 + 市区古迹参访，希望有中文沟通…',
      submitVehicle: '提交用车咨询',
      reserve: '预约 Richard 的时间',
      addWechat: '添加微信',
      submitBooking: '提交预约 · 获取专属报价',
      bookingTitle: '告诉 Richard 你的想法',
      serviceDuration: '服务时长',
      routeNeed: '希望路线与需求',
      routePlaceholder: '例如：雅典历史讲解，希望安排半日步行路线…',
      submitBookingNote: '提交后 24 小时内由 Richard 或顾问确认时间',
      contactConsultant: '顾问将在24小时内联系您，进一步确认需求并提供咨询方案。',
      afterSubmitTitle: '提交后你会得到什么', flowStep1: '提交需求表', flowDesc1: '目的地 / 日期 / 人数 / 偏好', flowStep2: '顾问一对一定制', flowDesc2: '24 小时内回复行程方案', flowStep3: '专属行程链接', flowDesc3: '逐日安排 / 服务包含 / 关联景点', sampleTripTitle: '看看定制行程长什么样', sampleTripDesc: '希腊精品定制旅程样例 · 6天5晚 · 雅典+圣托里尼', consultantTitle: '中文行程顾问', wechatId: '微信号', tapToCopy: '点击复制', qrTip: '长按识别 / 点击放大', call: '拨打电话'
    },
    validation: {
      destination: '请填写出行目的地',
      phone: '请填写联系电话',
      phoneInvalid: '联系电话格式有误',
      route: '请填写希望体验的路线',
      vehicleRoute: '请填写用车路线或需求',
      industry: '请填写行业对接需求',
      phoneFormat: '手机号格式有误',
      contact: '请填写联系方式',
      notConfigured: '咨询接口尚未配置',
      loginRequired: '请先微信登录',
      phoneAuthRequired: '需要授权手机号后才能提交'
    },
    feedback: {
      submitted: '咨询已提交',
      bookingSubmitted: '预约已提交',
      vehicleSubmitted: '咨询已提交',
      businessSubmitted: '商旅咨询已提交',
      submitError: '提交失败',
      networkError: '当前网络无法连接咨询服务，请检查网络后重试。',
      consultSubmitted: '顾问将在24小时内联系您，进一步确认需求并提供咨询方案。',
      bookingSubmittedDesc: 'Richard 或顾问将在24小时内确认时间，并为您提供专属报价。',
      vehicleSubmittedDesc: '顾问将在24小时内联系您，说明车型、路线与对接方式。',
      businessSubmittedDesc: '顾问将在24小时内联系您，确认商务周期与语言陪同需求。'
    }
  },
  'zh-TW': {
    brand: '希臘旅行管家',
    brandEn: 'Greece Travel Butler',
    locale: '繁體中文', language: '語言', languageHint: '切換後立即套用到小程式介面', home: '首頁', contact: '立即聯絡', mine: '我的', back: '返回上一頁', loading: '正在載入…', loadingProfile: '正在載入個人資料…', submitting: '提交中…', submitFailed: '提交失敗', networkError: '網路異常', know: '知道了', okay: '好的', select: '請選擇', copySuccess: '已複製', commonSlogan: '只為一生美好回憶', search: '搜尋路線 / 景點 / 諮詢', viewAll: '查看全部', customize: '行程定製', guide: '古蹟講解', vehicle: '在地用車', knowledge: '文史知識庫', business: '希臘商旅', travelGuide: '出行指南', consultation: '資訊諮詢', booking: '預約諮詢', resources: '資源對接', freePreview: '免費預覽', businessSupport: '隨行諮詢', practicalGuide: '實用攻略', businessTitle: '希臘商旅', businessSubtitle: '一站式隨行服務', businessDescription: 'Richard 李顧問提供中英雙語溝通、商務行程規劃與語言陪同諮詢，幫助你從容安排拜訪、會議與文化體驗。', businessTag1: '涉外商務陪同', businessTag2: '會議口譯 / 文件筆譯', businessTag3: '企業拜訪諮詢', businessNote: '僅提供商務陪同諮詢、行程策劃與語言翻譯對接；交通、場地、勞務由客戶直接與希臘本土主體簽約。', vehicleTitle: '在地用車資源', vehicleSubtitle: '對接諮詢', vehicleDescription: '根據出行節奏，諮詢希臘本地車型與司導資源，顧問協助你完成預約對接。', vehicleTag1: '歐6車型資訊', vehicleTag2: '中英雙語諮詢', vehicleTag3: '按需匹配', vehicleNote: '僅提供用車資訊諮詢與預約對接，車輛及司導勞務由客戶直接與希臘本土主體簽約結算。',
    profile: { login: '登入 希臘旅行管家', loginDesc: '微信登入後，綁定手機號即可預約服務', wechatLogin: '微信登入', change: '修改', phoneBound: '已綁定手機號', phoneRequired: '請綁定手機號後預約服務', changePhone: '修改綁定手機號', bindPhone: '完成手機號綁定', changePhoneDesc: '重新授權微信手機號即可更新綁定', bindPhoneDesc: '預約或提交諮詢前，需要先綁定手機號', reauthorize: '重新授權', bind: '綁定手機號', myJourney: '我的旅程', appointments: '預約', trips: '行程', coupons: '優惠券', records: '資料', profileHelp: '資料與幫助', editProfile: '修改個人資料', travelers: '常用出行人', visa: '護照簽證資料', service: '聯絡客服', about: '關於我們 · 只為一生美好回憶', avatarChange: '更換', avatarUploading: '上傳中', avatarNote: '點擊頭像取得微信頭像，也可從相簿或相機選擇', avatarChooseFromAlbum: '從相簿或相機選擇', nickname: '暱稱', nicknamePlaceholder: '請輸入暱稱', nicknameNote: '暱稱僅在本頁面修改，返回其他頁面不會自動變更。', phone: '手機號', unboundPhone: '未綁定手機號', phoneNote: '手機號用於顧問確認需求，點擊「重新授權」即可更新綁定。', save: '保存修改', saved: '已保存', avatarUpdated: '頭像已更新', phoneUpdated: '手機號已更新' },
    forms: { destination: '諮詢目的地', destinationPlaceholder: '如：聖島 + 雅典', travelDate: '出行時間', chooseDate: '選擇出行日期', travelDays: '出行天數', choosePeriod: '選擇諮詢週期', travelers: '出行人數', chooseTravelers: '選擇出行人數', childAge: '兒童年齡', childAgeHint: '（如無兒童可不填）', childAgePlaceholder: '如：6歲、10歲', carDistance: '單日車程上限', chooseDistance: '選擇可接受的車程', budget: '人均預算', chooseBudget: '選擇預算參考', theme: '諮詢主題', multiSelect: '（可多選）', requirements: '需求描述', requirementsPlaceholder: '說說你對這次行程諮詢的期待：文化重點、餐廳偏好、特別安排…', phone: '聯絡電話', phonePlaceholder: '24小時內聯絡您', submitConsultation: '提交諮詢 · 獲取行程方案', planIntro: '告訴我你的想法，一起讀懂希臘', knowledgeLead: '你好，我想諮詢景點文史知識庫與一對一線上人文諮詢', planSub: '1v1 中文顧問 · 24 小時內回覆行程資訊', formOverview: '01 · 行程概況', formPreferences: '02 · 旅行偏好', formContact: '03 · 需求與聯絡', compliance: '僅提供目的地行程方案諮詢服務。', businessCycle: '商務週期', companionDuration: '陪同時長', languageNeeds: '語言需求', industryNeeds: '行業對接需求', industryRequired: '（必填）', industryPlaceholder: '例如：尋找某行業企業拜訪、展廳參觀或會議口譯支援…', people: '隨行人數', contactMethod: '聯絡方式', contactChoose: '（二選一）', wechat: '微信', wechatPlaceholder: '請輸入微信號', phonePlaceholderShort: '請輸入手機號', submitBusiness: '提交商旅諮詢', businessTitle: '告訴我們你的商務計劃', businessTip: '提交後，顧問將在24小時內聯絡你確認服務範圍。', vehiclePlan: '說說你的用車計劃', vehicleTip: '提交後，顧問將在24小時內聯絡你說明對接方式。', vehicleDate: '出行日期', vehicleDuration: '陪同 / 用車時長', vehicleType: '希望車型', vehicleRoute: '路線與用車需求', vehicleRoutePlaceholder: '例如：雅典機場接送 + 市區古蹟參訪，希望有中文溝通…', submitVehicle: '提交用車諮詢', reserve: '預約 Richard 的時間', addWechat: '添加微信', submitBooking: '提交預約 · 獲取專屬報價', bookingTitle: '告訴 Richard 你的想法', serviceDuration: '服務時長', routeNeed: '希望路線與需求', routePlaceholder: '例如：雅典歷史講解，希望安排半日步行路線…', submitBookingNote: '提交後 24 小時內由 Richard 或顧問確認時間', contactConsultant: '顧問將在24小時內聯絡您，進一步確認需求並提供諮詢方案。', afterSubmitTitle: '提交後你會得到什麼', flowStep1: '提交需求表', flowDesc1: '目的地 / 日期 / 人數 / 偏好', flowStep2: '顧問一對一定製', flowDesc2: '24 小時內回覆行程方案', flowStep3: '專屬行程連結', flowDesc3: '逐日安排 / 服務包含 / 關聯景點', sampleTripTitle: '看看定製行程長什麼樣', sampleTripDesc: '希臘精品定製旅程樣例 · 6天5晚 · 雅典+聖托里尼', consultantTitle: '中文行程顧問', wechatId: '微信號', tapToCopy: '點擊複製', qrTip: '長按識別 / 點擊放大', call: '撥打電話' },
    validation: { destination: '請填寫出行目的地', phone: '請填寫聯絡電話', phoneInvalid: '聯絡電話格式有誤', route: '請填寫希望體驗的路線', vehicleRoute: '請填寫用車路線或需求', industry: '請填寫行業對接需求', phoneFormat: '手機號格式有誤', contact: '請填寫聯絡方式', notConfigured: '諮詢介面尚未配置', loginRequired: '請先微信登入', phoneAuthRequired: '需要授權手機號後才能提交' },
    feedback: { submitted: '諮詢已提交', bookingSubmitted: '預約已提交', vehicleSubmitted: '諮詢已提交', businessSubmitted: '商旅諮詢已提交', submitError: '提交失敗', networkError: '目前網路無法連接諮詢服務，請檢查網路後重試。', consultSubmitted: '顧問將在24小時內聯絡您，進一步確認需求並提供諮詢方案。', bookingSubmittedDesc: 'Richard 或顧問將在24小時內確認時間，並為您提供專屬報價。', vehicleSubmittedDesc: '顧問將在24小時內聯絡您，說明車型、路線與對接方式。', businessSubmittedDesc: '顧問將在24小時內聯絡您，確認商務週期與語言陪同需求。' }
  },
  en: {
    brand: 'Greece Travel Butler',
    brandEn: 'Greece Travel Butler',
    locale: 'English', language: 'Language', languageHint: 'Applied across the mini program after switching', home: 'Home', contact: 'Contact', mine: 'My account', back: 'Back', loading: 'Loading…', loadingProfile: 'Loading profile…', submitting: 'Submitting…', submitFailed: 'Submission failed', networkError: 'Network error', know: 'Got it', okay: 'OK', select: 'Select', copySuccess: 'Copied', commonSlogan: 'Only for a lifetime of beautiful memories', search: 'Search routes / sights / advice', viewAll: 'View all', customize: 'Trip planning', guide: 'Heritage guide', vehicle: 'Local transport', knowledge: 'Cultural knowledge', business: 'Business travel', travelGuide: 'Travel guide', consultation: 'Trip advice', booking: 'Booking advice', resources: 'Local resources', freePreview: 'Free preview', businessSupport: 'Travel support', practicalGuide: 'Practical guide', businessTitle: 'Greece business travel', businessSubtitle: 'End-to-end support', businessDescription: 'Richard Li provides Chinese-English communication, business itinerary planning and language support for visits, meetings and cultural experiences.', businessTag1: 'Business accompaniment', businessTag2: 'Conference / document interpreting', businessTag3: 'Company visit advice', businessNote: 'Advice and coordination only; transport, venues and labor are contracted directly with local Greek providers.', vehicleTitle: 'Local transport', vehicleSubtitle: 'Resource coordination', vehicleDescription: 'Discuss local vehicles and driver-guides for your travel rhythm, with a consultant helping you coordinate the booking.', vehicleTag1: 'Euro 6 vehicles', vehicleTag2: 'Chinese-English support', vehicleTag3: 'Matched to your needs', vehicleNote: 'Advice and booking coordination only; vehicles and driver-guide services are contracted and settled directly with local Greek providers.',
    profile: { login: 'Sign in to Greece Travel Butler', loginDesc: 'Sign in with WeChat and bind your phone to book a service', wechatLogin: 'WeChat sign in', change: 'Edit', phoneBound: 'Phone number linked', phoneRequired: 'Link your phone before booking', changePhone: 'Change linked phone', bindPhone: 'Link your phone', changePhoneDesc: 'Authorize your WeChat phone number again to update it', bindPhoneDesc: 'A linked phone is required before booking or sending an inquiry', reauthorize: 'Re-authorize', bind: 'Link phone', myJourney: 'My journey', appointments: 'Bookings', trips: 'Trips', coupons: 'Coupons', records: 'Records', profileHelp: 'Profile & help', editProfile: 'Edit profile', travelers: 'Travelers', visa: 'Passport & visa', service: 'Contact support', about: 'About us · Beautiful memories for life', avatarChange: 'Change', avatarUploading: 'Uploading', avatarNote: 'Tap your avatar to get your WeChat avatar, or choose a photo from your album or camera', avatarChooseFromAlbum: 'Choose from album or camera', nickname: 'Name', nicknamePlaceholder: 'Enter your name', nicknameNote: 'Your name is edited on this page only.', phone: 'Phone', unboundPhone: 'Not linked', phoneNote: 'Your phone helps the consultant confirm your request. Re-authorize to update it.', save: 'Save changes', saved: 'Saved', avatarUpdated: 'Avatar updated', phoneUpdated: 'Phone updated' },
    forms: { destination: 'Destination', destinationPlaceholder: 'e.g. Santorini + Athens', travelDate: 'Travel dates', chooseDate: 'Choose dates', travelDays: 'Trip length', choosePeriod: 'Choose a trip length', travelers: 'Travelers', chooseTravelers: 'Choose travelers', childAge: 'Children\'s ages', childAgeHint: '(optional)', childAgePlaceholder: 'e.g. 6, 10', carDistance: 'Daily driving limit', chooseDistance: 'Choose a driving limit', budget: 'Budget per person', chooseBudget: 'Choose a budget', theme: 'Topics', multiSelect: '(multiple)', requirements: 'Your request', requirementsPlaceholder: 'Tell us about your trip: culture, restaurants, special arrangements…', phone: 'Phone number', phonePlaceholder: 'We will contact you within 24 hours', submitConsultation: 'Send inquiry · Get a trip plan', planIntro: 'Tell us what you have in mind', knowledgeLead: 'Hello, I would like advice on the heritage knowledge base and a one-to-one humanities consultation', planSub: '1-to-1 consultant · Reply within 24 hours', formOverview: '01 · TRIP OVERVIEW', formPreferences: '02 · PREFERENCES', formContact: '03 · REQUEST & CONTACT', compliance: 'Destination planning advice only.', businessCycle: 'Business period', companionDuration: 'Companion duration', languageNeeds: 'Language needs', industryNeeds: 'Business request', industryRequired: '(required)', industryPlaceholder: 'e.g. company visits, showroom tours or conference interpreting…', people: 'Group size', contactMethod: 'Contact method', contactChoose: '(choose one)', wechat: 'WeChat', wechatPlaceholder: 'Enter WeChat ID', phonePlaceholderShort: 'Enter phone number', submitBusiness: 'Send business inquiry', businessTitle: 'Tell us about your business plan', businessTip: 'A consultant will contact you within 24 hours to confirm the service scope.', vehiclePlan: 'Tell us about your transport plan', vehicleTip: 'A consultant will contact you within 24 hours to explain the matching process.', vehicleDate: 'Travel date', vehicleDuration: 'Companion / transport duration', vehicleType: 'Vehicle preference', vehicleRoute: 'Route and transport needs', vehicleRoutePlaceholder: 'e.g. airport transfer + heritage visits with Chinese communication…', submitVehicle: 'Send transport inquiry', reserve: 'Reserve Richard\'s time', addWechat: 'Add WeChat', submitBooking: 'Send booking · Get a quote', bookingTitle: 'Tell Richard what you have in mind', serviceDuration: 'Service duration', routeNeed: 'Preferred route and needs', routePlaceholder: 'e.g. an Athens history walk for half a day…', submitBookingNote: 'Richard or a consultant will confirm within 24 hours', contactConsultant: 'A consultant will contact you within 24 hours to confirm your request.', afterSubmitTitle: 'What you receive after sending', flowStep1: 'Send your request', flowDesc1: 'Destination / dates / group / preferences', flowStep2: 'One-to-one planning', flowDesc2: 'Reply with a plan within 24 hours', flowStep3: 'Private itinerary link', flowDesc3: 'Daily schedule / services / sights', sampleTripTitle: 'See a sample custom itinerary', sampleTripDesc: 'Greece luxury itinerary · 6 days 5 nights · Athens + Santorini', consultantTitle: 'Chinese-speaking trip consultant', wechatId: 'WeChat ID', tapToCopy: 'tap to copy', qrTip: 'Long-press to scan / tap to enlarge', call: 'Call' },
    validation: { destination: 'Please enter a destination', phone: 'Please enter a phone number', phoneInvalid: 'Please check the phone number format', route: 'Please tell us the route you want', vehicleRoute: 'Please enter your route or transport needs', industry: 'Please enter your business request', phoneFormat: 'Please check the phone number format', contact: 'Please enter your contact details', notConfigured: 'The inquiry service is not configured', loginRequired: 'Please sign in with WeChat first', phoneAuthRequired: 'Phone authorization is required before submitting' },
    feedback: { submitted: 'Inquiry sent', bookingSubmitted: 'Booking sent', vehicleSubmitted: 'Inquiry sent', businessSubmitted: 'Business inquiry sent', submitError: 'Submission failed', networkError: 'The inquiry service is unavailable. Please check your connection and try again.', consultSubmitted: 'A consultant will contact you within 24 hours to confirm your request and provide a plan.', bookingSubmittedDesc: 'Richard or a consultant will confirm the time within 24 hours and provide a quote.', vehicleSubmittedDesc: 'A consultant will contact you within 24 hours to explain the vehicle, route and matching process.', businessSubmittedDesc: 'A consultant will contact you within 24 hours to confirm the business period and language support.' }
  }
};

Object.assign(messages['zh-CN'], {
  guideService: '古迹讲解', homeSlogan: '只为一生美好回忆', homeHeroSlogan: '希伴旅 · 只为一生美好回忆', homeGuideCta: '查看档案 / 预约时间', selectedRoutes: '甄选路线', viewAllRoutes: '查看全部参考行程', viewReference: '查看参考行程', customItinerary: '定制行程 · 填写需求，获取专属方案', customItineraryDesc: '以上路线仅作参考，告诉我们你的日期、人数与偏好，顾问一对一为你定制专属行程', luxury: '奢享体验', luxuryTag: '高端定制', luxuryCta: '定制咨询', destinations: '精选目的地', civilization: '文明溯源', islands: '海岛度假', routeAudio: { kicker: 'ROUTE AUDIO', title: '甄选路线语音导览', desc: '先听一段路线故事，再开始挑选你的旅程。', name: '甄选路线语音导览', author: '希腊旅行管家', preview: '免费试听 1 分钟 · 播放到 1:00 自动停止', ended: '试听已结束（1 分钟）', play: '播放', pause: '暂停', restart: '重头播放' }
});
Object.assign(messages['zh-TW'], {
  guideService: '古蹟講解', homeSlogan: '只為一生美好回憶', homeHeroSlogan: '希伴旅 · 只為一生美好回憶', homeGuideCta: '查看檔案 / 預約時間', selectedRoutes: '精選路線', viewAllRoutes: '查看全部參考行程', viewReference: '查看參考行程', customItinerary: '定製行程 · 填寫需求，獲取專屬方案', customItineraryDesc: '以上路線僅作參考，告訴我們你的日期、人數與偏好，顧問一對一為你定製專屬行程', luxury: '奢享體驗', luxuryTag: '高端定製', luxuryCta: '定製諮詢', destinations: '精選目的地', civilization: '文明溯源', islands: '海島度假', routeAudio: { kicker: 'ROUTE AUDIO', title: '精選路線語音導覽', desc: '先聽一段路線故事，再開始挑選你的旅程。', name: '精選路線語音導覽', author: '希臘旅行管家', preview: '免費試聽 1 分鐘 · 播放到 1:00 自動停止', ended: '試聽已結束（1 分鐘）', play: '播放', pause: '暫停', restart: '重頭播放' }
});
Object.assign(messages.en, {
  guideService: 'Heritage guide', homeSlogan: 'Only for a lifetime of beautiful memories', homeHeroSlogan: 'Xiban Travel · Only for a lifetime of beautiful memories', homeGuideCta: 'View profile / Reserve time', selectedRoutes: 'Selected routes', viewAllRoutes: 'View all reference trips', viewReference: 'View itinerary', customItinerary: 'Private itinerary · Share your needs for a tailored plan', customItineraryDesc: 'Routes are examples. Tell us your dates, group and preferences for one-to-one planning.', luxury: 'Luxury experiences', luxuryTag: 'Bespoke luxury', luxuryCta: 'Request a plan', destinations: 'Featured destinations', civilization: 'Heritage', islands: 'Island escapes', routeAudio: { kicker: 'ROUTE AUDIO', title: 'Selected route audio guide', desc: 'Listen to a route story before choosing your journey.', name: 'Selected route audio guide', author: 'Greece Travel Butler', preview: 'Free 1-minute preview · stops at 1:00', ended: 'Preview ended (1 minute)', play: 'Play', pause: 'Pause', restart: 'Restart' }
});
messages['zh-CN'].guide = { heroQuote: '把一簇辉映，变成一段真正有温度的希腊经验', quoteFoot: '武汉大学双学士 · 英国澳洲双硕士 · 欧盟 / 美国 / 中国驾照', storyTitle: '先认识本人，再决定这次如何徐徐深入', story1: '旅居欧美多年，我一直把希腊当成一座可以慢慢读的博物馆。历史、人文、秘境与镜头感，交给真正生活在这里的人。', story2: '我不负责把行程塞满，而是希望你离开时，仍记得某一束光、某一段海岸，以及途中那些没有被攻略写下的细节。', storyNote: '旅行最珍贵的，不是走过多少地方，\n而是终于有人替你读懂沿途的故事。', credentialsTitle: '三项背书，足够放心与他一起探索希腊', signatureTitle: '他最擅长的四种希腊时光', reviewsTitle: '他们这样记住 Richard', bookingTitle: '选一个日期，开始一次专属探索', bookingSub: '日历中的蓝色日期可预约，提交后由 Richard 确认时间。', calendarNote: '选择你的希腊同行时光', available: '可预约', pending: '待确认', booked: '已约', unavailable: '不可选', selectedPrefix: '已选择', chooseDate: '请选择可预约日期', closingTitle: '准备好让希腊，变成你的故事了吗？', closingCopy: 'Richard 李 · 名字背后，是一段值得信任的在地经验', bottomBar: 'Richard 李 · 在地深度陪同', reserveShort: '预约时间' };
messages['zh-TW'].guide = { heroQuote: '把一簇輝映，變成一段真正有溫度的希臘經驗', quoteFoot: '武漢大學雙學士 · 英國澳洲雙碩士 · 歐盟 / 美國 / 中國駕照', storyTitle: '先認識本人，再決定這次如何徐徐深入', story1: '旅居歐美多年，我一直把希臘當成一座可以慢慢讀的博物館。歷史、人文、秘境與鏡頭感，交給真正生活在這裡的人。', story2: '我不負責把行程塞滿，而是希望你離開時，仍記得某一束光、某一段海岸，以及途中那些沒有被攻略寫下的細節。', storyNote: '旅行最珍貴的，不是走過多少地方，\n而是終於有人替你讀懂沿途的故事。', credentialsTitle: '三項背書，足夠放心與他一起探索希臘', signatureTitle: '他最擅長的四種希臘時光', reviewsTitle: '他們這樣記住 Richard', bookingTitle: '選一個日期，開始一次專屬探索', bookingSub: '日曆中的藍色日期可預約，提交後由 Richard 確認時間。', calendarNote: '選擇你的希臘同行時光', available: '可預約', pending: '待確認', booked: '已約', unavailable: '不可選', selectedPrefix: '已選擇', chooseDate: '請選擇可預約日期', closingTitle: '準備好讓希臘，變成你的故事了嗎？', closingCopy: 'Richard 李 · 名字背後，是一段值得信任的在地經驗', bottomBar: 'Richard 李 · 在地深度陪同', reserveShort: '預約時間' };
messages.en.guide = { heroQuote: 'Turn a glimmer into a Greek experience with real warmth', quoteFoot: 'Wuhan University double degree · UK and Australian master\'s degrees · EU / US / China driving licences', storyTitle: 'Meet the person before choosing how to explore', story1: 'After years in Europe and the US, I see Greece as a museum to read slowly. History, culture, hidden places and light belong with someone who lives here.', story2: 'I do not fill every minute. I want you to remember a ray of light, a coastline and the details no guidebook could capture.', storyNote: 'The most precious part of travel is not how many places you visit,\nbut finally having someone help you understand the stories along the way.', credentialsTitle: 'Three reasons to explore Greece with confidence', signatureTitle: 'Four kinds of Greek moments I do best', reviewsTitle: 'How guests remember Richard', bookingTitle: 'Choose a date and begin a private exploration', bookingSub: 'Blue dates are available. Richard will confirm the time after you submit.', calendarNote: 'Choose your time in Greece', available: 'Available', pending: 'Pending', booked: 'Booked', unavailable: 'Unavailable', selectedPrefix: 'Selected', chooseDate: 'Choose an available date', closingTitle: 'Ready to make Greece part of your story?', closingCopy: 'Richard Li · trusted local experience behind the name', bottomBar: 'Richard Li · deep local accompaniment', reserveShort: 'Reserve time' };
messages['zh-CN'].travel = { title: '希腊出行指南', subtitle: '把出发前的疑问变成一份清晰的准备清单，轻松开启雅典与爱琴海之旅。', promise1: '实用攻略', promise2: '出发前收藏', promise3: '随时可查', heading: '把资料变成旅途答案', intro: '我们把资料整理成适合手机快速浏览的要点，出发前收藏这一页就够了。', note: '签证、票务、开放时间等信息可能调整，页面内容用于行前参考，出发前请以官方最新信息为准。', consultTitle: '还有具体问题？', consultDesc: '告诉我们你的日期、人数与偏好，顾问帮你把攻略落到行程里。' };
messages['zh-TW'].travel = { title: '希臘出行指南', subtitle: '把出發前的疑問變成一份清晰的準備清單，輕鬆開啟雅典與愛琴海之旅。', promise1: '實用攻略', promise2: '出發前收藏', promise3: '隨時可查', heading: '把資料變成旅途答案', intro: '我們把資料整理成適合手機快速瀏覽的要點，出發前收藏這一頁就夠了。', note: '簽證、票務、開放時間等資訊可能調整，頁面內容用於行前參考，出發前請以官方最新資訊為準。', consultTitle: '還有具體問題？', consultDesc: '告訴我們你的日期、人數與偏好，顧問幫你把攻略落到行程裡。' };
messages.en.travel = { title: 'Greece travel guide', subtitle: 'Turn pre-trip questions into a clear checklist for an easy start in Athens and the Aegean.', promise1: 'Practical guide', promise2: 'Save before departure', promise3: 'Easy to check', heading: 'Turn information into travel answers', intro: 'We organized the materials into mobile-friendly points you can save before departure.', note: 'Visa, ticket and opening information may change. Use this page as a reference and check official sources before departure.', consultTitle: 'Still have questions?', consultDesc: 'Tell us your dates, group and preferences. A consultant can turn the guide into a trip.' };
Object.assign(messages['zh-CN'].travel, { onlineRead: '在线阅读' });
Object.assign(messages['zh-TW'].travel, { onlineRead: '線上閱讀' });
Object.assign(messages.en.travel, { onlineRead: 'Read online' });
Object.assign(messages['zh-CN'].travel, { sections: [
  { key: 'prepare', kicker: 'PREPARE WELL', title: '出发准备', intro: '把签证、行李与穿搭先安排好，轻装出发。', guides: [
    { key: 'visa', mark: '签', source: '申根签证申请表', title: '签证与材料清单', desc: '按申请表逐项核对个人信息、行程、住宿与保险资料。', points: ['护照与复印件', '行程、住宿与交通', '保险、照片与签名'] },
    { key: 'packing', mark: '箱', source: '希腊旅行必备物品清单', title: '行李怎么带', desc: '从证件银行卡到药品、防晒和电子设备，按类别收进行李。', points: ['证件与现金卡类', '防晒、常用药品', '转换插头与充电宝'] },
    { key: 'outfit', mark: '衣', source: '地中海旅行穿搭全攻略', title: '四季穿搭方案', desc: '用“下装锚定、外套定调”的流动衣橱，应对海岛温差与长时间步行。', points: ['4—9月：亚麻与轻棉', '10月—次年3月：叠穿保暖', '舒适鞋履优先'] }
  ] },
  { key: 'experience', kicker: 'LIVE LIKE GREECE', title: '旅途体验', intro: '吃得地道、拍得好看，也更懂当地人的生活节奏。', guides: [
    { key: 'food', mark: '食', source: '希腊美食与生活方式探索', title: '希腊美食地图', desc: '从希腊沙拉、Moussaka 到海岛海鲜，边吃边认识地中海生活。', points: ['Meze 适合多人分享', '晚餐通常较晚开始', '餐后小费约 5%—10%'] },
    { key: 'photo', mark: '光', source: '地中海光影诗篇', title: '旅行摄影小课', desc: '用黄金时刻、九宫格和天然画框，拍出蓝白小镇与海岸的层次。', points: ['日出后/日落前一小时', '地平线放在上或下 1/3', '擦镜头、稳住再按快门'] }
  ] },
  { key: 'culture', kicker: 'READ THE LAND', title: '文化深读', intro: '先读懂历史与目的地，再走进每一处遗址和岛屿。', guides: [
    { key: 'athens', mark: '城', source: '雅典历史古迹与博物馆详解', title: '雅典文明巡礼', desc: '从卫城、古市集到国家考古博物馆，把遗址、馆藏与游览动线串起来。', points: ['先上山，后逛卫城博物馆', '防滑鞋与饮用水必备', '门票与开放时间出发前确认'] },
    { key: 'mythology', mark: '神', source: '希腊神话谱系解析', title: '神话谱系入门', desc: '从原始神、泰坦神到奥林匹斯十二主神，读懂雅典娜、宙斯与海神的故事。', points: ['原始神：宇宙起源', '泰坦神：第二代神族', '奥林匹斯：神界秩序'] },
    { key: 'destinations', mark: '图', source: 'Lonely Planet Greece', title: '目的地与路线参考', desc: '覆盖雅典、伯罗奔尼撒、北希腊与基克拉泽斯群岛，适合做路线灵感库。', points: ['雅典与周边古迹', '圣托里尼等基克拉泽斯群岛', '按区域组合行程'] }
  ] }
] });
Object.assign(messages['zh-TW'].travel, { sections: [
  { key: 'prepare', kicker: 'PREPARE WELL', title: '出發準備', intro: '先安排簽證、行李與穿搭，輕裝出發。', guides: [
    { key: 'visa', mark: '簽', source: '申根簽證申請表', title: '簽證與材料清單', desc: '按申請表逐項核對個人資料、行程、住宿與保險文件。', points: ['護照與影印本', '行程、住宿與交通', '保險、照片與簽名'] },
    { key: 'packing', mark: '箱', source: '希臘旅行必備物品清單', title: '行李怎麼帶', desc: '從證件銀行卡到藥品、防曬與電子設備，按類別收進行李。', points: ['證件與現金卡類', '防曬、常用藥品', '轉換插頭與行動電源'] },
    { key: 'outfit', mark: '衣', source: '地中海旅行穿搭全攻略', title: '四季穿搭方案', desc: '用下裝定基礎、外套定調的流動衣櫥，應對海島溫差與長時間步行。', points: ['4—9月：亞麻與輕棉', '10月—翌年3月：疊穿保暖', '舒適鞋履優先'] }
  ] },
  { key: 'experience', kicker: 'LIVE LIKE GREECE', title: '旅途體驗', intro: '吃得道地、拍得好看，也更懂當地人的生活節奏。', guides: [
    { key: 'food', mark: '食', source: '希臘美食與生活方式探索', title: '希臘美食地圖', desc: '從希臘沙拉、Moussaka 到海島海鮮，邊吃邊認識地中海生活。', points: ['Meze 適合多人分享', '晚餐通常較晚開始', '餐後小費約 5%—10%'] },
    { key: 'photo', mark: '光', source: '地中海光影詩篇', title: '旅行攝影小課', desc: '用黃金時刻、九宮格與天然畫框，拍出藍白小鎮與海岸的層次。', points: ['日出後 / 日落前一小時', '地平線放在上或下 1/3', '擦鏡頭、穩住再按快門'] }
  ] },
  { key: 'culture', kicker: 'READ THE LAND', title: '文化深讀', intro: '先讀懂歷史與目的地，再走進每一處遺址與島嶼。', guides: [
    { key: 'athens', mark: '城', source: '雅典歷史古蹟與博物館詳解', title: '雅典文明巡禮', desc: '從衛城、古市集到國家考古博物館，串起遺址、館藏與遊覽動線。', points: ['先上山，再逛衛城博物館', '防滑鞋與飲用水必備', '出發前確認門票與開放時間'] },
    { key: 'mythology', mark: '神', source: '希臘神話譜系解析', title: '神話譜系入門', desc: '從原始神、泰坦神到奧林匹斯十二主神，讀懂雅典娜、宙斯與海神的故事。', points: ['原始神：宇宙起源', '泰坦神：第二代神族', '奧林匹斯：神界秩序'] },
    { key: 'destinations', mark: '圖', source: 'Lonely Planet Greece', title: '目的地與路線參考', desc: '涵蓋雅典、伯羅奔尼撒、北希臘與基克拉澤斯群島，適合做路線靈感庫。', points: ['雅典與周邊古蹟', '聖托里尼等基克拉澤斯群島', '按區域組合行程'] }
  ] }
] });
Object.assign(messages.en.travel, { sections: [
  { key: 'prepare', kicker: 'PREPARE WELL', title: 'Prepare well', intro: 'Sort visas, luggage and layers before you go, then travel light.', guides: [
    { key: 'visa', mark: 'V', source: 'Schengen visa checklist', title: 'Visa & documents', desc: 'Review personal details, itinerary, accommodation and insurance against the application form.', points: ['Passport and copies', 'Itinerary, stays and transport', 'Insurance, photo and signature'] },
    { key: 'packing', mark: 'B', source: 'Greece travel packing list', title: 'How to pack', desc: 'Organize documents, cards, medicine, sun protection and electronics by category.', points: ['Documents and payment cards', 'Sun protection and medicine', 'Adapter and power bank'] },
    { key: 'outfit', mark: 'C', source: 'Mediterranean outfit guide', title: 'What to wear', desc: 'Build around a reliable base and a defining layer for island temperature changes and long walks.', points: ['Apr—Sep: linen and light cotton', 'Oct—Mar: warm layers', 'Comfortable shoes first'] }
  ] },
  { key: 'experience', kicker: 'LIVE LIKE GREECE', title: 'Live like Greece', intro: 'Eat locally, take better photos and understand the rhythm of everyday life.', guides: [
    { key: 'food', mark: 'F', source: 'Greek food & lifestyle', title: 'Greek food map', desc: 'Meet Mediterranean life through Greek salad, Moussaka and island seafood.', points: ['Meze is made for sharing', 'Dinner usually starts late', 'About 5%—10% tip after a meal'] },
    { key: 'photo', mark: 'L', source: 'Mediterranean light notes', title: 'Travel photography', desc: 'Use golden hours, the rule of thirds and natural frames to bring out blue-and-white towns and coastlines.', points: ['The hour after sunrise / before sunset', 'Place the horizon on the upper or lower third', 'Clean the lens and steady the camera'] }
  ] },
  { key: 'culture', kicker: 'READ THE LAND', title: 'Read the land', intro: 'Understand the history and destination before stepping into each ruin and island.', guides: [
    { key: 'athens', mark: 'A', source: 'Athens heritage & museums', title: 'Athens in context', desc: 'Connect the Acropolis, Ancient Agora and National Archaeological Museum into one route.', points: ['Start uphill, then visit the Acropolis Museum', 'Wear non-slip shoes and carry water', 'Check tickets and opening hours'] },
    { key: 'mythology', mark: 'M', source: 'Greek mythology explained', title: 'Mythology basics', desc: 'Follow primordial gods, Titans and the Olympians to understand Athena, Zeus and Poseidon.', points: ['Primordial gods: cosmic origins', 'Titans: the second generation', 'Olympians: divine order'] },
    { key: 'destinations', mark: 'M', source: 'Lonely Planet Greece', title: 'Destinations & routes', desc: 'A source of ideas across Athens, the Peloponnese, northern Greece and the Cyclades.', points: ['Athens and nearby heritage', 'Santorini and the Cyclades', 'Build a route by region'] }
  ] }
] });
messages['zh-CN'].knowledgePage = { title: '希腊景点', subtitle: '从卫城到梅黛奥拉，把每一次参访变成真正看懂的现场。选择一个内容板块，开始阅读。', pill1: '城市导览', pill2: '必看亮点', pill3: '参观指南', pill4: '深度讲解', originalTab: '经典知识库', newTab: '深度讲解与会员', cities: '精选城市', trips: '包含这些景点的行程', consultTitle: '想把景点读得更深？', consultDesc: '预约一对一线上人文咨询，先聊聊你的目的地。', viewTrips: '查看全部参考行程' };
messages['zh-TW'].knowledgePage = { title: '希臘景點', subtitle: '從衛城到梅黛奧拉，把每一次參訪變成真正看懂的現場。選擇一個內容板塊，開始閱讀。', pill1: '城市導覽', pill2: '必看亮點', pill3: '參觀指南', pill4: '深度講解', originalTab: '經典知識庫', newTab: '深度講解與會員', cities: '精選城市', trips: '包含這些景點的行程', consultTitle: '想把景點讀得更深？', consultDesc: '預約一對一線上人文諮詢，先聊聊你的目的地。', viewTrips: '查看全部參考行程' };
messages.en.knowledgePage = { title: 'Greek sights', subtitle: 'From the Acropolis to Meteora, turn every visit into a place you truly understand. Choose a content section to begin.', pill1: 'City guides', pill2: 'Highlights', pill3: 'Visitor guide', pill4: 'Deep dive', originalTab: 'Classic library', newTab: 'Deep guides & membership', cities: 'Featured cities', trips: 'Trips featuring these sights', consultTitle: 'Want to go deeper?', consultDesc: 'Book a one-to-one humanities consultation and start with your destination.', viewTrips: 'View all reference trips' };
messages['zh-CN'].itineraryPage = { title: '参考行程', subtitle: '甄选路线的参考日程，供你快速想象旅程的形状；提交需求后，顾问将为你一对一制作专属定制行程。', pill1: '结构参考', pill2: '景点关联', pill3: '一对一定制', cta: '查看参考行程', custom: '定制行程 · 填写需求，获取专属方案', customDesc: '提交需求表，顾问将按你的日期、人数与偏好定制详细行程，并以行程链接单独发送给你。' };
messages['zh-TW'].itineraryPage = { title: '參考行程', subtitle: '精選路線的參考日程，供你快速想像旅程的形狀；提交需求後，顧問將為你一對一製作專屬定製行程。', pill1: '結構參考', pill2: '景點關聯', pill3: '一對一定製', cta: '查看參考行程', custom: '定製行程 · 填寫需求，獲取專屬方案', customDesc: '提交需求表，顧問將按你的日期、人數與偏好定製詳細行程，並以行程連結單獨發送給你。' };
messages.en.itineraryPage = { title: 'Reference itineraries', subtitle: 'Use selected routes to imagine the shape of a trip. Send your request for one-to-one itinerary planning.', pill1: 'Structure', pill2: 'Sight links', pill3: 'One-to-one planning', cta: 'View itinerary', custom: 'Private itinerary · Share your needs for a tailored plan', customDesc: 'Send your dates, group and preferences. A consultant will create a detailed itinerary and share it by private link.' };
messages['zh-CN'].profileDetail = { orders: '我的预约', trips: '我的行程', coupons: '优惠券', travelers: '常用出行人', visa: '护照签证资料', noOrders: '还没有提交过预约或咨询', noTrips: '暂未安排导游陪同行程', noCoupons: '当前没有可使用的优惠券', noTravelers: '添加常用出行人，填写表单时更方便', noVisa: '添加资料后可在预约时快速查看', emptyDesc: '提交咨询后，顾问确认的进度会显示在这里', addTraveler: '添加出行人', addDocument: '添加资料', edit: '编辑', delete: '删除', myOrders: '我的订单', paymentOrder: '订单详情', noPaymentOrders: '暂无支付订单', paymentOrderKicker: 'PAYMENT ORDERS', orderProduct: '商品', orderNumber: '订单号', merchantOrderNumber: '商户订单号', orderAmount: '订单金额', orderStatus: '订单状态', orderCreatedAt: '下单时间', orderPaidAt: '支付时间', transactionId: '微信交易号', paid: '已支付', pending: '待支付', failed: '支付失败', closed: '已关闭' };
messages['zh-TW'].profileDetail = { orders: '我的預約', trips: '我的行程', coupons: '優惠券', travelers: '常用出行人', visa: '護照簽證資料', noOrders: '還沒有提交過預約或諮詢', noTrips: '暫未安排導遊陪同行程', noCoupons: '目前沒有可使用的優惠券', noTravelers: '添加常用出行人，填寫表單時更方便', noVisa: '添加資料後可在預約時快速查看', emptyDesc: '提交諮詢後，顧問確認的進度會顯示在這裡', addTraveler: '添加出行人', addDocument: '添加資料', edit: '編輯', delete: '刪除', myOrders: '我的訂單', paymentOrder: '訂單詳情', noPaymentOrders: '目前沒有支付訂單', paymentOrderKicker: 'PAYMENT ORDERS', orderProduct: '商品', orderNumber: '訂單編號', merchantOrderNumber: '商戶訂單號', orderAmount: '訂單金額', orderStatus: '訂單狀態', orderCreatedAt: '下單時間', orderPaidAt: '支付時間', transactionId: '微信交易號', paid: '已支付', pending: '待支付', failed: '支付失敗', closed: '已關閉' };
messages.en.profileDetail = { orders: 'My bookings', trips: 'My trips', coupons: 'Coupons', travelers: 'Travelers', visa: 'Passport & visa', noOrders: 'No bookings or inquiries yet', noTrips: 'No guided trip arranged yet', noCoupons: 'No coupons available', noTravelers: 'Add a traveler to make future forms easier', noVisa: 'Add a document to review it quickly when booking', emptyDesc: 'Progress confirmed by a consultant will appear here', addTraveler: 'Add traveler', addDocument: 'Add document', edit: 'Edit', delete: 'Delete', myOrders: 'My orders', paymentOrder: 'Order details', noPaymentOrders: 'No payment orders yet', paymentOrderKicker: 'PAYMENT ORDERS', orderProduct: 'Product', orderNumber: 'Order number', merchantOrderNumber: 'Merchant order number', orderAmount: 'Amount', orderStatus: 'Status', orderCreatedAt: 'Placed at', orderPaidAt: 'Paid at', transactionId: 'WeChat transaction ID', paid: 'Paid', pending: 'Pending', failed: 'Payment failed', closed: 'Closed' };
messages['zh-CN'].travelerEdit = { addTraveler: '添加出行人', editTraveler: '编辑出行人', addDocument: '添加资料', editDocument: '编辑资料', loading: '正在加载…', name: '姓名或称呼', namePlaceholder: '例如：张先生 / 小朋友', relation: '与本人关系', relationPlaceholder: '例如：本人 / 配偶 / 子女', passport: '护照号码', passportPlaceholder: '选填，便于顾问核对签证信息', expiry: '护照有效期', expiryPlaceholder: '例如：2030-06-30', visaStatus: '签证备注', visaStatusPlaceholder: '例如：已持申根签 / 待确认', save: '保存', saved: '已保存', required: '请填写姓名或称呼', notFound: '资料不存在', privacy: '资料由服务端按当前微信账号隔离保存，仅用于后续服务沟通。' };
messages['zh-TW'].travelerEdit = { addTraveler: '添加出行人', editTraveler: '編輯出行人', addDocument: '添加資料', editDocument: '編輯資料', loading: '正在載入…', name: '姓名或稱呼', namePlaceholder: '例如：張先生 / 小朋友', relation: '與本人關係', relationPlaceholder: '例如：本人 / 配偶 / 子女', passport: '護照號碼', passportPlaceholder: '選填，便於顧問核對簽證資訊', expiry: '護照有效期', expiryPlaceholder: '例如：2030-06-30', visaStatus: '簽證備註', visaStatusPlaceholder: '例如：已持申根簽 / 待確認', save: '保存', saved: '已保存', required: '請填寫姓名或稱呼', notFound: '資料不存在', privacy: '資料由服務端按目前微信帳號隔離保存，僅用於後續服務溝通。' };
messages.en.travelerEdit = { addTraveler: 'Add traveler', editTraveler: 'Edit traveler', addDocument: 'Add document', editDocument: 'Edit document', loading: 'Loading…', name: 'Name', namePlaceholder: 'e.g. Mr Zhang / child', relation: 'Relationship', relationPlaceholder: 'e.g. self / spouse / child', passport: 'Passport number', passportPlaceholder: 'Optional, for visa review', expiry: 'Passport expiry', expiryPlaceholder: 'e.g. 2030-06-30', visaStatus: 'Visa note', visaStatusPlaceholder: 'e.g. Schengen visa held / to confirm', save: 'Save', saved: 'Saved', required: 'Please enter a name', notFound: 'Record not found', privacy: 'Your data is isolated by your WeChat account and used only for service communication.' };
messages['zh-CN'].contentPage = { about: '景点概览', highlights: '必看亮点', allHighlights: '查看全部', collapseHighlights: '收起亮点', visitorGuide: '参观指南', deepDive: '深度文史讲解', freePreview: '免费文字预览', paid: '付费解锁内容', locked: '锁定', unlock: '付费解锁（功能开发中）', consultTitle: '想把景点读得更深？', consultDesc: '预约一对一线上人文咨询，先聊聊你的目的地。', cityAbout: '了解「希腊旅行管家」导览讲解的不同之处', cityInside: '专业编写的图文与语音讲解，按景点逐层展开：先看必看亮点，再看参观指南，最后深入历史、神话与建筑。', buy: '购买导览包', viewSpots: '先看景点', freeBrowse: '免费浏览', buySpots: '购买', itineraryPeriod: '行程日期', itineraryNumber: '订单编号', visitors: '旅客人数', preferredLanguages: '语种需求', plannedVehicle: '计划车型', privateGuide: '推荐司导', invalidItinerary: '未找到该行程', invalidLink: '行程链接无效或已失效' };
messages['zh-TW'].contentPage = { about: '景點概覽', highlights: '必看亮點', allHighlights: '查看全部', collapseHighlights: '收起亮點', visitorGuide: '參觀指南', deepDive: '深度文史講解', freePreview: '免費文字預覽', paid: '付費解鎖內容', locked: '鎖定', unlock: '付費解鎖（功能開發中）', consultTitle: '想把景點讀得更深？', consultDesc: '預約一對一線上人文諮詢，先聊聊你的目的地。', cityAbout: '了解「希臘旅行管家」導覽講解的不同之處', cityInside: '專業編寫的圖文與語音講解，按景點逐層展開：先看必看亮點，再看參觀指南，最後深入歷史、神話與建築。', buy: '購買導覽包', viewSpots: '先看景點', freeBrowse: '免費瀏覽', buySpots: '購買', itineraryPeriod: '行程日期', itineraryNumber: '訂單編號', visitors: '旅客人數', preferredLanguages: '語種需求', plannedVehicle: '計劃車型', privateGuide: '推薦司導', invalidItinerary: '未找到該行程', invalidLink: '行程連結無效或已失效' };
messages.en.contentPage = { about: 'Overview', highlights: 'Highlights', allHighlights: 'View all', collapseHighlights: 'Show less', visitorGuide: 'Visitor guide', deepDive: 'History & context', freePreview: 'Free text preview', paid: 'Paid content', locked: 'Locked', unlock: 'Unlock (coming soon)', consultTitle: 'Want to go deeper?', consultDesc: 'Book a one-to-one humanities consultation and start with your destination.', cityAbout: 'What makes Greece Travel Butler guides different', cityInside: 'Professionally written text and audio guides unfold by sight: highlights first, then practical visiting notes, then history, mythology and architecture.', buy: 'Buy guide package', viewSpots: 'Browse sights', freeBrowse: 'Free preview', buySpots: 'Buy', itineraryPeriod: 'Travel dates', itineraryNumber: 'Itinerary number', visitors: 'Travelers', preferredLanguages: 'Languages', plannedVehicle: 'Vehicle', privateGuide: 'Private guide', invalidItinerary: 'Itinerary not found', invalidLink: 'This itinerary link is invalid or expired' };
Object.assign(messages['zh-CN'].contentPage, { customTag: '专属定制行程', referenceTag: '参考行程', infoHeading: '行程信息', fee: '服务费总额 / TOTAL SERVICE FEE', shareTrip: '转发此行程给同行家人', overviewHeading: '行程概览', highlightLabel: '亮点', suitableLabel: '适合', serviceLegend: '服务包含图例', daily: '每日行程', day: '第', night: '夜宿', stay: '停留', notices: '服务须知', changes: '需要调整行程？', changesDesc: '行程顺序与安排可按实际沟通调整，请联系你的专属顾问。', customizeRoute: '定制行程 · 填写需求，获取专属方案', customizeRouteDesc: '提交需求表，顾问一对一为你制作专属定制行程。', footerSlogan: '只为一生美好回忆' });
Object.assign(messages['zh-TW'].contentPage, { customTag: '專屬定製行程', referenceTag: '參考行程', infoHeading: '行程資訊', fee: '服務費總額 / TOTAL SERVICE FEE', shareTrip: '轉發此行程給同行家人', overviewHeading: '行程概覽', highlightLabel: '亮點', suitableLabel: '適合', serviceLegend: '服務包含圖例', daily: '每日行程', day: '第', night: '夜宿', stay: '停留', notices: '服務須知', changes: '需要調整行程？', changesDesc: '行程順序與安排可按實際溝通調整，請聯絡你的專屬顧問。', customizeRoute: '定製行程 · 填寫需求，獲取專屬方案', customizeRouteDesc: '提交需求表，顧問一對一為你製作專屬定製行程。', footerSlogan: '只為一生美好回憶' });
Object.assign(messages.en.contentPage, { customTag: 'Private itinerary', referenceTag: 'Reference itinerary', infoHeading: 'Itinerary details', fee: 'TOTAL SERVICE FEE', shareTrip: 'Share this itinerary with your group', overviewHeading: 'Trip overview', highlightLabel: 'Highlights', suitableLabel: 'Best for', serviceLegend: 'Included services', daily: 'Daily itinerary', day: 'Day ', night: 'Stay · ', stay: 'Stop · ', notices: 'Service notes', changes: 'Need to adjust your itinerary?', changesDesc: 'The order and schedule can be adjusted with your consultant.', customizeRoute: 'Private itinerary · Share your needs for a tailored plan', customizeRouteDesc: 'Send your request and a consultant will create a private itinerary for you.', footerSlogan: 'Only for a lifetime of beautiful memories' });
Object.assign(messages['zh-CN'].contentPage, { audio: '1分钟试听片段', audioTip: '点击试听 · 内容上传占位' });
Object.assign(messages['zh-TW'].contentPage, { audio: '1分鐘試聽片段', audioTip: '點擊試聽 · 內容上傳佔位' });
Object.assign(messages.en.contentPage, { audio: '1-minute preview', audioTip: 'Tap to listen · content pending' });
Object.assign(messages['zh-CN'].contentPage, { guideLabels: { hours: '开放时间', tickets: '门票信息', transport: '交通信息', worth: '值得一去', services: '馆内服务', family: '亲子参观', map: '馆内地图', shop: '博物馆商店', accessibility: '无障碍服务', exhibitions: '临时展览', faq: '常见问题', notices: '临时通知' } });
Object.assign(messages['zh-TW'].contentPage, { guideLabels: { hours: '開放時間', tickets: '門票資訊', transport: '交通資訊', worth: '值得一去', services: '館內服務', family: '親子參觀', map: '館內地圖', shop: '博物館商店', accessibility: '無障礙服務', exhibitions: '臨時展覽', faq: '常見問題', notices: '臨時通知' } });
Object.assign(messages.en.contentPage, { guideLabels: { hours: 'Opening hours', tickets: 'Tickets', transport: 'Getting there', worth: 'Why visit', services: 'Museum services', family: 'Family visits', map: 'Museum map', shop: 'Museum shop', accessibility: 'Accessibility', exhibitions: 'Temporary exhibitions', faq: 'FAQ', notices: 'Notices' } });

Object.assign(messages['zh-CN'], {
  productHome: { searchPlaceholder: '搜索景点或人文关键词', popular: '热门景点讲解', freeTrial: '免费试看', categoryEmpty: '该分类暂时没有景点讲解', liveTitle: '线上文史直播讲解', liveDesc: '与顾问预约一场有温度的现场导览', reserve: '立即预约', memberTitle: '终身会员', memberDesc: '解锁全部景点视频讲解，后续上新免费', openMember: '开通终身会员', categories: ['雅典区域', '圣托里尼', '克里特', '伯罗奔尼撒', '扎金索斯', '其他古迹'], banners: ['终身会员特惠', '热门景点讲解', '直播预约入口'] },
  paidContent: { video: '景点视频讲解', trial: '试看', trialUnavailable: '后台尚未配置试看时长', trialEnded: '试看已结束', trialEndedDesc: '选择一种方式解锁完整讲解', buySpot: '购买本景点单篇讲解', buySpotDesc: '一次性付费 · 永久观看本景点', member: '开通终身会员', memberDesc: '全部景点 · 后续上新免费', payUnavailable: '支付服务尚未配置，请稍后再试', paymentPending: '支付结果确认中，请稍后查看课程权益', unlock: '解锁完整讲解', related: '同区域其他讲解', appointment: '预约直播讲解', freeText: '图文知识库 · 全部免费看', memberUnlocked: '终身会员 · 已解锁', purchased: '已购 · 永久观看', trialConfigured: '试看 {seconds} 秒', simulationTitle: '模拟订单（仅测试环境）', simulationSuccess: '模拟支付成功', simulationFailure: '模拟支付失败', simulationLoginTitle: '用测试手机号查看购买记录', simulationLoginDesc: '输入测试手机号建立模拟身份，订单和课程权益将按手机号隔离保存。', simulationPhonePlaceholder: '请输入测试手机号', simulationLogin: '进入支付测试', simulationLoginFailed: '测试身份建立失败', simulationLoginSuccess: '已进入支付测试', purchasedCourses: '已购买课程', paymentOrders: '支付订单' },
  liveBooking: { title: '在线直播讲解预约', subtitle: '提交预约后，顾问通过微信与您确认时间与费用。', complianceTitle: '合规提示', compliance: '小程序内不收取任何直播费用，直播相关沟通与收费均在线下微信完成。', name: '姓名', namePlaceholder: '请输入您的姓名', phone: '手机号', phonePlaceholder: '用于顾问联系', attraction: '意向景点', chooseAttraction: '请选择意向景点', time: '期望时间段', chooseTime: '请选择时间段', note: '备注', notePlaceholder: '例如：希望从神话或建筑角度讲解', required: '请填写姓名、手机号、景点和时间段', submit: '提交预约', successTitle: '预约提交成功', successCopy: '顾问将在 24 小时内通过微信与您确认直播时间与费用。', wechat: '客服微信', copy: '复制微信号', copied: '微信号已复制', done: '完成', footer: '希腊旅行管家 · 仅提供文化咨询与知识付费服务，不从事旅游业务。' }
});
Object.assign(messages['zh-TW'], {
  productHome: { searchPlaceholder: '搜尋景點或人文關鍵詞', popular: '熱門景點講解', freeTrial: '免費試看', categoryEmpty: '此分類暫時沒有景點講解', liveTitle: '線上文史直播講解', liveDesc: '與顧問預約一場有溫度的現場導覽', reserve: '立即預約', memberTitle: '終身會員', memberDesc: '解鎖全部景點影片講解，後續上新免費', openMember: '開通終身會員', categories: ['雅典區域', '聖托里尼', '克里特', '伯羅奔尼撒', '扎金索斯', '其他古蹟'], banners: ['終身會員特惠', '熱門景點講解', '直播預約入口'] },
  paidContent: { video: '景點影片講解', trial: '試看', trialUnavailable: '後台尚未配置試看時長', trialEnded: '試看已結束', trialEndedDesc: '選擇一種方式解鎖完整講解', buySpot: '購買本景點單篇講解', buySpotDesc: '一次性付費 · 永久觀看本景點', member: '開通終身會員', memberDesc: '全部景點 · 後續上新免費', payUnavailable: '支付服務尚未配置，請稍後再試', paymentPending: '支付結果確認中，請稍後查看課程權益', unlock: '解鎖完整講解', related: '同區域其他講解', appointment: '預約直播講解', freeText: '圖文知識庫 · 全部免費看', memberUnlocked: '終身會員 · 已解鎖', purchased: '已購 · 永久觀看', trialConfigured: '試看 {seconds} 秒', simulationTitle: '模擬訂單（僅測試環境）', simulationSuccess: '模擬支付成功', simulationFailure: '模擬支付失敗', simulationLoginTitle: '用測試手機號查看購買記錄', simulationLoginDesc: '輸入測試手機號建立模擬身份，訂單和課程權益將按手機號隔離保存。', simulationPhonePlaceholder: '請輸入測試手機號', simulationLogin: '進入支付測試', simulationLoginFailed: '測試身份建立失敗', simulationLoginSuccess: '已進入支付測試', purchasedCourses: '已購買課程', paymentOrders: '支付訂單' },
  liveBooking: { title: '線上直播講解預約', subtitle: '提交預約後，顧問透過微信與您確認時間與費用。', complianceTitle: '合規提示', compliance: '小程序內不收取任何直播費用，直播相關溝通與收費均在線下微信完成。', name: '姓名', namePlaceholder: '請輸入您的姓名', phone: '手機號', phonePlaceholder: '用於顧問聯絡', attraction: '意向景點', chooseAttraction: '請選擇意向景點', time: '期望時段', chooseTime: '請選擇時段', note: '備註', notePlaceholder: '例如：希望從神話或建築角度講解', required: '請填寫姓名、手機號、景點和時段', submit: '提交預約', successTitle: '預約提交成功', successCopy: '顧問將在 24 小時內透過微信與您確認直播時間與費用。', wechat: '客服微信', copy: '複製微信號', copied: '微信號已複製', done: '完成', footer: '希臘旅行管家 · 僅提供文化諮詢與知識付費服務，不從事旅遊業務。' }
});
Object.assign(messages.en, {
  productHome: { searchPlaceholder: 'Search sights or cultural topics', popular: 'Popular guided sights', freeTrial: 'Free preview', categoryEmpty: 'No guided sights in this category yet', liveTitle: 'Live humanities session', liveDesc: 'Reserve a warm, personal session with a consultant', reserve: 'Reserve now', memberTitle: 'Lifetime membership', memberDesc: 'Unlock every sight video, including future releases', openMember: 'Join lifetime', categories: ['Athens', 'Santorini', 'Crete', 'Peloponnese', 'Zakynthos', 'Other heritage'], banners: ['Lifetime membership', 'Popular guided sights', 'Live booking'] },
  paidContent: { video: 'Video guide', trial: 'Preview', trialUnavailable: 'Trial duration is not configured by the backend', trialEnded: 'Preview ended', trialEndedDesc: 'Choose an option to unlock the full guide', buySpot: 'Buy this sight', buySpotDesc: 'One-time payment · Permanent access', member: 'Join lifetime membership', memberDesc: 'All sights · Future releases included', payUnavailable: 'Payment is not configured yet. Please try again later.', paymentPending: 'Payment confirmation is pending. Check your course access shortly.', unlock: 'Unlock full guide', related: 'More guides nearby', appointment: 'Book a live session', freeText: 'Text knowledge base · Free for everyone', memberUnlocked: 'Lifetime member · Unlocked', purchased: 'Purchased · Permanent access', trialConfigured: '{seconds}s preview', simulationTitle: 'Simulated order (test only)', simulationSuccess: 'Simulate payment success', simulationFailure: 'Simulate payment failure', simulationLoginTitle: 'View purchase history with a test phone', simulationLoginDesc: 'Use a test phone to create an isolated simulation identity for orders and course access.', simulationPhonePlaceholder: 'Enter a test phone', simulationLogin: 'Enter payment test', simulationLoginFailed: 'Could not create test identity', simulationLoginSuccess: 'Payment test identity ready', purchasedCourses: 'Purchased courses', paymentOrders: 'Payment orders' },
  liveBooking: { title: 'Book a live humanities session', subtitle: 'Submit your request and a consultant will confirm the time and fee on WeChat.', complianceTitle: 'Compliance notice', compliance: 'No live-session fee is collected inside the mini program. All communication and payment happen offline on WeChat.', name: 'Name', namePlaceholder: 'Your name', phone: 'Phone', phonePlaceholder: 'For consultant contact', attraction: 'Sight of interest', chooseAttraction: 'Choose a sight', time: 'Preferred time', chooseTime: 'Choose a time', note: 'Note', notePlaceholder: 'For example: focus on mythology or architecture', required: 'Please fill in name, phone, sight and time', submit: 'Submit request', successTitle: 'Request submitted', successCopy: 'A consultant will contact you on WeChat within 24 hours to confirm the session and fee.', wechat: 'Consultant WeChat', copy: 'Copy ID', copied: 'WeChat ID copied', done: 'Done', footer: 'Greece Travel Butler · Cultural consulting and knowledge content only; no travel products.' }
});

Object.assign(messages['zh-CN'].routeAudio, { more: '更多精彩内容' });
Object.assign(messages['zh-TW'].routeAudio, { more: '更多精彩內容' });
Object.assign(messages.en.routeAudio, { more: 'More cultural content' });
Object.assign(messages['zh-CN'].guide, {
  services: { title: '古迹讲解，两种方式读懂希腊', offlineTitle: '线下陪同讲解', offlineDesc: '到达景点后，由 Richard 现场陪同、边走边讲。', offlineCta: '填写日期，预约陪同', liveTitle: '线上实时直播', liveDesc: '你到景点现场，用手机拍摄；Richard 远程实时讲解。', liveCta: '预约线上直播', trialTitle: '名导景点讲解试听', trialDesc: '先免费试听，再进入深度景点讲解。', trialCta: '免费试听更多内容' }
});
Object.assign(messages['zh-TW'].guide, {
  services: { title: '古蹟講解，兩種方式讀懂希臘', offlineTitle: '線下陪同講解', offlineDesc: '抵達景點後，由 Richard 現場陪同、邊走邊講。', offlineCta: '填寫日期，預約陪同', liveTitle: '線上即時直播', liveDesc: '你到景點現場，用手機拍攝；Richard 遠程即時講解。', liveCta: '預約線上直播', trialTitle: '名導景點講解試聽', trialDesc: '先免費試聽，再進入深度景點講解。', trialCta: '免費試聽更多內容' }
});
Object.assign(messages.en.guide, {
  services: { title: 'Two ways to understand Greece', offlineTitle: 'In-person accompaniment', offlineDesc: 'Meet Richard at the sight and explore with live context along the way.', offlineCta: 'Choose a date', liveTitle: 'Live online session', liveDesc: 'Film the sight on your phone while Richard explains it in real time from home.', liveCta: 'Book a live session', trialTitle: 'Guide audio preview', trialDesc: 'Start with a free preview, then explore the deep sight guides.', trialCta: 'Try the free preview' }
});
Object.assign(messages['zh-CN'].productHome, { classicTitle: '经典知识库', deepTitle: '深度景点讲解', aiAudio: 'AI音频课程', humanAudio: '真人音频课程', courseHint: '课程与解锁方式以后端配置为准' });
Object.assign(messages['zh-TW'].productHome, { classicTitle: '經典知識庫', deepTitle: '深度景點講解', aiAudio: 'AI音頻課程', humanAudio: '真人音頻課程', courseHint: '課程與解鎖方式以後端配置為準' });
Object.assign(messages.en.productHome, { classicTitle: 'Classic knowledge base', deepTitle: 'Deep sight guides', aiAudio: 'AI audio course', humanAudio: 'Human audio course', courseHint: 'Courses and access are configured by the backend' });
Object.assign(messages['zh-CN'].liveBooking, { contactTitle: '也可以直接联系顾问', contactDesc: '提交预约或通过微信、电话确认直播时间。', call: '拨打电话' });
Object.assign(messages['zh-TW'].liveBooking, { contactTitle: '也可以直接聯絡顧問', contactDesc: '提交預約或透過微信、電話確認直播時間。', call: '撥打電話' });
Object.assign(messages.en.liveBooking, { contactTitle: 'Contact the consultant directly', contactDesc: 'Submit a request or confirm the session by WeChat or phone.', call: 'Call consultant' });

Object.assign(messages['zh-CN'].profileDetail, { recordDate: '预约日期', createdAt: '提交时间', couponEmpty: '如有适用权益，顾问会在确认咨询时为您说明', profileEmpty: '资料由服务端按当前微信账号隔离保存，仅用于后续服务沟通', passport: '护照', expiry: '有效期', visaStatus: '签证' });
Object.assign(messages['zh-TW'].profileDetail, { recordDate: '預約日期', createdAt: '提交時間', couponEmpty: '如有適用權益，顧問會在確認諮詢時為您說明', profileEmpty: '資料由服務端按目前微信帳號隔離保存，僅用於後續服務溝通', passport: '護照', expiry: '有效期', visaStatus: '簽證' });
Object.assign(messages.en.profileDetail, { recordDate: 'Booking date', createdAt: 'Submitted', couponEmpty: 'If an eligible benefit is available, your consultant will explain it when confirming your inquiry.', profileEmpty: 'Your data is isolated by your WeChat account and used only for service communication.', passport: 'Passport', expiry: 'Expiry', visaStatus: 'Visa' });
Object.assign(messages['zh-CN'].profile, { loginFailed: '微信登录失败', avatarUploadFailed: '头像上传失败', phoneAuthRequired: '需要授权手机号后才能修改', phoneBindFailed: '绑定失败', nicknameRequired: '请输入昵称', nicknameInvalid: '请使用其他昵称', saveFailed: '保存失败', aboutTitle: '关于 希腊旅行管家', copyWebsite: '复制官网', close: '关闭', websiteCopied: '官网已复制', profileIntro: '用于展示您的微信昵称和头像' });
Object.assign(messages['zh-TW'].profile, { loginFailed: '微信登入失敗', avatarUploadFailed: '頭像上傳失敗', phoneAuthRequired: '需要授權手機號後才能修改', phoneBindFailed: '綁定失敗', nicknameRequired: '請輸入暱稱', nicknameInvalid: '請使用其他暱稱', saveFailed: '保存失敗', aboutTitle: '關於 希臘旅行管家', copyWebsite: '複製官網', close: '關閉', websiteCopied: '官網已複製', profileIntro: '用於展示您的微信暱稱和頭像' });
Object.assign(messages.en.profile, { loginFailed: 'WeChat sign-in failed', avatarUploadFailed: 'Avatar upload failed', phoneAuthRequired: 'Phone authorization is required before editing', phoneBindFailed: 'Phone linking failed', nicknameRequired: 'Please enter a name', nicknameInvalid: 'Please choose another name', saveFailed: 'Save failed', aboutTitle: 'About Greece Travel Butler', copyWebsite: 'Copy website', close: 'Close', websiteCopied: 'Website copied', profileIntro: 'Used to display your WeChat name and avatar' });
Object.assign(messages['zh-CN'].profileDetail, { timePending: '时间待确认', requestSubmitted: '需求已提交，等待顾问确认', exclusiveBenefit: '专属权益', couponRules: '使用规则请以顾问说明为准', expiryPrefix: '有效期至', expiryFallback: '有效期以券面为准', invalidId: '资料编号无效，请刷新后重试', deleteTitle: '删除这条资料？', deleteContent: '删除后无法恢复，请确认。', deleted: '已删除', loadRecordsFailed: '记录加载失败', loadCouponsFailed: '优惠券加载失败', loadProfileFailed: '资料加载失败', leadTitles: { customization: '行程资讯咨询', 'guide-booking': 'Richard 预约', 'vehicle-consultation': '用车资源咨询', 'knowledge-base': '文史知识咨询', 'business-travel': '商旅随行咨询', fallback: '咨询记录' }, statuses: { new: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消', fallback: '待确认' } });
Object.assign(messages['zh-TW'].profileDetail, { timePending: '時間待確認', requestSubmitted: '需求已提交，等待顧問確認', exclusiveBenefit: '專屬權益', couponRules: '使用規則請以顧問說明為準', expiryPrefix: '有效期至', expiryFallback: '有效期以券面為準', invalidId: '資料編號無效，請重新整理後重試', deleteTitle: '刪除這筆資料？', deleteContent: '刪除後無法恢復，請確認。', deleted: '已刪除', loadRecordsFailed: '記錄載入失敗', loadCouponsFailed: '優惠券載入失敗', loadProfileFailed: '資料載入失敗', leadTitles: { customization: '行程諮詢', 'guide-booking': 'Richard 預約', 'vehicle-consultation': '用車資源諮詢', 'knowledge-base': '文史知識諮詢', 'business-travel': '商旅隨行諮詢', fallback: '諮詢記錄' }, statuses: { new: '待確認', confirmed: '已確認', completed: '已完成', cancelled: '已取消', fallback: '待確認' } });
Object.assign(messages.en.profileDetail, { timePending: 'Time to be confirmed', requestSubmitted: 'Request sent, waiting for consultant confirmation', exclusiveBenefit: 'Private benefit', couponRules: 'Please follow the usage rules explained by your consultant', expiryPrefix: 'Expires', expiryFallback: 'See the coupon for expiry details', invalidId: 'Invalid record number. Refresh and try again.', deleteTitle: 'Delete this record?', deleteContent: 'This cannot be undone. Please confirm.', deleted: 'Deleted', loadRecordsFailed: 'Could not load records', loadCouponsFailed: 'Could not load coupons', loadProfileFailed: 'Could not load profile data', leadTitles: { customization: 'Trip planning inquiry', 'guide-booking': 'Richard booking', 'vehicle-consultation': 'Transport inquiry', 'knowledge-base': 'Heritage consultation', 'business-travel': 'Business travel inquiry', fallback: 'Inquiry record' }, statuses: { new: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', fallback: 'Pending' } });

function getLocale() {
  const stored = wx.getStorageSync(STORAGE_KEY);
  return SUPPORTED_LOCALES.includes(stored) ? stored : 'zh-CN';
}

function getMessages(locale = getLocale()) {
  return messages[SUPPORTED_LOCALES.includes(locale) ? locale : 'zh-CN'];
}

function setLocale(locale) {
  const next = SUPPORTED_LOCALES.includes(locale) ? locale : 'zh-CN';
  wx.setStorageSync(STORAGE_KEY, next);
  const app = getApp && getApp();
  if (app && app.globalData) app.globalData.locale = next;
  return next;
}

function apply(page) {
  if (!page || !page.setData) return getMessages();
  const locale = getLocale();
  page.setData({ locale, i18n: getMessages(locale) });
  return getMessages(locale);
}

function languageOptions() {
  return SUPPORTED_LOCALES.map((value) => ({ value, label: getMessages(value).locale }));
}

module.exports = { SUPPORTED_LOCALES, getLocale, getMessages, setLocale, apply, languageOptions };
