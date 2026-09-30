// 在地用车（vehicleService）契约与页面联调：
// 覆盖适配器（缺省/过滤/排序/三语）、页面占位策略、选项渲染数据与提交 payload 的稳定 id。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const modules = new Map();
function loadModule(filename) {
  const resolved = require.resolve(filename);
  if (modules.has(resolved)) return modules.get(resolved).exports;
  const module = { exports: {} };
  modules.set(resolved, module);
  const localRequire = (id) => (id.startsWith('.') ? loadModule(path.resolve(path.dirname(resolved), id)) : require(id));
  vm.runInThisContext('(function(require,module,exports){\n' + fs.readFileSync(resolved, 'utf8') + '\n})', { filename: resolved })(localRequire, module, module.exports);
  return module.exports;
}

const i18n = loadModule(path.resolve(__dirname, '../utils/i18n.js'));

const vehicleFixture = {
  enabled: true,
  sort: 2,
  title: ' 在地用车资源 ', titleTw: '在地用車資源', titleEn: 'Local transport',
  subtitle: '对接咨询', subtitleTw: '對接諮詢', subtitleEn: 'Resource coordination',
  description: '说明', descriptionTw: '說明', descriptionEn: 'Description',
  tags: [' 欧6车型信息 ', '', '按需匹配'], tagsTw: ['歐6車型資訊', '按需匹配'], tagsEn: ['Euro 6 vehicles'],
  note: ' 注意事项 ', noteTw: '', noteEn: '',
  disclaimer: '', disclaimerTw: '', disclaimerEn: '',
  images: ['./images/vehicle-1.jpg', 'https://cdn.example.com/vehicle-2.jpg', ''],
  form: {
    title: '用车需求表', titleTw: '用車需求表', titleEn: 'Transport request',
    tip: '提交后 24 小时内联系', tipTw: '', tipEn: '',
    dateLabel: '出行日期', durationLabel: '用车时长', vehicleLabel: '车型', peopleLabel: '人数',
    routeLabel: '路线需求', contactLabel: '联系方式', submitLabel: '提交用车咨询',
    routePlaceholder: '例如：机场接送', phonePlaceholder: '手机号', wechatPlaceholder: '微信号',
    contactPhone: true, contactWechat: false, routeRequired: false,
    dateStart: 'today', dateEnd: ''
  },
  options: {
    vehicle: [
      { id: 'vehicle-business', label: '商务车型', labelTw: '商務車型', labelEn: 'Business vehicle', sort: 3, enabled: true },
      { id: 'vehicle-bmw-suv-5', label: '宝马 SUV / 5座', labelEn: 'BMW SUV / 5 seats', sort: 1, enabled: true },
      { id: 'vehicle-hidden', label: '已停用车型', sort: 2, enabled: false },
      { id: 'vehicle-blank', label: '   ', sort: 4, enabled: true }
    ],
    duration: [
      { id: 'duration-one-day', label: '1日', labelEn: '1 day', sort: 2, enabled: true },
      { id: 'duration-half-day', label: '半日', labelEn: 'Half day', sort: 1, enabled: true }
    ],
    people: [
      { id: 'people-6-plus', label: '6人以上', labelEn: '6+ travelers', sort: 3, enabled: true },
      { id: 'people-1-2', label: '1-2人', labelEn: '1–2 people', sort: 1, enabled: true }
    ]
  }
};

// 1) 适配器：字段规范化、enabled 过滤、空 label 过滤、按 sort 升序、三语保留。
let resolveRequest = null;
const app = { globalData: { apiBase: 'https://content.example' } };
global.getApp = () => app;
let fixture = null;
let currentLocale = 'zh-CN';
global.wx = {
  getStorageSync: (key) => (key === 'sy_mp_locale' ? currentLocale : ''),
  setStorageSync: () => {},
  request: (options) => { resolveRequest = options; return { abort() {} }; },
  showToast: () => {},
  showModal: () => {},
  getWindowInfo: () => ({ statusBarHeight: 24 })
};

const content = loadModule(path.resolve(__dirname, '../data/content.js'));

function loadFixture(payload) {
  fixture = payload;
  return new Promise((resolve) => {
    resolveRequest = null;
    content.loadContent(() => resolve(), true);
    assert(resolveRequest, 'wx.request 应被调用');
    resolveRequest.success({ statusCode: 200, data: fixture });
  });
}

const baseContract = {
  countries: [{ id: 'greece', name: '希腊' }], cities: [], guides: [], routes: [], sampleItineraries: [],
  attractions: [], destinations: [], destinationCategories: [], audioAlbums: [], miniprogramServiceEntries: [], home: {}
};

async function main() {
  await loadFixture({ ...baseContract, vehicleService: vehicleFixture });

  const service = content.getVehicleService();
  assert(service, 'vehicleService 应被适配');
  assert.equal(service.enabled, true);
  assert.equal(service.title, '在地用车资源', 'title 去空格');
  assert.equal(service.titleEn, 'Local transport');
  assert.equal(service.note, '注意事项');
  assert.deepEqual(Array.from(service.tags), ['欧6车型信息', '按需匹配'], 'tags 去空去空格');
  assert.deepEqual(Array.from(service.images), ['https://content.example/images/vehicle-1.jpg', 'https://cdn.example.com/vehicle-2.jpg'], './images 归一化且保留绝对地址');
  assert.deepEqual(Array.from(service.options.vehicle, (item) => item.id), ['vehicle-bmw-suv-5', 'vehicle-business'], '停用/空 label 被过滤并按 sort 升序');
  assert.deepEqual(Array.from(service.options.duration, (item) => item.id), ['duration-half-day', 'duration-one-day']);
  assert.deepEqual(Array.from(service.options.people, (item) => item.id), ['people-1-2', 'people-6-plus']);
  assert.equal(service.options.vehicle[0].labelEn, 'BMW SUV / 5 seats');
  assert(service.form, 'vehicleService.form 应被适配');
  assert.equal(service.form.title, '用车需求表');
  assert.equal(service.form.routeLabel, '路线需求');
  assert.equal(service.form.routeRequired, false);
  assert.equal(service.form.contactWechat, false);
  assert.equal(service.form.dateStart, 'today');
  assert.equal(service.form.dateEnd, '');

  // 表单开关与日期的边界处理：守卫在适配器层完成。
  content.invalidate();
  await loadFixture({ ...baseContract, vehicleService: { ...vehicleFixture, form: { contactPhone: false, contactWechat: false, dateStart: 'soon', dateEnd: '2026-13-99' } } });
  const guarded = content.getVehicleService().form;
  assert.equal(guarded.contactPhone, true, '两种联系方式都关闭时至少保留手机');
  assert.equal(guarded.dateStart, 'today', '非法 dateStart 回退 today');
  assert.equal(guarded.dateEnd, '', '非法 dateEnd 被清除');

  content.invalidate();
  await loadFixture({ ...baseContract, vehicleService: { ...vehicleFixture, form: { ...vehicleFixture.form, dateStart: '2026-10-10', dateEnd: '2026-01-01' } } });
  assert.equal(content.getVehicleService().form.dateEnd, '', 'dateEnd 早于 dateStart 时被清除');

  content.invalidate();
  await loadFixture({ ...baseContract, vehicleService: vehicleFixture });

  // 旧接口（无 vehicleService）与后台禁用：都必须是明确的空值，不能拿本地文案冒充。
  content.invalidate();
  await loadFixture({ ...baseContract });
  assert.equal(content.getVehicleService(), null, '旧接口缺字段时返回 null');

  // 无 form 子对象时仍是 null，页面按本地文案兜底。
  content.invalidate();
  await loadFixture({ ...baseContract, vehicleService: { ...vehicleFixture, form: undefined } });
  assert.equal(content.getVehicleService().form, null, 'form 缺失时为 null');

  content.invalidate();
  await loadFixture({ ...baseContract, vehicleService: { ...vehicleFixture, enabled: false } });
  const disabled = content.getVehicleService();
  assert.equal(disabled.enabled, false, '禁用态仍返回对象，由页面决定显示占位');

  // 2) 页面：文案与选项只来自 vehicleService；未配置时显示占位。
  const translations = i18n.getMessages('zh-CN');
  for (const locale of ['zh-CN', 'zh-TW', 'en']) {
    assert(i18n.getMessages(locale).vehiclePending, `${locale}: vehiclePending 占位文案`);
  }
  assert.equal(i18n.getMessages('zh-CN').vehicleTitle, undefined, '本地 vehicleTitle 已移除');
  assert.equal(i18n.getMessages('en').vehicleNote, undefined, '本地 vehicleNote 已移除');
  const wxml = fs.readFileSync(path.resolve(__dirname, '../pages/vehicle/vehicle.wxml'), 'utf8');
  assert(!wxml.includes('i18n.vehicleTitle') && !wxml.includes('i18n.vehicleNote'), 'WXML 不再使用本地用车文案');
  assert(wxml.includes('i18n.vehiclePending') && wxml.includes('service.title') && wxml.includes('range-key="label"'));
  assert(wxml.includes('mode="multiSelector"') && wxml.includes('bindcolumnchange="onDatePickerColumnChange"'), '日期选择使用动态受限列，历史年份/月不进入可选列表');

  let pageConfig = null;
  let capturedPayload = null;
  const toasts = [];
  const vehicleContentStub = {
    loadContent: (success) => success(vehicleServiceSource, { source: 'remote', status: 'ready' }),
    getVehicleService: () => vehicleServiceSource.vehicleService,
    getSelectedCountryId: () => 'greece',
    getCountries: () => [{ id: 'greece' }],
    countryName: () => '希腊'
  };
  let vehicleServiceSource = { vehicleService: service };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../pages/vehicle/vehicle.js'), 'utf8'), {
    Page: (config) => { pageConfig = config; },
    getApp: () => ({ globalData: { apiBase: 'https://content.example' } }),
    wx: {
      getWindowInfo: () => ({ statusBarHeight: 24 }),
      showToast: (options) => toasts.push(options.title),
      showModal: () => {},
      request: (options) => { capturedPayload = options.data; options.success({ statusCode: 201, header: { 'content-type': 'application/json' }, data: { ok: true } }); }
    },
    require: (name) => {
      if (name.includes('data/content')) return vehicleContentStub;
      if (name.includes('utils/i18n')) return i18n;
      if (name.includes('utils/auth')) return { ensurePhoneBound: (ready) => ready(true, 'token') };
      if (name.includes('utils/share')) return { buildShareCard: () => ({}) };
      if (name.includes('utils/navigation')) return { goBack: () => {} };
      if (name.includes('utils/lead-api')) return { isSuccessfulLeadResponse: () => true, leadErrorMessage: () => 'error' };
      return {};
    }
  });

  // 模拟 WeChat 的 setData：支持 'form.xxx' 这类路径键。
  const applySetData = (target, next) => {
    for (const [key, value] of Object.entries(next)) {
      if (!key.includes('.')) { target[key] = value; continue; }
      const parts = key.split('.');
      let node = target;
      for (let index = 0; index < parts.length - 1; index++) node = node[parts[index]];
      node[parts[parts.length - 1]] = value;
    }
  };

  const makePage = (locale) => {
    currentLocale = locale;
    const instance = {
      ...pageConfig,
      data: { ...structuredClone(pageConfig.data), locale },
      setData(next) { applySetData(this.data, next); }
    };
    return instance;
  };

  const zhPage = makePage('zh-CN');
  zhPage.service = service;
  zhPage.applyLocale();
  assert.equal(zhPage.data.configured, true);
  assert.equal(zhPage.data.service.title, '在地用车资源');
  assert.deepEqual(Array.from(zhPage.data.tags), ['欧6车型信息', '按需匹配']);
  assert.deepEqual(Array.from(zhPage.data.vehicleOptions, (item) => item.label), ['宝马 SUV / 5座', '商务车型']);
  assert.equal(zhPage.data.form.vehicleType, 'vehicle-bmw-suv-5', '默认选中第一项（sort 升序）');
  assert.equal(zhPage.data.form.duration, 'duration-half-day');
  assert.equal(zhPage.data.peopleLabel, '1-2人');
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  assert.equal(zhPage.data.copy.formTitle, '用车需求表', '后台表单标题覆盖本地文案');
  assert.equal(zhPage.data.copy.vehicleLabel, '车型');
  assert.equal(zhPage.data.copy.submitLabel, '提交用车咨询');
  assert.equal(zhPage.data.copy.routeRequired, false, '后台关闭路线必填');
  assert.equal(zhPage.data.copy.showWechat, false, '后台关闭微信联系方式');
  assert.equal(zhPage.data.form.contactType, 'phone', '只保留手机时自动选中手机');
  assert.equal(zhPage.data.dateStart, tomorrowIso, 'dateStart=today 时将可选下限收紧为明天');
  assert.equal(zhPage.data.dateEnd, '2099-12-31', '未配置结束日期时不限制上限');
  const tomorrowParts = tomorrowIso.split('-').map(Number);
  assert(!zhPage.data.datePickerRange[0].includes(`${tomorrowParts[0] - 1}年`), '日期选择器不提供上一年');
  assert.equal(zhPage.data.datePickerRange[0][0], `${tomorrowParts[0]}年`, '年份列从允许日期的年份开始');
  if (tomorrowParts[0] === today.getFullYear()) assert.equal(zhPage.data.datePickerRange[1][0], `${String(tomorrowParts[1]).padStart(2, '0')}月`, '月份列不提供过去月份');
  zhPage.onDateChange({ detail: { value: zhPage.data.datePickerValue } });
  assert.equal(zhPage.data.form.date, tomorrowIso, 'multiSelector 的初始可选值为下限日期');
  zhPage.onDateChange({ detail: { value: todayIso } });
  assert.equal(zhPage.data.form.date, tomorrowIso, '日期变更处理器拒绝今天及历史日期并保留上次合法选择');
  assert(toasts.includes(i18n.getMessages('zh-CN').validation.vehicleDateFuture));

  const staleStartPage = makePage('zh-CN');
  staleStartPage.service = { ...service, form: { ...service.form, dateStart: '2020-01-01' } };
  staleStartPage.applyLocale();
  assert.equal(staleStartPage.data.dateStart, tomorrowIso, '后台配置的历史下限不能开放历史日期');

  const enPage = makePage('en');
  enPage.service = service;
  enPage.applyLocale();
  assert.deepEqual(Array.from(enPage.data.vehicleOptions, (item) => item.label), ['BMW SUV / 5 seats', 'Business vehicle'], '英文走 labelEn');
  assert.deepEqual(Array.from(enPage.data.durationOptions, (item) => item.label), ['Half day', '1 day']);
  assert.equal(enPage.data.peopleOptions[0].label, '1–2 people');
  assert.equal(enPage.data.copy.formTitle, 'Transport request');
  // tipEn 留空时按既有约定回退简体（与一期 Tw/En 回填行为一致）。
  assert.equal(enPage.data.copy.formTip, '提交后 24 小时内联系');

  // 无 form 子对象：整块回退本地 UI 文案与默认开关。
  const fallbackPage = makePage('zh-CN');
  fallbackPage.service = { ...service, form: null };
  fallbackPage.applyLocale();
  const zhForms = i18n.getMessages('zh-CN').forms;
  assert.equal(fallbackPage.data.copy.formTitle, zhForms.vehiclePlan);
  assert.equal(fallbackPage.data.copy.dateLabel, zhForms.vehicleDate);
  assert.equal(fallbackPage.data.copy.routePlaceholder, zhForms.vehicleRoutePlaceholder);
  assert.equal(fallbackPage.data.copy.routeRequired, true, '无 form 时路线默认必填');
  assert.equal(fallbackPage.data.copy.showPhone && fallbackPage.data.copy.showWechat, true);
  assert.equal(fallbackPage.data.dateStart, tomorrowIso);
  assert.equal(fallbackPage.data.dateEnd, '2099-12-31');

  const pendingPage = makePage('zh-CN');
  pendingPage.service = null;
  pendingPage.applyLocale();
  assert.equal(pendingPage.data.configured, false);
  assert.equal(pendingPage.data.service, null);
  assert.deepEqual(Array.from(pendingPage.data.durationOptions), [], '未配置时不显示任何本地选项');
  assert.deepEqual(Array.from(pendingPage.data.tags), []);

  // 提交入口也拒绝历史日期，防止旧状态或非 picker 输入绕过下限。
  capturedPayload = null;
  toasts.length = 0;
  const staleDatePage = makePage('zh-CN');
  staleDatePage.service = service;
  staleDatePage.applyLocale();
  staleDatePage.data.form = { date: todayIso, duration: '', vehicleType: '', people: '', route: '路线', contactType: 'phone', contact: '13800000000' };
  staleDatePage.onSubmit();
  assert.equal(capturedPayload, null, '提交时拒绝历史日期');
  assert.deepEqual(toasts, [i18n.getMessages('zh-CN').validation.vehicleDateFuture]);

  // 3) 提交：label 保持原样，同时回传稳定 id。
  zhPage.data.form = { date: tomorrowIso, duration: 'duration-half-day', vehicleType: 'vehicle-bmw-suv-5', people: 'people-1-2', route: '雅典机场接送', contactType: 'phone', contact: '13800000000' };
  zhPage.data.submitting = false;
  zhPage.onSubmit();
  assert(capturedPayload, '提交时应发出请求');
  assert.equal(capturedPayload.leadType, 'vehicle-consultation');
  assert.equal(capturedPayload.duration, '半日');
  assert.equal(capturedPayload.vehicleType, '宝马 SUV / 5座');
  assert.equal(capturedPayload.travelers, '1-2人');
  assert.equal(capturedPayload.people, '1-2人');
  assert.equal(capturedPayload.durationId, 'duration-half-day');
  assert.equal(capturedPayload.vehicleTypeId, 'vehicle-bmw-suv-5');
  assert.equal(capturedPayload.peopleId, 'people-1-2');
  assert.equal(capturedPayload.bookingDate, tomorrowIso);
  assert.equal(capturedPayload.route, '雅典机场接送');

  // routeRequired=false：路线留空也允许提交。
  capturedPayload = null;
  zhPage.data.form = { ...zhPage.data.form, route: '' };
  zhPage.data.submitting = false;
  zhPage.onSubmit();
  assert(capturedPayload, 'routeRequired=false 时路线留空仍可提交');
  assert.equal(capturedPayload.route, '');

  // routeRequired=true：路线留空被拦截，不发请求。
  capturedPayload = null;
  toasts.length = 0;
  const strictPage = makePage('zh-CN');
  strictPage.service = { ...service, form: { ...service.form, routeRequired: true } };
  strictPage.applyLocale();
  strictPage.data.form = { date: '', duration: '', vehicleType: '', people: '', route: '   ', contactType: 'phone', contact: '13800000000' };
  strictPage.onSubmit();
  assert.equal(capturedPayload, null, '路线必填未通过时不应发请求');
  assert.deepEqual(toasts, [i18n.getMessages('zh-CN').validation.vehicleRoute]);

  // 未选任何选项时（后台未配置选项）不应伪造 label，只提交空串与空 id。
  capturedPayload = null;
  const barePage = makePage('zh-CN');
  barePage.applyLocale();
  barePage.data.form = { date: '', duration: '', vehicleType: '', people: '', route: '需要用车', contactType: 'phone', contact: '13800000000' };
  barePage.onSubmit();
  assert.equal(capturedPayload.vehicleType, '');
  assert.equal(capturedPayload.vehicleTypeId, '');
  assert.equal(capturedPayload.people, '');

  console.log('PASS: vehicleService 适配（缺省/禁用/过滤/排序/三语/图片）+ 页面占位策略 + 选项渲染 + 提交稳定 id');
}

main().catch((error) => { console.error('FAIL:', error && error.message); process.exitCode = 1; });
