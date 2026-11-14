const INTERVALS = new Set([15, 60, 240]);
const SOURCE = 'Kraken public OHLC';
const MAX_AGE_BY_INTERVAL = { 15: 15 * 60 * 3, 60: 60 * 60 * 3, 240: 240 * 60 * 3 };

export function assessMarketSourceQuality(input) {
  const reasons = [];
  const ageSeconds = input && input.ageSeconds;
  const intervalMinutes = input && input.intervalMinutes;
  const source = input && input.source;
  const sourceReportedLive = !!(input && input.sourceReportedLive);
  const sourceTimestampPresent = !!(input && input.sourceTimestampPresent);

  if (!Number.isInteger(ageSeconds) || ageSeconds < 0) {
    reasons.push('ageSeconds invalid');
  }
  if (!INTERVALS.has(intervalMinutes)) {
    reasons.push('intervalMinutes unsupported');
  }
  if (source !== SOURCE) {
    reasons.push('source not Kraken public OHLC');
  }
  if (!sourceTimestampPresent) {
    reasons.push('source timestamp missing');
  }
  if (!sourceReportedLive) {
    reasons.push('source not reported live');
  }

  let freshness = 'unknown';
  if (Number.isInteger(ageSeconds) && ageSeconds >= 0 && INTERVALS.has(intervalMinutes)) {
    const limit = MAX_AGE_BY_INTERVAL[intervalMinutes];
    if (ageSeconds <= limit) {
      freshness = 'fresh';
    } else {
      freshness = 'stale';
      reasons.push('age exceeds ' + limit + 's for ' + intervalMinutes + 'm interval');
    }
  }

  const researchReady = reasons.length === 0;
  const state = researchReady
    ? 'research-ready: ' + intervalMinutes + 'm ' + freshness + ' source-reported'
    : 'not-research-ready: ' + reasons.join('; ');

  return {
    state: state.slice(0, 80),
    researchReady,
    tradingAuthorized: false,
  };
}
