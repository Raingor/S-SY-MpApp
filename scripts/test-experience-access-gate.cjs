const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const appSource = fs.readFileSync(require.resolve('../app.js'), 'utf8');

async function runAppGate(envVersion) {
  let appDefinition;
  let requestCount = 0;
  const redirects = [];
  const wx = {
    getAccountInfoSync: () => ({ miniProgram: { envVersion } }),
    getStorageSync: () => '',
    request(options) {
      requestCount += 1;
      options.success({ statusCode: 200, data: { accessEnabled: false, title: '正在升级中' } });
      if (options.complete) options.complete();
    },
    reLaunch(options) {
      redirects.push(options.url);
      if (options.complete) options.complete();
    }
  };

  vm.runInNewContext(appSource, {
    App: (definition) => { appDefinition = definition; },
    wx,
    require: () => ({ getLocale: () => 'zh-CN' }),
    setInterval: () => 1,
    getCurrentPages: () => [{ route: 'pages/index/index' }]
  }, { filename: 'app.js' });

  const app = { ...appDefinition, globalData: structuredClone(appDefinition.globalData) };
  app.onLaunch();
  const accessResult = await app.checkMiniprogramAccess();
  return { app, accessResult, requestCount, redirects };
}

async function runContentGate() {
  let maintenanceCalls = 0;
  const app = {
    globalData: { apiBase: 'https://sy-greece.com', skipMiniprogramAccessCheck: true },
    enterMaintenance() { maintenanceCalls += 1; }
  };
  const payload = {
    settings: { miniprogramAccess: false },
    countries: [], guides: [], cities: [], attractions: [], audioAlbums: [],
    sampleItineraries: [], routes: [], destinations: [], destinationCategories: [],
    heritageGuideBanners: [], miniprogramServiceEntries: [], attractionDetailPage: null, home: {}
  };
  const module = { exports: {} };
  const wx = {
    getStorageSync: () => 'greece',
    request(options) {
      options.success({ statusCode: 200, data: payload });
    }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../data/content.js'), 'utf8'), {
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
  const trial = await runAppGate('trial');
  assert.equal(trial.app.globalData.skipMiniprogramAccessCheck, true);
  assert.equal(trial.accessResult, true);
  assert.equal(trial.requestCount, 0, 'experience build must not request the backend access switch');
  assert.deepEqual(trial.redirects, []);

  for (const envVersion of ['develop', 'release']) {
    const controlled = await runAppGate(envVersion);
    assert.equal(controlled.app.globalData.skipMiniprogramAccessCheck, false);
    assert.equal(controlled.requestCount, 1, `${envVersion} must still request the backend access switch`);
    assert.equal(controlled.accessResult, false);
    assert.deepEqual(controlled.redirects, ['/pages/maintenance/maintenance']);
  }

  const content = await runContentGate();
  assert.equal(content.result.state.status, 'ready', 'experience content must load when backend access is disabled');
  assert.equal(content.maintenanceCalls, 0, 'experience content must not enter maintenance from /api/content settings');
  process.stdout.write('PASS: trial bypasses both backend maintenance gates; develop and release remain controlled.\n');
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
