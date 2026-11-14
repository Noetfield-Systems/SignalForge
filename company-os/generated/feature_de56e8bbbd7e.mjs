/**
 * Deterministic assessment of a market data source's quality for research use.
 * Pure function: no I/O, no network, no side effects.
 *
 * This does NOT verify data independently and does NOT authorize trading.
 */
export function assessMarketSourceQuality(input) {
  const allowedIntervals = [15, 60, 240];
  const allowedSources = ['Kraken public OHLC'];

  const ageSeconds = input && input.ageSeconds;
  const intervalMinutes = input && input.intervalMinutes;
  const source = input && input.source;
  const sourceReportedLive = input && input.sourceReportedLive;
  const sourceTimestampPresent = input && input.sourceTimestampPresent;

  // Structural validation
  if (!Number.isInteger(ageSeconds) || ageSeconds < 0) {
    return {
      state: 'invalid: ageSeconds must be a non-negative integer',
      researchReady: false,
      tradingAuthorized: false,
    };
  }
  if (!allowedIntervals.includes(intervalMinutes)) {
    return {
      state: 'invalid: intervalMinutes must be 15, 60 or 240',
      researchReady: false,
      tradingAuthorized: false,
    };
  }
  if (!allowedSources.includes(source)) {
    return {
      state: 'invalid: unsupported source',
      researchReady: false,
      tradingAuthorized: false,
    };
  }
  if (typeof sourceReportedLive !== 'boolean' || typeof sourceTimestampPresent !== 'boolean') {
    return {
      state: 'invalid: source flags must be boolean',
      researchReady: false,
      tradingAuthorized: false,
    };
  }

  // Freshness budget: allow up to 2 intervals of staleness before flagging.
  const freshnessBudgetSeconds = intervalMinutes * 60 * 2;
  const stale = ageSeconds > freshnessBudgetSeconds;

  if (!sourceTimestampPresent) {
    return {
      state: 'unusable: source timestamp missing',
      researchReady: false,
      tradingAuthorized: false,
    };
  }
  if (!sourceReportedLive) {
    return {
      state: 'degraded: source not reported live',
      researchReady: false,
      tradingAuthorized: false,
    };
  }
  if (stale) {
    return {
      state: 'stale: age ' + ageSeconds + 's exceeds ' + freshnessBudgetSeconds + 's budget',
      researchReady: false,
      tradingAuthorized: false,
    };
  }

  return {
    state: 'ok: fresh source-reported live data',
    researchReady: true,
    tradingAuthorized: false,
  };
}
