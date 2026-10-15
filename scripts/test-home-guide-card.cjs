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

// 卡片高度改为按内容自适应（去掉固定高度），仍需容纳多行简介。
const entryBlock = wxss.match(/\.guide-entry\s*\{[^}]*\}/);
assert.ok(entryBlock, 'guide-entry 样式必须存在');
assert.ok(!/height\s*:\s*\d+rpx/.test(entryBlock[0]), '单卡布局不再固定高度，简介多行时自然撑开');
assert.ok(!wxml.includes('guide-swiper'), '首页不再使用轮播样式展示导游名片');
assert.ok(!wxml.includes('guide-entry-avatar'), '首页名片不再渲染导师头像');
const ctaBlock = wxss.match(/\.guide-entry-cta\s*\{[^}]*\}/);
assert.ok(/margin-top\s*:\s*\d+rpx/.test(ctaBlock[0]), 'CTA 位于简介下方，保持自然间距');

// 简介数据仍完全来自后台 guides.proof。
assert.ok(wxml.includes('{{item.proof}}'), '首页卡片简介必须来自后台 guides.proof 字段');
assert.equal((wxml.match(/guide-entry-proof/g) || []).length, 1, '仅一处简介渲染点');

// 后台 proof 为空时不渲染残留标记（ 由后端字段驱动，页面不做兜底文案）。
for (const fallback of ['资深定制', '武汉大学']) {
  assert.ok(!wxml.includes(fallback) && !wxss.includes(fallback), `页面不得硬编码简介文案（${fallback}）`);
}

console.log('PASS: 首页导游名片为无头像单卡（非轮播），简介全文展示且数据来自后台 guides.proof');
