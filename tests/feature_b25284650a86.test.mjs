import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMarketSourceQuality } from '../company-os/generated/feature_b25284650a86.mjs';

const base = {
  ageSeconds: 120,
  intervalMinutes: 15,
  source: 'Kraken public OHLC',
  sourceReportedLive: true,
  sourceTimestampPresent: true,
};

test('fresh source within one interval is research ready but never trading authorized', () => {
  const r = assessMarketSourceQuality(base);
  assert.equal(r.researchReady, true);
  assert.equal(r.tradingAuthorized, false);
  assert.match(r.state, /fresh/);
  assert.ok(r.state.length <= 80);
});

test('aging source between one and two intervals is research ready', () => {
  const r = assessMarketSourceQuality({ ...base, ageSeconds: 15 * 60 + 1 });
  assert.equal(r.researchReady, true);
  assert.equal(r.tradingAuthorized, false);
  assert.match(r.state, /aging/);
});

test('stale source beyond two intervals is not research ready', () => {
  const r = assessMarketSourceQuality({ ...base, ageSeconds: 15 * 60 * 2 + 1 });
  assert.equal(r.researchReady, false);
  assert.equal(r.tradingAuthorized, false);
  assert.match(r.state, /stale/);
});

test('missing timestamp or non-live source blocks research readiness', () => {
  const noTs = assessMarketSourceQuality({ ...base, sourceTimestampPresent: false });
  assert.equal(noTs.researchReady, false);
  assert.equal(noTs.tradingAuthorized, false);

  const notLive = assessMarketSourceQuality({ ...base, sourceReportedLive: false });
  assert.equal(notLive.researchReady, false);
  assert.equal(notLive.tradingAuthorized, false);
});

test('invalid interval and unexpected source are rejected', () => {
  const badInterval = assessMarketSourceQuality({ ...base, intervalMinutes: 30 });
  assert.equal(badInterval.researchReady, false);
  assert.equal(badInterval.tradingAuthorized, false);

  const badSource = assessMarketSourceQuality({ ...base, source: 'Other exchange' });
  assert.equal(badSource.researchReady, false);
  assert.equal(badSource.tradingAuthorized, false);
});
