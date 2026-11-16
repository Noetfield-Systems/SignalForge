/**
 * SignalForge market research provenance policy.
 * Source metadata is not a profitable-trade signal or trading authorization.
 * This helper never contacts providers, brokers, wallets or customers.
 */
export function assessResearchDataReadiness(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { state: 'INVALID_INPUT', researchReady: false, tradingAllowed: false };
  }
  const { ageSeconds, providerLicensed, sourceTimestampVerified, chainId } = input;
  if (!Number.isSafeInteger(ageSeconds) || ageSeconds < 0 ||
      !Number.isSafeInteger(chainId) || chainId <= 0) {
    return { state: 'INVALID_METADATA', researchReady: false, tradingAllowed: false };
  }
  if (providerLicensed !== true) {
    return { state: 'LICENSE_UNCONFIRMED', researchReady: false, tradingAllowed: false };
  }
  if (sourceTimestampVerified !== true) {
    return { state: 'SOURCE_UNVERIFIED', researchReady: false, tradingAllowed: false };
  }
  if (ageSeconds > 300) {
    return { state: 'STALE_RESEARCH_DATA', researchReady: false, tradingAllowed: false };
  }
  return { state: 'RESEARCH_REVIEW_ELIGIBLE', researchReady: true, tradingAllowed: false };
}

/** Live product integration contract: bounded source observation only. */
export function assessMarketSourceQuality(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !Number.isSafeInteger(input.ageSeconds) || input.ageSeconds < 0 ||
      ![15,60,240].includes(input.intervalMinutes)) {
    return {state:'INVALID_SOURCE_INPUT',researchReady:false,tradingAuthorized:false};
  }
  if (input.source !== 'Kraken public OHLC' ||
      input.sourceReportedLive !== true || input.sourceTimestampPresent !== true) {
    return {state:'SOURCE_NOT_LIVE',researchReady:false,tradingAuthorized:false};
  }
  if (input.ageSeconds > input.intervalMinutes*120+300) {
    return {state:'STALE_PUBLIC_CANDLES',researchReady:false,tradingAuthorized:false};
  }
  return {state:'SOURCE_OBSERVED_CURRENT',researchReady:true,tradingAuthorized:false};
}
