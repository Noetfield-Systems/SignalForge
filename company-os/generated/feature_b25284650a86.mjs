/**
 * Deterministic assessment of a market data source's freshness and provenance.
 * Pure domain logic: no I/O, no network, no side effects.
 * This does NOT verify data independently and does NOT authorize trading.
 */
const VALID_INTERVALS = new Set([15, 60, 240]);
const EXPECTED_SOURCE = 'Kraken public OHLC';

function isNonNegativeInteger(n) {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

export function assessMarketSourceQuality(input) {
  const tradingAuthorized = false;

  if (input === null || typeof input !== 'object') {
    return { state: 'invalid input: not an object', researchReady: false, tradingAuthorized };
  }

  const { ageSeconds, intervalMinutes, source, sourceReportedLive, sourceTimestampPresent } = input;

  if (!isNonNegativeInteger(ageSeconds)) {
    return { state: 'invalid input: ageSeconds must be a non-negative integer', researchReady: false, tradingAuthorized };
  }
  if (!VALID_INTERVALS.has(intervalMinutes)) {
    return { state: 'invalid input: intervalMinutes must be 15, 60 or 240', researchReady: false, tradingAuthorized };
  }
  if (source !== EXPECTED_SOURCE) {
    return { state: 'unexpected source: not Kraken public OHLC', researchReady: false, tradingAuthorized };
  }
  if (typeof sourceReportedLive !== 'boolean' || typeof sourceTimestampPresent !== 'boolean') {
    return { state: 'invalid input: live/timestamp flags must be boolean', researchReady: false, tradingAuthorized };
  }
  if (!sourceTimestampPresent) {
    return { state: 'missing source timestamp: provenance incomplete', researchReady: false, tradingAuthorized };
  }
  if (!sourceReportedLive) {
    return { state: 'source reports not live: stale feed', researchReady: false, tradingAuthorized };
  }

  const intervalSeconds = intervalMinutes * 60;
  const staleThreshold = intervalSeconds * 2;

  if (ageSeconds > staleThreshold) {
    return { state: 'stale: age exceeds two intervals', researchReady: false, tradingAuthorized };
  }
  if (ageSeconds > intervalSeconds) {
    return { state: 'aging: age exceeds one interval', researchReady: true, tradingAuthorized };
  }
  return { state: 'fresh: within one interval', researchReady: true, tradingAuthorized };
}
