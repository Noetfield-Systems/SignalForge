/**
 * Deterministic assessment of a market data source's freshness and provenance.
 * Pure domain logic only. Does NOT verify data independently and does NOT
 * authorize trading. Returns a bounded state string and research readiness.
 */
export function assessMarketSourceQuality(input) {
  const allowedIntervals = [15, 60, 240];
  const src = input && typeof input === 'object' ? input : {};
  const ageSeconds = src.ageSeconds;
  const intervalMinutes = src.intervalMinutes;
  const source = src.source;
  const sourceReportedLive = src.sourceReportedLive === true;
  const sourceTimestampPresent = src.sourceTimestampPresent === true;

  const base = { tradingAuthorized: false };

  if (source !== 'Kraken public OHLC') {
    return { ...base, state: 'unrecognized source; not assessed', researchReady: false };
  }
  if (!allowedIntervals.includes(intervalMinutes)) {
    return { ...base, state: 'unsupported interval; not assessed', researchReady: false };
  }
  if (!sourceTimestampPresent) {
    return { ...base, state: 'missing source timestamp; not research ready', researchReady: false };
  }
  if (!Number.isInteger(ageSeconds) || ageSeconds < 0) {
    return { ...base, state: 'invalid age; not research ready', researchReady: false };
  }

  const intervalSeconds = intervalMinutes * 60;
  const staleThreshold = intervalSeconds * 2;

  if (ageSeconds > staleThreshold) {
    return { ...base, state: 'stale beyond 2 intervals; not research ready', researchReady: false };
  }
  if (!sourceReportedLive) {
    return { ...base, state: 'source not reported live; not research ready', researchReady: false };
  }
  return { ...base, state: 'fresh source-reported data; research ready', researchReady: true };
}
