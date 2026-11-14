import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMarketSourceQuality } from '../company-os/generated/feature_d5a6576c5244.mjs';

const base = {
  ageSeconds: 120,
  intervalMinutes: 60,
  source: 'Kraken public OHLC',
  sourceReportedLive: true,
  sourceTimestampPresent: true,
};

test('fresh live Kraken OHLC is research ready but never trading authorized', () => {
  const out = assessMarketSourceQuality(base);
  assert.equal(out.researchReady, true);
  assert.equal(out.tradingAuthorized, false);
  assert.match(out.state, /^fresh:/);
  assert.ok(out.state.length <= 80);
});

test('stale data beyond interval budget is not research ready', () => {
  const out = assessMarketSourceQuality({ ...base, ageSeconds: 60 * 60 + 3600 });
  assert.equal(out.researchReady, false);
  assert.equal(out.tradingAuthorized, false);
  assert.match(out.state, /^stale:/);
});

test('missing timestamp or non-live source blocks research readiness', () => {
  const noTs = assessMarketSourceQuality({ ...base, sourceTimestampPresent: false });
  assert.equal(noTs.researchReady, false);
  assert.match(noTs.state, /timestamp/);

  const notLive = assessMarketSourceQuality({ ...base, sourceReportedLive: false });
  assert.equal(notLive.researchReady, false);
  assert.match(notLive.state, /not reported live/);
});

test('invalid interval and unexpected source are rejected', () => {
  const badInterval = assessMarketSourceQuality({ ...base, intervalMinutes: 30 });
  assert.equal(badInterval.researchReady, false);
  assert.match(badInterval.state, /intervalMinutes/);

  const badSource = assessMarketSourceQuality({ ...base, source: 'Unknown feed' });
  assert.equal(badSource.researchReady, false);
  assert.match(badSource.state, /unexpected source/);
});

test('non-object and negative age inputs are handled safely', () => {
  const nullOut = assessMarketSourceQuality(null);
  assert.equal(nullOut.researchReady, false);
  assert.equal(nullOut.tradingAuthorized, false);

  const negOut = assessMarketSourceQuality({ ...base, ageSeconds: -5 });
  assert.equal(negOut.researchReady, false);
  assert.match(negOut.state, /ageSeconds/);
});
