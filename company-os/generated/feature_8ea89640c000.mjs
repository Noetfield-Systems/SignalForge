const INTERVALS = new Set([15, 60, 240]);
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function assessMarketSourceQuality(input) {
  const reasons = [];
  let researchReady = true;

  if (!input || typeof input !== 'object') {
    return { state: 'invalid input: not an object', researchReady: false, tradingAuthorized: false };
  }

  const { ageSeconds, intervalMinutes, source, sourceReportedLive, sourceTimestampPresent } = input;

  if (!Number.isInteger(ageSeconds) || ageSeconds < 0) {
    reasons.push('ageSeconds must be a non-negative integer');
    researchReady = false;
  } else if (ageSeconds > MAX_AGE_SECONDS) {
    reasons.push('ageSeconds exceeds 30-day research window');
    researchReady = false;
  }

  if (!INTERVALS.has(intervalMinutes)) {
    reasons.push('intervalMinutes must be 15, 60 or 240');
    researchReady = false;
  }

  if (source !== 'Kraken public OHLC') {
    reasons.push('source must be Kraken public OHLC');
    researchReady = false;
  }

  if (typeof sourceReportedLive !== 'boolean') {
    reasons.push('sourceReportedLive must be boolean');
    researchReady = false;
  }

  if (typeof sourceTimestampPresent !== 'boolean') {
    reasons.push('sourceTimestampPresent must be boolean');
    researchReady = false;
  }

  if (sourceTimestampPresent === false) {
    reasons.push('source timestamp missing');
    researchReady = false;
  }

  if (sourceReportedLive === false) {
    reasons.push('source not reported live');
    researchReady = false;
  }

  if (researchReady && Number.isInteger(ageSeconds) && Number.isInteger(intervalMinutes)) {
    const staleThreshold = intervalMinutes * 60 * 3;
    if (ageSeconds > staleThreshold) {
      reasons.push('ageSeconds exceeds 3x interval freshness window');
      researchReady = false;
    }
  }

  const state = researchReady
    ? 'source-reported live, timestamped, within freshness window'
    : reasons.join('; ').slice(0, 80);

  return { state, researchReady, tradingAuthorized: false };
}
