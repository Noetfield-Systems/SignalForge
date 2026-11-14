import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMarketSourceQuality } from '../company-os/generated/feature_8ea89640c000.mjs';

const base = {
  ageSeconds: 120,
  intervalMinutes: 60,
  source: 'Kraken public OHLC',
  sourceReportedLive: true,
  sourceTimestampPresent: true,
};

test('fresh timestamped Kraken OHLC is research ready and never trading authorized', () => {
  const r = assessMarketSourceQuality(base);
  assert.equal(r.researchReady, true);
  assert.equal(r.tradingAuthorized, false);
  assert.ok(r.state.length <= 80);
});

test('missing source timestamp blocks research readiness', () => {
  const r = assessMarketSourceQuality({ ...base, sourceTimestampPresent: false });
  assert.equal(r.researchReady, false);
  assert.equal(r.tradingAuthorized, false);
  assert.match(r.state, /timestamp/);
});

test('stale data beyond 3x interval window is rejected', () => {
  const r = assessMarketSourceQuality({ ...base, ageSeconds: 60 * 60 * 4 });
  assert.equal(r.researchReady, false);
  assert.match(r.state, /freshness/);
});

test('unsupported interval and wrong source are rejected', () => {
  const r = assessMarketSourceQuality({ ...base, intervalMinutes: 30, source: 'other' });
  assert.equal(r.researchReady, false);
  assert.equal(r.tradingAuthorized, false);
});

test('non-object input is safely rejected', () => {
  const r = assessMarketSourceQuality(null);
  assert.equal(r.researchReady, false);
  assert.equal(r.tradingAuthorized, false);
});
