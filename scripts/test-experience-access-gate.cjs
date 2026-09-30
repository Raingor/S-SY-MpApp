const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const appSource = fs.readFileSync(require.resolve('../app.js'), 'utf8');
const contentSource = fs.readFileSync(require.resolve('../data/content.js'), 'utf8');

function runApp() {
  let appDefinition;
  let requestCount = 0;
  const wx = {
    getStorageSync: () => '',
    request() { requestCount += 1; },
    reLaunch() {}
  };
  vm.runInNewContext(appSource, {
    App: (definition) => { appDefinition = definition; },
    wx,
    require: (name) => name === './utils/i18n'
      ? { getLocale: () => 'zh-CN' }
      : { invalidate() {} }
  }, { filename: 'app.js' });

  const app = { ...appDefinition, globalData: structuredClone(appDefinition.globalData) };
  app.onLaunch();
  return { app, requestCount };
}

async function runContent() {
  let maintenanceCalls = 0;
  const app = {
    globalData: { apiBase: 'https://sy-greece.com' },
    enterMaintenance() { maintenanceCalls += 1; }
  };
  const payload = {
    settings: { miniprogramAccess: false },
    countries: [], guides: [], cities: [], attractions: [], audioAlbums: [],
    sampleItineraries: [], routes: [], destinations: [], destinationCategories: [],
    heritageGuideBanners: [], miniprogramServiceEntries: [], vehicleService: null,
    attractionDetailPage: null, home: {}
  };
  const module = { exports: {} };
  const wx = {
    getStorageSync: () => 'greece',
    request(options) { options.success({ statusCode: 200, data: payload }); }
  };
  vm.runInNewContext(contentSource, {
    module,
    exports: module.exports,
    require: () => ({ getContent: () => ({}) }),
    getApp: () => app,
    wx
  }, { filename: 'data/content.js' });
  const result = await module.exports.fetchContent();
  return { result, maintenanceCalls };
}

async function main() {
  const { app, requestCount } = runApp();
  assert.equal(typeof app.checkMiniprogramAccess, 'undefined', '全局 access gate 已移除');
  assert.equal(typeof app.enterMaintenance, 'undefined', '客户端维护跳转已移除');
  assert.equal(app.globalData.miniprogramAccess, undefined);
  assert.equal(requestCount, 0, '启动不再请求维护开关接口');

  const content = await runContent();
  assert.equal(content.result.state.status, 'ready', '旧 settings=false 不再阻断公开内容接口');
  assert.equal(content.result.data.settings.miniprogramAccess, false, '旧配置可以保留，但不再执行门禁');
  assert.equal(content.maintenanceCalls, 0, '内容加载不再跳转维护页');
  process.stdout.write('PASS: app startup/content loading no longer enforce the global maintenance gate; auth and business checks remain separate.\n');
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
