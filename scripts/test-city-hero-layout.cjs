const assert = require('node:assert/strict');
const fs = require('node:fs');

const markup = fs.readFileSync('pages/city/index.wxml', 'utf8');
const styles = fs.readFileSync('pages/city/index.wxss', 'utf8');
const page = fs.readFileSync('pages/city/index.js', 'utf8');

assert.match(markup, /class="city-cover-hero"/);
assert.match(markup, /class="city-cover-image"[^>]*src="\{\{city\.coverImage\}\}"/);
assert.match(markup, /class="city-title serif">\{\{city\.name\}\}/);
assert.doesNotMatch(markup, /mosaic-grid|wx:for="\{\{city\.mosaic\}\}"/);
assert.match(page, /imageUrl:\s*city\s*\?\s*city\.coverImage\s*:\s*undefined/);
assert.match(styles, /\.city-cover-hero\s*\{[^}]*min-height:\s*510rpx;/s);
assert.match(styles, /\.city-cover-image\s*\{[^}]*height:\s*510rpx;/s);

console.log('PASS: city page uses the Website single cover image (never the mosaic) and keeps its title visible');
