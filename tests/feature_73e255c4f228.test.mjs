import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreMarketOpportunity, buildExperimentProposal } from '../company-os/generated/feature_73e255c4f228.mjs';

test('scores a strong opportunity from source-reported counts', () => {
  const result = scoreMarketOpportunity({
    tokenResearchersLast30Days: 120,
    returnDayResearchersLast30Days: 80,
    pricingViewersLast30Days: 40,
    checkoutStartedUsersLast30Days: 20,
  });
  assert.equal(result.band, 'STRONG');
  assert.equal(result.retentionRate, 0.6667);
  assert.equal(result.pricingIntentRate, 0.5);
  assert.equal(result.evidenceState, 'INPUT_SOURCE_REPORTED');
  assert.equal(result.authority, 'PROPOSAL_ONLY_EXISTING_GOVERNOR_REQUIRED');
});

test('handles zero activity without dividing by zero', () => {
  const result = scoreMarketOpportunity({});
  assert.equal(result.retentionRate, 0);
  assert.equal(result.pricingIntentRate, 0);
  assert.equal(result.composite, 0);
  assert.equal(result.band, 'WEAK');
});

test('rejects inconsistent counts where returns exceed totals', () => {
  assert.throws(
    () => scoreMarketOpportunity({
      tokenResearchersLast30Days: 5,
      returnDayResearchersLast30Days: 9,
    }),
    /RETURN_EXCEEDS_TOTAL/,
  );
});

test('rejects negative or non-finite counts', () => {
  assert.throws(
    () => scoreMarketOpportunity({ tokenResearchersLast30Days: -1 }),
    /INVALID_COUNT:tokenResearchersLast30Days/,
  );
  assert.throws(
    () => scoreMarketOpportunity({ pricingViewersLast30Days: Infinity }),
    /INVALID_COUNT:pricingViewersLast30Days/,
  );
});

test('builds a bounded non-executing experiment proposal', () => {
  const score = scoreMarketOpportunity({
    tokenResearchersLast30Days: 50,
    returnDayResearchersLast30Days: 20,
    pricingViewersLast30Days: 10,
    checkoutStartedUsersLast30Days: 3,
  });
  const proposal = buildExperimentProposal(score);
  assert.equal(proposal.band, score.band);
  assert.equal(proposal.resources.budget_usd, 0);
  assert.equal(proposal.resources.external_effects_allowed, false);
  assert.equal(proposal.routing_state, 'AWAITING_EXISTING_COMPANY_OS_WORKPACKET');
  assert.throws(() => buildExperimentProposal(score, { hypothesis: '   ' }), /HYPOTHESIS_REQUIRED/);
});
