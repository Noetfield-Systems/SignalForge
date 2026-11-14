import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMarketSourceQuality } from '../company-os/generated/feature_de56e8bbbd7e.mjs';

test('fresh source-reported live data is research ready but never trading authorized', () => {
  const result = assessMarketSourceQuality({
    ageSeconds: 120,
    intervalMinutes: 15,
    source: 'Kraken public OHLC',
    sourceReportedLive: true,
    sourceTimestampPresent: true,
  });
  assert.equal(result.researchReady, true);
  assert.equal(result.tradingAuthorized, false);
  assert.ok(result.state.length <= 80);
});

test('stale data beyond two intervals is not research ready', () => {
  const result = assessMarketSourceQuality({
    ageSeconds: 15 * 60 * 2 + 1,
    intervalMinutes: 15,
    source: 'Kraken public OHLC',
    sourceReportedLive: true,
    sourceTimestampPresent: true,
  });
  assert.equal(result.researchReady, false);
  assert.equal(result.tradingAuthorized, false);
  assert.match(result.state, /stale/);
});

test('missing source timestamp is unusable even if reported live', () => {
  const result = assessMarketSourceQuality({
    ageSeconds: 30,
    intervalMinutes: 60,
    source: 'Kraken public OHLC',
    sourceReportedLive: true,
    sourceTimestampPresent: false,
  });
  assert.equal(result.researchReady, false);
  assert.equal(result.tradingAuthorized, false);
  assert.match(result.state, /timestamp missing/);
});

test('invalid interval is rejected without throwing', () => {
  const result = assessMarketSourceQuality({
    ageSeconds: 10,
    intervalMinutes: 30,
    source: 'Kraken public OHLC',
    sourceReportedLive: true,
    sourceTimestampPresent: true,
  });
  assert.equal(result.researchReady, false);
  assert.equal(result.tradingAuthorized, false);
  assert.match(result.state, /intervalMinutes/);
});
