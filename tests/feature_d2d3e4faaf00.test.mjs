import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMarketSourceQuality } from '../company-os/generated/feature_d2d3e4faaf00.mjs';

const base = {
  ageSeconds: 120,
  intervalMinutes: 15,
  source: 'Kraken public OHLC',
  sourceReportedLive: true,
  sourceTimestampPresent: true,
};

test('fresh source-reported data is research ready but never trading authorized', () => {
  const out = assessMarketSourceQuality(base);
  assert.equal(out.researchReady, true);
  assert.equal(out.tradingAuthorized, false);
  assert.ok(out.state.length <= 80);
});

test('stale data beyond two intervals is not research ready', () => {
  const out = assessMarketSourceQuality({ ...base, ageSeconds: 15 * 60 * 2 + 1 });
  assert.equal(out.researchReady, false);
  assert.equal(out.tradingAuthorized, false);
  assert.match(out.state, /stale/);
});

test('missing source timestamp blocks research readiness', () => {
  const out = assessMarketSourceQuality({ ...base, sourceTimestampPresent: false });
  assert.equal(out.researchReady, false);
  assert.equal(out.tradingAuthorized, false);
});

test('unsupported interval and unexpected source are rejected', () => {
  assert.equal(assessMarketSourceQuality({ ...base, intervalMinutes: 30 }).researchReady, false);
  assert.equal(assessMarketSourceQuality({ ...base, source: 'Other' }).researchReady, false);
});

test('invalid input never throws and never authorizes trading', () => {
  const out = assessMarketSourceQuality(null);
  assert.equal(out.researchReady, false);
  assert.equal(out.tradingAuthorized, false);
});
