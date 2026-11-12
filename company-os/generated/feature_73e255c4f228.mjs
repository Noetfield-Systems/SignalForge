const isFiniteNonNegative = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * Deterministic, pure scoring of an observed market opportunity for the
 * SignalForge premium market-intelligence experiment. All inputs are
 * source-reported counts/rates; nothing here is a trade, payment, or proof.
 */
export function scoreMarketOpportunity(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('INPUT_REQUIRED');
  }
  const {
    tokenResearchersLast30Days = 0,
    returnDayResearchersLast30Days = 0,
    pricingViewersLast30Days = 0,
    checkoutStartedUsersLast30Days = 0,
  } = input;

  for (const [name, value] of Object.entries({
    tokenResearchersLast30Days,
    returnDayResearchersLast30Days,
    pricingViewersLast30Days,
    checkoutStartedUsersLast30Days,
  })) {
    if (!isFiniteNonNegative(value)) {
      throw new Error(`INVALID_COUNT:${name}`);
    }
  }

  if (returnDayResearchersLast30Days > tokenResearchersLast30Days) {
    throw new Error('RETURN_EXCEEDS_TOTAL');
  }
  if (checkoutStartedUsersLast30Days > pricingViewersLast30Days) {
    throw new Error('CHECKOUT_EXCEEDS_VIEWERS');
  }

  const retentionRate = tokenResearchersLast30Days === 0
    ? 0
    : returnDayResearchersLast30Days / tokenResearchersLast30Days;
  const pricingIntentRate = pricingViewersLast30Days === 0
    ? 0
    : checkoutStartedUsersLast30Days / pricingViewersLast30Days;

  // Weighted, bounded composite. Retention is the strongest signal of a
  // durable research habit; pricing intent is the strongest signal of
  // willingness to pay for premium intelligence.
  const composite = clamp01(
    0.55 * retentionRate +
    0.35 * pricingIntentRate +
    0.10 * clamp01(tokenResearchersLast30Days / 100)
  );

  let band;
  if (composite >= 0.6) band = 'STRONG';
  else if (composite >= 0.3) band = 'MODERATE';
  else band = 'WEAK';

  return {
    retentionRate: Number(retentionRate.toFixed(4)),
    pricingIntentRate: Number(pricingIntentRate.toFixed(4)),
    composite: Number(composite.toFixed(4)),
    band,
    evidenceState: 'INPUT_SOURCE_REPORTED',
    authority: 'PROPOSAL_ONLY_EXISTING_GOVERNOR_REQUIRED',
  };
}

/**
 * Builds a bounded, non-executing experiment proposal from a scored
 * opportunity. Never claims execution, deployment, or real users.
 */
export function buildExperimentProposal(score, options = {}) {
  if (!score || typeof score !== 'object' || typeof score.band !== 'string') {
    throw new Error('SCORE_REQUIRED');
  }
  const { hypothesis = 'Premium signal rooms increase return-day research habit' } = options;
  if (typeof hypothesis !== 'string' || hypothesis.trim().length === 0) {
    throw new Error('HYPOTHESIS_REQUIRED');
  }

  const successCriteria = {
    STRONG: 'Hold return-day retention >= 0.5 across two consecutive 30-day windows',
    MODERATE: 'Lift return-day retention by >= 0.1 over baseline in one 30-day window',
    WEAK: 'Gather more source-reported research activity before committing scope',
  }[score.band];

  return {
    hypothesis: hypothesis.trim(),
    band: score.band,
    successCriteria,
    resources: {
      budget_usd: 0,
      external_effects_allowed: false,
      real_trades_allowed: false,
      production_mutation_allowed: false,
    },
    routing_state: 'AWAITING_EXISTING_COMPANY_OS_WORKPACKET',
    evidence_state: 'INPUT_SOURCE_REPORTED',
  };
}
