/**
 * Deterministic assessment of a market data source's freshness and provenance.
 * Pure domain logic: no I/O, no network, no side effects.
 *
 * This function does NOT verify data independently and does NOT authorize
 * trading. It only classifies the reported source metadata into a research
 * readiness state.
 */

const VALID_INTERVALS = new Set([15, 60, 240]);
const EXPECTED_SOURCE = 'Kraken public OHLC';

/**
 * @param {object} input
 * @param {number} input.ageSeconds - integer seconds since source timestamp
 * @param {number} input.intervalMinutes - 15 | 60 | 240
 * @param {string} input.source - expected 'Kraken public OHLC'
 * @param {boolean} input.sourceReportedLive
 * @param {boolean} input.sourceTimestampPresent
 * @returns {{state:string, researchReady:boolean, tradingAuthorized:false}}
 */
export function assessMarketSourceQuality(input) {
  const result = (state, researchReady) => ({
    state: String(state).slice(0, 80),
    researchReady: Boolean(researchReady),
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
    return result('unexpected source', false);
  }
  if (typeof sourceReportedLive !== 'boolean' || typeof sourceTimestampPresent !== 'boolean') {
    return result('invalid boolean flags', false);
  }
  if (!sourceTimestampPresent) {
    return result('missing source timestamp', false);
  }
  if (!sourceReportedLive) {
    return result('source not reported live', false);
  }

  // Staleness budget: allow up to 2 intervals of lag before flagging stale.
  const staleAfterSeconds = intervalMinutes * 60 * 2;
  if (ageSeconds > staleAfterSeconds) {
    return result('stale source data', false);
  }

  return result('fresh source-reported data', true);
}
