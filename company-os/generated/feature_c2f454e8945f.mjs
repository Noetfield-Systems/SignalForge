/**
 * Deterministic assessment of a market source's freshness and provenance.
 * Pure domain logic: no I/O, no network, no side effects.
 * This does NOT verify data independently and does NOT authorize trading.
 */
const VALID_INTERVALS = new Set([15, 60, 240]);
const MAX_STATE_LEN = 80;

function clampState(text) {
  return text.length <= MAX_STATE_LEN ? text : text.slice(0, MAX_STATE_LEN);
}

function isNonNegativeInteger(n) {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

export function assessMarketSourceQuality(input) {
  const tradingAuthorized = false;

  if (input === null || typeof input !== 'object') {
    return {
      state: clampState('invalid input: not an object'),
      researchReady: false,
      tradingAuthorized,
    };
  }

  const {
    ageSeconds,
    intervalMinutes,
    source,
    sourceReportedLive,
    sourceTimestampPresent,
  } = input;

  if (!isNonNegativeInteger(ageSeconds)) {
    return {
      state: clampState('invalid ageSeconds: must be non-negative integer'),
      researchReady: false,
      tradingAuthorized,
    };
  }

  if (!VALID_INTERVALS.has(intervalMinutes)) {
    return {
      state: clampState('invalid intervalMinutes: expected 15, 60 or 240'),
      researchReady: false,
      tradingAuthorized,
    };
  }

  if (source !== 'Kraken public OHLC') {
    return {
      state: clampState('unsupported source: expected Kraken public OHLC'),
      researchReady: false,
      tradingAuthorized,
    };
  }

  if (sourceTimestampPresent !== true) {
    return {
      state: clampState('missing source timestamp: provenance incomplete'),
      researchReady: false,
      tradingAuthorized,
    };
  }

  if (sourceReportedLive !== true) {
    return {
      state: clampState('source not reported live: research only'),
      researchReady: false,
      tradingAuthorized,
    };
  }

  const intervalSeconds = intervalMinutes * 60;
  const staleThreshold = intervalSeconds * 2;

  if (ageSeconds > staleThreshold) {
    return {
      state: clampState(
        `stale: age ${ageSeconds}s exceeds ${staleThreshold}s for ${intervalMinutes}m interval`
      ),
      researchReady: false,
      tradingAuthorized,
    };
  }

  return {
    state: clampState(
      `fresh: age ${ageSeconds}s within ${staleThreshold}s for ${intervalMinutes}m interval`
    ),
    researchReady: true,
    tradingAuthorized,
  };
}
