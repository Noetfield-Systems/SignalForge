import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMarketSourceQuality } from '../company-os/generated/feature_c2f454e8945f.mjs';

const base = {
  ageSeconds: 120,
  intervalMinutes: 15,
  source: 'Kraken public OHLC',
  sourceReportedLive: true,
  sourceTimestampPresent: true,
};

test('fresh source within threshold is research ready but never trading authorized', () => {
  const result = assessMarketSourceQuality(base);
  assert.equal(result.researchReady, true);
  assert.equal(result.tradingAuthorized, false);
  assert.ok(result.state.length <= 80);
  assert.match(result.state, /fresh/);
});

test('stale source beyond two intervals is not research ready', () => {
  const result = assessMarketSourceQuality({ ...base, ageSeconds: 15 * 60 * 2 + 1 });
  assert.equal(result.researchReady, false);
  assert.equal(result.tradingAuthorized, false);
  assert.match(result.state, /stale/);
});

test('missing source timestamp blocks research readiness', () => {
  const result = assessMarketSourceQuality({ ...base, sourceTimestampPresent: false });
  assert.equal(result.researchReady, false);
  assert.equal(result.tradingAuthorized, false);
  assert.match(result.state, /timestamp/);
});

test('invalid interval is rejected with bounded state', () => {
  const result = assessMarketSourceQuality({ ...base, intervalMinutes: 30 });
  assert.equal(result.researchReady, false);
  assert.equal(result.tradingAuthorized, false);
  assert.ok(result.state.length <= 80);
});

test('non-object input is handled safely', () => {
  const result = assessMarketSourceQuality(null);
  assert.equal(result.researchReady, false);
  assert.equal(result.tradingAuthorized, false);
  assert.ok(result.state.length <= 80);
});
