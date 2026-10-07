const assert = require('node:assert/strict');
const fs = require('node:fs');

const itineraryWxml = fs.readFileSync('pages/itinerary/index.wxml', 'utf8');
const itineraryWxss = fs.readFileSync('pages/itinerary/index.wxss', 'utf8');
const guideWxml = fs.readFileSync('pages/guide/guide.wxml', 'utf8');
const guideWxss = fs.readFileSync('pages/guide/guide.wxss', 'utf8');
const i18n = fs.readFileSync('utils/i18n.js', 'utf8');

assert.match(itineraryWxml, /class="iti-foot"/);
assert.match(itineraryWxml, /class="iti-cta">\{\{i18n\.itineraryPage\.cta\}\}/);
assert.match(itineraryWxml, /class="iti-crowd(?: ellipsis-2)?">\{\{item\.crowd\}\}/);
assert.match(itineraryWxss, /\.iti-foot\s*\{[^}]*flex-wrap:\s*wrap;[^}]*justify-content:\s*flex-start;/s);
assert.match(itineraryWxss, /\.iti-crowd\s*\{[^}]*min-width:\s*0;[^}]*text-align:\s*left;[^}]*overflow-wrap:\s*break-word;/s);

assert.match(guideWxml, /class="guide-service-card guide-service-offline card" bindtap="onOfflineGuideTap"/);
assert.match(guideWxml, /class="guide-service-card guide-service-live card" bindtap="onLiveGuideTap"/);
assert.match(guideWxml, /class="guide-service-cta">\{\{i18n\.guide\.services\.offlineCta\}\}/);
assert.match(guideWxml, /class="guide-service-cta">\{\{i18n\.guide\.services\.liveCta\}\}/);
assert.match(guideWxss, /\.guide-service-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s);
assert.match(guideWxss, /\.guide-service-offline\s*\{[^}]*min-height:\s*0;[^}]*background:\s*#C6A15B;/s);
const offlineCtaRule = guideWxss.match(/\.guide-service-offline \.guide-service-cta\s*\{([^}]*)\}/s)?.[1] || '';
assert.match(offlineCtaRule, /background:\s*#09253A;/);
assert.match(offlineCtaRule, /width:\s*100%;/);
assert.match(offlineCtaRule, /overflow-wrap:\s*break-word;/);
assert.match(guideWxss, /\.guide-service-live\s*\{[^}]*background:\s*linear-gradient\(145deg, #0B3C5D, #1567A8\);/s);
assert.match(guideWxss, /\.guide-service-live \.guide-service-cta\s*\{[^}]*color:\s*#E2C47F;/s);
assert.match(i18n, /offlineTitle: '线下陪同讲解'/);
assert.match(i18n, /offlineDesc: '提交意向日期与路线，由顾问确认线下陪同安排。'/);
assert.match(i18n, /offlineCta: '填写日期，预约陪同'/);
console.log('PASS: itinerary CTA/copy/navigation retained with left-aligned wrapping; offline service spans its full row as gold/navy block; live card CSS/copy/handler retained');
