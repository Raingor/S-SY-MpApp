// 校验照片远程化开关：默认为空表时行为不变，填表后引用与文件保持一致。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modules = new Map();
function loadModule(filename) {
  const resolved = require.resolve(filename);
  if (modules.has(resolved)) return modules.get(resolved).exports;
  const module = { exports: {} };
  modules.set(resolved, module);
  const localRequire = (id) => id.startsWith('.') ? loadModule(path.resolve(path.dirname(resolved), id)) : require(id);
  vm.runInThisContext('(function(require,module,exports){\n' + fs.readFileSync(resolved, 'utf8') + '\n})', { filename: resolved })(localRequire, module, module.exports);
  return module.exports;
}

const { asset, assetAll, REMOTE_IMAGES } = loadModule(path.join(root, 'utils/asset-url.js'));

assert.equal(asset(''), '', '空值保持空');
assert.equal(asset(undefined), '', '缺省值不产生 src="undefined"');
assert.equal(asset('https://sy-greece.com/images/a.webp'), 'https://sy-greece.com/images/a.webp', '远程地址原样返回');
assert.equal(asset('wxfile://tmp/a.jpg'), 'wxfile://tmp/a.jpg', '本地临时文件原样返回');
assert.deepEqual(assetAll(['a.jpg', '']), ['a.jpg', ''], 'assetAll 保持顺序且不强转空值');

// 填表时必须指向可公开访问的图片；键保留原本地路径，便于回滚时对照。
for (const [local, remote] of Object.entries(REMOTE_IMAGES)) {
  assert.ok(local.startsWith('/assets/images/'), `映射键需为包内图片路径: ${local}`);
  assert.match(remote, /^https:\/\/\S+\.(?:webp|jpe?g|png)(?:\?\S*)?$/i, `映射值需为 https 图片地址: ${remote}`);
}

// 数据层与页面引用：要么走映射，要么包内文件存在，不能出现空地址或死链。
const scanDirs = ['pages', 'data', 'utils', 'components', 'custom-tab-bar'];
const sourceFiles = [];
function walk(rel) {
  for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const next = path.posix.join(rel, entry.name);
    if (entry.isDirectory()) walk(next);
    else if (/\.(?:js|wxml|wxss|json)$/.test(entry.name) && entry.name !== 'asset-url.js') sourceFiles.push(next);
  }
}
scanDirs.forEach(walk);

const referenced = new Set();
for (const file of sourceFiles) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of text.matchAll(/['"(](\/assets\/images\/[^'")\s]+\.(?:jpg|jpeg|png|webp))['")]/gi)) {
    referenced.add(match[1]);
  }
}
assert.ok(referenced.size > 10, `未扫描到页面图片引用: ${referenced.size}`);
for (const imagePath of referenced) {
  if (REMOTE_IMAGES[imagePath]) continue;
  assert.ok(fs.existsSync(path.join(root, imagePath)), `引用本地图片缺失: ${imagePath}`);
}

// 镜像数据与奢享卡片必须经过解析层，且默认仍是原路径。
const mirrorContent = loadModule(path.join(root, 'data/mirror-content.js'));
const mirrorData = mirrorContent.getContent();
const city = mirrorData.cities[0];
assert.ok(city.cover && city.mosaic.length, '镜像城市需带图');
assert.equal(city.cover, asset(city.cover), '城市封面经过解析层');
assert.deepEqual(city.mosaic, city.mosaic.map(asset), '城市拼图经过解析层');
assert.ok(!mirrorData.sampleItineraries.some((item) => !item.img), '行程镜像图不能为空');

const luxury = loadModule(path.join(root, 'data/luxury.js'));
for (const locale of ['zh-CN', 'zh-TW', 'en']) {
  const cards = luxury.getLuxuryCards(locale);
  assert.equal(cards.length, 2, `${locale} 奢享卡数量`);
  cards.forEach((card) => assert.equal(card.img, asset(card.img), `${locale} 奢享卡图片经过解析层`));
  assert.equal(luxury.getLuxuryDetail('jet', locale).image, asset(luxury.getLuxuryDetail('jet', locale).image), `${locale} 包机详情图经过解析层`);
}

const mapped = Object.keys(REMOTE_IMAGES).length;
console.log(`PASS: 远程图片开关 ${mapped} 条映射，${referenced.size} 处引用均可用（默认走包内素材）`);
