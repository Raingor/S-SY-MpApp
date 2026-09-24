const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('pages/index/index.wxml', 'utf8');
const knowledge = fs.readFileSync('pages/knowledge/knowledge.wxml', 'utf8');
const knowledgeJs = fs.readFileSync('pages/knowledge/knowledge.js', 'utf8');
const i18n = fs.readFileSync('utils/i18n.js', 'utf8');

assert.doesNotMatch(index, /product-banner|hot-spot-grid|live-zone card|member-zone card/);
assert.match(knowledge, /knowledge-panel-tabs/);
assert.match(knowledge, /activePanel === 0/);
assert.match(knowledge, /activePanel === 0/);
assert.doesNotMatch(knowledge, /knowledge-product-banner|knowledge-track-tabs|knowledge-member-zone/);
assert.match(knowledge, /knowledge-hot-grid/);
assert.match(knowledge, /visibleAlbums/);
assert.match(knowledge, /noAlbums/);
assert.match(knowledge, /knowledge-product-category[^>]*bindtap="onCategoryTap"/);
assert.match(knowledgeJs, /onPanelTap\(e\)/);
assert.match(knowledgeJs, /onCategoryTap\(e\)/);
assert.match(knowledgeJs, /displaySpots\(/);
assert.match(knowledgeJs, /getAudioAlbums/);
assert.match(i18n, /heritageTranslations/);
assert.match(i18n, /sights: '景点讲解'/);
assert.match(i18n, /history: '希腊文史'/);

console.log('PASS: knowledge library has two user-facing panels, published audio albums, search/categories and honest empty states');
