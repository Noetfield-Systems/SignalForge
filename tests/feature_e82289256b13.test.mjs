import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMarketSourceQuality } from '../company-os/generated/feature_e82289256b13.mjs';

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
  assert.match(out.state, /stale/i);
});

test('missing timestamp or unsupported interval is rejected', () => {
  const noTs = assessMarketSourceQuality({ ...base, sourceTimestampPresent: false });
  assert.equal(noTs.researchReady, false);
  assert.equal(noTs.tradingAuthorized, false);

  const badInterval = assessMarketSourceQuality({ ...base, intervalMinutes: 30 });
  assert.equal(badInterval.researchReady, false);
  assert.equal(badInterval.tradingAuthorized, false);
});

test('edge: exactly at staleness boundary is still research ready', () => {
  const out = assessMarketSourceQuality({ ...base, ageSeconds: 15 * 60 * 2 });
  assert.equal(out.researchReady, true);
  assert.equal(out.tradingAuthorized, false);
});
