const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('pages/index/index.wxml', 'utf8');
const knowledge = fs.readFileSync('pages/knowledge/knowledge.wxml', 'utf8');
const knowledgeJs = fs.readFileSync('pages/knowledge/knowledge.js', 'utf8');
const i18n = fs.readFileSync('utils/i18n.js', 'utf8');

assert.doesNotMatch(index, /product-banner|hot-spot-grid|live-zone card|member-zone card/);
assert.match(knowledge, /knowledge-panel-tabs/);
assert.match(knowledge, /activePanel === 0/);
assert.match(knowledge, /activePanel === 1/);
assert.match(knowledge, /knowledge-product-banner/);
assert.match(knowledge, /knowledge-hot-grid/);
assert.match(knowledge, /knowledge-product-category[^>]*bindtap="onCategoryTap"/);
assert.match(knowledgeJs, /onPanelTap\(e\)/);
assert.match(knowledgeJs, /onCategoryTap\(e\)/);
assert.match(knowledgeJs, /filterHotSpots\(spots, categoryIndex\)/);
assert.match(knowledgeJs, /categoryIndex,\n      hotSpots/);
assert.match(i18n, /originalTab:/);
assert.match(i18n, /newTab:/);

console.log('PASS: knowledge library keeps original panel and hosts new content in a switchable second panel');
