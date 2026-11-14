import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMarketSourceQuality } from '../company-os/generated/feature_fd5b7d7dd74f.mjs';

const base = {
  ageSeconds: 120,
  intervalMinutes: 15,
  source: 'Kraken public OHLC',
  sourceReportedLive: true,
  sourceTimestampPresent: true,
};

test('fresh Kraken 15m candle is research-ready and never trading-authorized', () => {
  const r = assessMarketSourceQuality(base);
  assert.equal(r.researchReady, true);
  assert.equal(r.tradingAuthorized, false);
  assert.ok(r.state.length <= 80);
  assert.match(r.state, /research-ready/);
});

test('stale candle beyond 3x interval is not research-ready', () => {
  const r = assessMarketSourceQuality({ ...base, intervalMinutes: 60, ageSeconds: 60 * 60 * 3 + 1 });
  assert.equal(r.researchReady, false);
  assert.equal(r.tradingAuthorized, false);
  assert.match(r.state, /stale|age exceeds/);
});

test('missing source timestamp or wrong source blocks research readiness', () => {
  const noTs = assessMarketSourceQuality({ ...base, sourceTimestampPresent: false });
  assert.equal(noTs.researchReady, false);
  const wrongSource = assessMarketSourceQuality({ ...base, source: 'Binance public OHLC' });
  assert.equal(wrongSource.researchReady, false);
  assert.equal(wrongSource.tradingAuthorized, false);
});

test('invalid interval and negative age are rejected without throwing', () => {
  const r = assessMarketSourceQuality({ ...base, intervalMinutes: 30, ageSeconds: -5 });
  assert.equal(r.researchReady, false);
  assert.equal(r.tradingAuthorized, false);
  assert.ok(r.state.length <= 80);
});
