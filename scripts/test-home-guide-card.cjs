// 首页「名人导游推荐」卡片：后台 guides.proof 简介必须全文展示（不再单行省略）。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const wxss = fs.readFileSync(path.join(ROOT, 'pages/index/index.wxss'), 'utf8');
const wxml = fs.readFileSync(path.join(ROOT, 'pages/index/index.wxml'), 'utf8');

const proofBlock = wxss.match(/\.guide-entry-proof\s*\{[^}]*\}/);
assert.ok(proofBlock, 'guide-entry-proof 样式必须存在');
const proofCss = proofBlock[0];
assert.ok(!/white-space\s*:\s*nowrap/.test(proofCss), '简介不再强制单行（去掉 white-space: nowrap）');
assert.ok(!/text-overflow\s*:\s*ellipsis/.test(proofCss), '简介不再使用省略号截断');
assert.ok(/overflow-wrap\s*:\s*anywhere/.test(proofCss), '长英文/无空格内容可换行');

// 卡片要有足够高度容纳全文；CTA 依靠 margin-top:auto 固定在底部。
const entryBlock = wxss.match(/\.guide-entry\s*\{[^}]*\}/);
const swiperBlock = wxss.match(/\.guide-swiper\s*\{[^}]*\}/);
const entryHeight = Number((entryBlock[0].match(/height\s*:\s*(\d+)rpx/) || [])[1]);
const swiperHeight = Number((swiperBlock[0].match(/height\s*:\s*(\d+)rpx/) || [])[1]);
assert.ok(entryHeight >= 300, `卡片高度需容纳多行简介（当前 ${entryHeight}rpx）`);
assert.ok(swiperHeight >= entryHeight, '轮播高度不得小于卡片高度');
const ctaBlock = wxss.match(/\.guide-entry-cta\s*\{[^}]*\}/);
assert.ok(/margin-top\s*:\s*auto/.test(ctaBlock[0]), 'CTA 保持贴底且不挤压简介空间');

// 简介数据仍完全来自后台 guides.proof。
assert.ok(wxml.includes('{{item.proof}}'), '首页卡片简介必须来自后台 guides.proof 字段');
assert.equal((wxml.match(/guide-entry-proof/g) || []).length, 1, '仅一处简介渲染点');

// 后台 proof 为空时不渲染残留标记（ 由后端字段驱动，页面不做兜底文案）。
for (const fallback of ['资深定制', '武汉大学']) {
  assert.ok(!wxml.includes(fallback) && !wxss.includes(fallback), `页面不得硬编码简介文案（${fallback}）`);
}

console.log('PASS: 首页名人导游卡片完整展示后台简介（多行、无截断），高度与贴底 CTA 适配，数据仍来自后台 guides.proof');
