// Replay captured Website HTTP responses into real MpApp modules; no network or real payments.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness, plain } = require('./helpers/audio-commerce-harness.cjs');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/expert-http-responses.json'), 'utf8'));
assert.equal(fixture.schemaVersion, 2);
assert.equal(fixture.cases.length, 36);
assert.match(fixture.normalisation, /heritage always reports membership/);
const byName = new Map(fixture.cases.map((c) => [c.name, c]));
const h = createHarness(byName.get('expert_product_default_disabled').response.data);
const rawMetadata = byName.get('public_track_metadata').response.data;
const tracks = new Map([
  ...rawMetadata.attractions.flatMap((s) => s.audioGuides || []),
  ...rawMetadata.audioAlbums.flatMap((a) => a.episodes || [])
].map((t) => [t.id, t]));
const spotFor = (track) => rawMetadata.attractions.find((s) => s.id === track.attractionId);
let clientResponses = 0;
let retiredBlocked = 0;
let mediaCases = 0;

(async () => {
  for (const c of fixture.cases) {
    const { method, path: requestPath, body } = c.request;
    const raw = c.response.data;
    if (requestPath === '/api/miniprogram/knowledge/config') {
      h.config = plain(raw);
      await h.replay(c, () => h.paid.fetchConfig((ok, config) => {
        assert.equal(ok, true);
        assert.equal(config.products.expertTrack.enabled, false);
        assert.equal(config.products.album.enabled, false);
      }));
      const expert = h.page(tracks.get('fixture-expert-a'), spotFor(tracks.get('fixture-expert-a')));
      expert.openUnlockPaywall();
      assert.deepEqual(Array.from(expert.data.unlockOptions, (o) => o.product), ['city', 'annualMembership']);
      assert.equal(expert.data.unlockOptions[0].priceDisplay, '¥69.90');
      const heritage = h.page(tracks.get('fixture-heritage-a'));
      heritage.openUnlockPaywall();
      assert.deepEqual(Array.from(heritage.data.unlockOptions, (o) => o.product), ['annualMembership']);
    } else if (requestPath.startsWith('/api/content?')) {
      await h.replay(c, async () => {
        const result = await h.content.fetchContent();
        assert.equal(result.state.status, 'ready');
        const spot = h.content.getAttraction('fixture-attraction', result.data);
        assert.deepEqual(Array.from(spot.audioGuides, (t) => t.unlockMode), ['attraction', 'expert', 'expert']);
        const albums = h.content.getAudioAlbums(result.data);
        assert.equal(albums[0].episodes[0].unlockMode, 'membership');
      });
    } else if (/\/audio\/[^/]+\/access$/.test(requestPath)) {
      const id = requestPath.split('/').at(-2);
      const track = tracks.get(id);
      assert.ok(track, c.name + ': fixture track exists');
      const p = h.page(track, spotFor(track));
      h.setLoggedIn(!c.name.startsWith('anonymous_'));
      await h.replay(c, () => p.refreshAccess());
      h.setLoggedIn(true);
      assert.equal(p.data.access.mode, raw.unlockMode);
      assert.equal(p.data.access.access, raw.access);
      assert.equal(p.data.access.previewSeconds, raw.previewSeconds);
      if (raw.access === 'full') {
        assert.equal(raw.expiresIn, 300, c.name + ': provider full has a bounded signature');
        assert.ok(p.data.access.fullUrlValidUntil > Date.now());
      } else assert.equal(p.data.access.fullUrl, '');
      p.playPreview();
      assert.equal(p.data.fullPlayback, raw.access === 'full', c.name + ': playback follows server authorization');
      assert.equal(p.audio.src, 'https://fixture.invalid' + (raw.access === 'full' ? raw.fullUrl : raw.previewUrl));
      assert.equal(Boolean(p._previewTimer), raw.access !== 'full');
      p.stop();
    } else if (requestPath === '/api/miniprogram/orders' && ['expertTrack', 'album'].includes(body.productType)) {
      // Removed products must be blocked before HTTP; captured provider 422 is the independent backstop.
      assert.equal(c.response.statusCode, 422);
      assert.equal(raw.code, 'PAYMENT_PRODUCT_UNAVAILABLE');
      const before = h.requests.length;
      h.paid.createOrder(body.productType, body, (ok, result) => {
        assert.equal(ok, false); assert.equal(result.code, raw.code);
      });
      assert.equal(h.requests.length, before);
      retiredBlocked++;
      continue;
    } else if (requestPath === '/api/miniprogram/orders') {
      const { productType, ...target } = body;
      await h.replay(c, () => h.paid.createOrder(productType, target, (ok, data) => {
        assert.equal(ok, false, 'simulation is not a real payment success');
        assert.equal(data.pendingSimulation, true);
        assert.equal(data.order.productType, productType);
        assert.equal(data.order.amountTotal, Math.round(data.order.price * 100));
      }));
    } else if (method === 'POST' && requestPath.endsWith('/simulate-paid')) {
      await h.replay(c, () => h.paid.simulateOrderResult(requestPath.split('/').at(-2), 'paid', (ok, data) => {
        assert.equal(ok, true); assert.equal(data.order.status, 'paid');
        if (data.order.productType === 'attraction') assert.deepEqual(plain(data.entitlements.unlockedExpertTracks), []);
        if (data.order.productType === 'city') {
          assert.deepEqual(plain(data.entitlements.unlockedExpertTracks), ['fixture-expert-a', 'fixture-expert-b']);
          assert.deepEqual(plain(data.entitlements.unlockedAlbums), []);
        }
        if (data.order.productType === 'annualMembership') assert.equal(data.entitlements.member, true);
      }));
    } else if (requestPath === '/api/miniprogram/entitlements') {
      await h.replay(c, () => h.paid.fetchEntitlements((ok, result) => {
        assert.equal(ok, true); assert.equal(result.member, raw.member);
        assert.deepEqual(plain(result.unlockedExpertTracks), raw.unlockedExpertTracks);
        assert.deepEqual(plain(result.unlockedAlbums), raw.unlockedAlbums);
        if (c.name === 'city_paid_entitlements') assert.deepEqual(plain(result.unlockedAlbums), []);
        if (c.name === 'expired_annual_entitlements') assert.deepEqual(plain(result.unlockedExpertTracks), []);
      }));
    } else if (requestPath.includes('/full?token=')) {
      // wx audio engine exposes onError, not an HTTP response. Inject the captured status as a media event.
      if (c.name === 'expired_signed_full_rejected') {
        assert.equal(c.response.statusCode, 401); assert.equal(raw.code, 'AUDIO_TOKEN_REQUIRED');
      } else if (c.name === 'old_signed_full_after_revocation_rejected') {
        assert.equal(c.response.statusCode, 403); assert.equal(raw.code, 'AUDIO_ENTITLEMENT_REQUIRED');
      } else { assert.equal(c.response.statusCode, 200); assert.ok(raw.byteLength > 0); }
      const p = h.page(tracks.get('fixture-expert-a'), spotFor(tracks.get('fixture-expert-a')));
      p.data.access = { mode: 'expert', access: 'full', previewUrl: 'https://fixture.invalid/preview', fullUrl: 'https://fixture.invalid' + requestPath, fullUrlValidUntil: Date.now() + 300000 };
      h.mediaResponse = c.response;
      p.playFull();
      h.mediaResponse = null;
      if (c.response.statusCode >= 400) {
        assert.equal(p.data.accessError, true);
        assert.equal(p.data.fullPlayback, false);
        assert.equal(p.data.access, null, 'failed signed URL must not be cached for retry');
        const before = h.played.length;
        await h.replay(byName.get('after_revocation_expert_preview'), () => p.playFull());
        assert.equal(h.played.length, before, 'retry rechecks access and never reuses the rejected URL');
        assert.equal(p.data.showUnlockPaywall, true);
      } else assert.equal(p.data.fullPlayback, true);
      p.stop();
      mediaCases++;
      continue;
    } else throw new Error('Unhandled captured case ' + c.name);
    clientResponses++;
  }
  assert.equal(clientResponses + retiredBlocked + mediaCases, fixture.cases.length);
  assert.equal(h.payments, 0);
  console.log(`PASS: v4 captured HTTP replay covers ${fixture.cases.length} cases (${clientResponses} real-client response paths, ${retiredBlocked} retired-product blocks with provider 422 proof, ${mediaCases} media summaries/error events); city includes expert, heritage annual-only, normalized modes, 401/403 retry; zero network/native payments`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
