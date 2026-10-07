const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const pagesRoot = path.resolve(__dirname, '../pages');
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filename);
    else if (filename.endsWith('.wxml')) files.push(filename);
  }
}
walk(pagesRoot);

const backButtonPattern = /sy-back-button|audio-back|visitor-detail-back|class="back"/;
const statusOffsetPattern = /height:\s*\{\{statusBarHeight\}\}px|top:\s*\{\{statusBarHeight(?:\s*\+\s*\d+)?\}\}px/;
const checked = [];
for (const filename of files) {
  const markup = fs.readFileSync(filename, 'utf8');
  if (!backButtonPattern.test(markup)) continue;
  assert.match(markup, statusOffsetPattern, `${path.relative(pagesRoot, filename)}: back button must be below the status bar`);
  const scriptPath = filename.replace(/\.wxml$/, '.js');
  const script = fs.readFileSync(scriptPath, 'utf8');
  assert.match(script, /statusBarHeight/, `${path.relative(pagesRoot, filename)}: page must initialize statusBarHeight`);
  checked.push(path.relative(pagesRoot, filename));
}

assert.ok(checked.includes('audio/route.wxml'));
assert.ok(checked.includes('audio/album.wxml'));
console.log(`PASS: ${checked.length} back-button pages have an explicit status-bar offset, including audio route and album details`);
