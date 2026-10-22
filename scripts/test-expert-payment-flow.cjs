// Current policy: expert bundled with city/annual; heritage annual-only; retired products never sold.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness, plain } = require('./helpers/audio-commerce-harness.cjs');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/expert-http-responses.json'), 'utf8'));
const cases = new Map(fixture.cases.map((c) => [c.name, c]));
const config = cases.get('expert_product_default_disabled').response.data;
const metadata = cases.get('public_track_metadata').response.data;
const spot = metadata.attractions[0];
const expert = spot.audioGuides.find((t) => t.category === 'expert');
const ordinary = spot.audioGuides.find((t) => t.category === 'online');
const heritage = metadata.audioAlbums[0].episodes[0];
const products = (p) => Array.from(p.data.unlockOptions, (o) => o.product);

(async () => {
  const h = createHarness(config);
  const expertPage = h.page(expert, spot);
  expertPage.params.cityId = 'untrusted-city-param';
  expertPage.openUnlockPaywall();
  assert.deepEqual(products(expertPage), ['city', 'annualMembership']);
  assert.equal(expertPage.data.unlockOptions[0].priceDisplay, '¥69.90');
  assert.match(expertPage.data.unlockExplanation, /城市包/);
  assert.equal(expertPage.purchaseCityId(), 'fixture-city', 'derive city from the associated sight, never track/URL guesses');
  assert.equal(expertPage.data.unlockOptions[1].priceDisplay, '¥199.00');
  // Click goes through real auth/config/order modules and sends a flat city target.
  await h.replay(cases.get('city_order_created'), () => expertPage.onUnlockOptionTap({ currentTarget: { dataset: { product: 'city' } } }));
  assert.deepEqual(plain(h.requests.filter((r) => r.path === '/api/miniprogram/orders').at(-1).body), { productType: 'city', cityId: 'fixture-city' });
  assert.equal(expertPage.data.access.access, 'preview', 'pending order is not a local access grant');
  assert.equal(expertPage.data.pendingOrder.productType, 'city');
  let rechecks = 0;
  expertPage.refreshAccess = () => { rechecks++; };
  await h.replay(cases.get('city_payment_confirmed'), () => expertPage.onSimulationPay({ currentTarget: { dataset: { outcome: 'paid' } } }));
  assert.equal(rechecks, 1, 'successful payment only rechecks server authorization');
  assert.equal(expertPage.data.access.access, 'preview');

  const historyPage = h.page(heritage);
  historyPage.openUnlockPaywall();
  assert.deepEqual(products(historyPage), ['annualMembership']);
  assert.match(historyPage.data.unlockExplanation, /文史.*年会员/);
  await h.replay(cases.get('annual_order_created'), () => historyPage.onUnlock('annualMembership'));
  const before = h.orderCount();
  for (const product of ['album', 'expertTrack', 'city', 'attraction']) historyPage.onUnlock(product);
  assert.equal(h.orderCount(), before, 'heritage cannot be bought via an obsolete album, expert, sight or city product');

  for (const product of ['expertTrack', 'album', 'attraction']) expertPage.onUnlock(product);
  expertPage.createOrder('expertTrack');
  expertPage.createOrder('album');
  assert.equal(h.orderCount(), before);
  // Retired products stay absent even if a stale/incorrect config advertises enabled=true.
  h.config.products.expertTrack = { enabled: true, price: 39.8, currency: 'CNY' };
  h.config.products.album = { enabled: true, price: 9.9, currency: 'CNY' };
  expertPage.openUnlockPaywall(); historyPage.openUnlockPaywall();
  assert.deepEqual(products(expertPage), ['city', 'annualMembership']);
  assert.deepEqual(products(historyPage), ['annualMembership']);
  for (const product of ['expertTrack', 'album']) h.paid.createOrder(product, {}, (ok, data) => {
    assert.equal(ok, false); assert.equal(data.code, 'PAYMENT_PRODUCT_UNAVAILABLE');
  });
  assert.equal(h.orderCount(), before);

  const ordinaryPage = h.page(ordinary, spot);
  ordinaryPage.openUnlockPaywall();
  assert.deepEqual(products(ordinaryPage), ['attraction', 'city', 'annualMembership']);
  assert.equal(ordinaryPage.data.unlockOptions[0].priceDisplay, '¥9.90');
  await h.replay(cases.get('ordinary_order_created'), () => ordinaryPage.onUnlock('attraction'));

  for (const missingSpot of [null, { ...spot, city: '' }, { ...spot, id: 'other-sight' }]) {
    const p = h.page(expert, missingSpot); p.params.cityId = 'do-not-use'; p.openUnlockPaywall();
    assert.deepEqual(products(p), ['annualMembership']);
    const n = h.orderCount(); p.onUnlock('city'); assert.equal(h.orderCount(), n, 'missing/foreign sight cannot buy a guessed city');
  }
  const fallback = h.page({ ...heritage, unlockMode: 'album' });
  fallback.openUnlockPaywall();
  assert.deepEqual(products(fallback), ['annualMembership'], 'obsolete album mode never resurrects album sales');

  // Prices/enabled are re-read on tap; no hardcoded 69.9/199 and no cached enablement.
  expertPage.openUnlockPaywall();
  for (const price of [0, -1, '', null, undefined, 'bad', Infinity]) {
    h.config.products.city.price = price;
    expertPage.openUnlockPaywall();
    assert.deepEqual(products(expertPage), ['annualMembership']);
    const n = h.orderCount(); expertPage.onUnlock('city'); assert.equal(h.orderCount(), n);
  }
  h.config.products.city = { enabled: false, price: 69.9 };
  const n = h.orderCount(); expertPage.onUnlock('city'); assert.equal(h.orderCount(), n);
  h.config.products.city = { enabled: true, price: 72.34, currency: 'CNY' };
  expertPage.openUnlockPaywall();
  assert.equal(expertPage.data.unlockOptions[0].priceDisplay, '¥72.34');
  h.configOk = false;
  expertPage.openUnlockPaywall(); assert.deepEqual(products(expertPage), []);
  expertPage.onUnlock('city'); assert.equal(h.orderCount(), n);
  h.configOk = true;
  h.setLoggedIn(false); expertPage.onUnlock('city'); assert.equal(h.orderCount(), n); h.setLoggedIn(true);

  // Missing/invalid signature TTL never loops infinitely or plays an unbounded cached URL.
  const fullCase = cases.get('annual_purchase_expert_a_full');
  for (const expiresIn of [undefined, null, 0, -1, 'bad', Infinity]) {
    const c = plain(fullCase); c.name = 'synthetic-invalid-signature-ttl'; c.response.data.expiresIn = expiresIn;
    const p = h.page(expert, spot);
    await h.replay(c, () => p.refreshAccess());
    assert.equal(p._fullUrlIsFresh(p.data.access), false);
    const playedBefore = h.played.length;
    await h.replay(c, () => p.playFull());
    assert.equal(h.played.length, playedBefore, 'one recheck, then fail closed if expiry remains invalid');
    await h.replay(c, () => p.playPreview());
    assert.equal(h.played.length, playedBefore, 'preview button cannot loop or bypass invalid full TTL');
  }
  for (const locale of ['zh-CN', 'zh-TW', 'en']) {
    const copy = h.i18n.getMessages(locale).paidContent;
    assert.ok(copy.buyCity && copy.expertAccess && copy.expertAccessDesc && copy.heritageAccess);
    assert.equal(copy.buyExpert, undefined); assert.equal(copy.buyAlbum, undefined);
  }
  const source = fs.readFileSync(path.join(__dirname, '../pages/audio/detail.js'), 'utf8');
  assert.doesNotMatch(source, /expertTrack|buyExpert|buyAlbum/, 'no expert/album single-sale code in player');
  assert.match(fs.readFileSync(path.join(__dirname, '../pages/audio/album.wxml'), 'utf8'), /paidContent\.heritageAccess/);
  assert.match(fs.readFileSync(path.join(__dirname, '../pages/audio/collection.wxml'), 'utf8'), /paidContent\.expertAccessDesc/);
  assert.equal(h.payments, 0);
  console.log('PASS: city/annual expert plans, annual-only history, exact city targets, retired sales removed, latest config prices/enablement, missing city and invalid TTL fail-safe; no network/payment');
})().catch((error) => { console.error(error); process.exitCode = 1; });
