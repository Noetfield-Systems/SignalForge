/**
 * Deterministic assessment of a market data source's freshness and provenance.
 * Pure domain logic: no I/O, no network, no side effects.
 * This does NOT verify data independently and does NOT authorize trading.
 */

const ALLOWED_INTERVALS = new Set([15, 60, 240]);
const EXPECTED_SOURCE = 'Kraken public OHLC';

/**
 * @param {object} input
 * @param {number} input.ageSeconds integer seconds since source timestamp
 * @param {number} input.intervalMinutes 15 | 60 | 240
 * @param {string} input.source
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
    return result('invalid ageSeconds: must be non-negative integer', false);
  }
  if (!ALLOWED_INTERVALS.has(intervalMinutes)) {
    return result('invalid intervalMinutes: must be 15, 60 or 240', false);
  }
  if (source !== EXPECTED_SOURCE) {
    return result('unexpected source: not Kraken public OHLC', false);
  }
  if (sourceTimestampPresent !== true) {
    return result('missing source timestamp: provenance incomplete', false);
  }
  if (sourceReportedLive !== true) {
    return result('source not reported live: research only', false);
  }

  // Freshness budget: one interval plus a small grace window.
  const intervalSeconds = intervalMinutes * 60;
  const graceSeconds = Math.max(60, Math.floor(intervalSeconds * 0.1));
  const budgetSeconds = intervalSeconds + graceSeconds;

  if (ageSeconds > budgetSeconds) {
    return result(
      `stale: age ${ageSeconds}s exceeds ${budgetSeconds}s budget`,
      false
    );
  }

  return result(
    `fresh: age ${ageSeconds}s within ${budgetSeconds}s budget`,
    true
  );
}
