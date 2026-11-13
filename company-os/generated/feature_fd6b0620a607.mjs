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
