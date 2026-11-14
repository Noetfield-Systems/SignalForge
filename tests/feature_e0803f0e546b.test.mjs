import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMarketSourceQuality } from '../company-os/generated/feature_e0803f0e546b.mjs';

const base = {
  ageSeconds: 120,
  intervalMinutes: 15,
  source: 'Kraken public OHLC',
  sourceReportedLive: true,
  sourceTimestampPresent: true,
};

test('fresh source-reported data is research ready but never trading authorized', () => {
  const r = assessMarketSourceQuality(base);
  assert.equal(r.researchReady, true);
  assert.equal(r.tradingAuthorized, false);
  assert.ok(r.state.length <= 80);
});

test('stale data beyond two intervals is not research ready', () => {
  const r = assessMarketSourceQuality({ ...base, ageSeconds: 15 * 60 * 2 + 1 });
  assert.equal(r.researchReady, false);
  assert.equal(r.tradingAuthorized, false);
  assert.ok(r.state.length <= 80);
});

test('missing timestamp or unrecognized source is rejected', () => {
  const noTs = assessMarketSourceQuality({ ...base, sourceTimestampPresent: false });
  assert.equal(noTs.researchReady, false);
  const badSrc = assessMarketSourceQuality({ ...base, source: 'unknown feed' });
  assert.equal(badSrc.researchReady, false);
  assert.equal(badSrc.tradingAuthorized, false);
});

test('edge: unsupported interval and invalid age are rejected', () => {
  const badInterval = assessMarketSourceQuality({ ...base, intervalMinutes: 30 });
  assert.equal(badInterval.researchReady, false);
  const badAge = assessMarketSourceQuality({ ...base, ageSeconds: -1 });
  assert.equal(badAge.researchReady, false);
  assert.equal(badAge.tradingAuthorized, false);
});
