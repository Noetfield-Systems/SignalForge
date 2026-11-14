/**
 * Deterministic assessment of a market data source's freshness and provenance.
 * Pure domain logic: no I/O, no network, no side effects.
 *
 * This function reports what the source itself claims. It does NOT
 * independently verify data and does NOT authorize trading.
 */

const VALID_INTERVALS = new Set([15, 60, 240]);
const EXPECTED_SOURCE = 'Kraken public OHLC';

/**
 * @param {object} input
 * @param {number} input.ageSeconds - age of the newest candle in seconds
 * @param {number} input.intervalMinutes - candle interval (15, 60 or 240)
 * @param {string} input.source - source label
 * @param {boolean} input.sourceReportedLive - source claims live feed
 * @param {boolean} input.sourceTimestampPresent - source provided a timestamp
 * @returns {{state: string, researchReady: boolean, tradingAuthorized: false}}
 */
export function assessMarketSourceQuality(input) {
  const result = (state, researchReady) => ({
    state: state.slice(0, 80),
    researchReady,
    tradingAuthorized: false,
  });

  if (input === null || typeof input !== 'object') {
    return result('invalid input: not an object', false);
  }

  const { ageSeconds, intervalMinutes, source, sourceReportedLive, sourceTimestampPresent } = input;

  if (!Number.isInteger(ageSeconds) || ageSeconds < 0) {
    return result('invalid ageSeconds', false);
  }
  if (!VALID_INTERVALS.has(intervalMinutes)) {
    return result('unsupported intervalMinutes', false);
  }
  if (source !== EXPECTED_SOURCE) {
    return result('unexpected source label', false);
  }
  if (typeof sourceReportedLive !== 'boolean' || typeof sourceTimestampPresent !== 'boolean') {
    return result('invalid source flags', false);
  }
  if (!sourceTimestampPresent) {
    return result('missing source timestamp', false);
  }
  if (!sourceReportedLive) {
    return result('source not reported live', false);
  }

  // Staleness budget: allow up to two intervals of lag before flagging stale.
  const staleAfterSeconds = intervalMinutes * 60 * 2;
  if (ageSeconds > staleAfterSeconds) {
    return result('stale: age exceeds two intervals', false);
  }

  return result('fresh source-reported data', true);
}
