import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMarketOpportunity, buildExperimentProposal } from '../company-os/generated/feature_1a8752eaa6d8.mjs';

const bar = (low, high, close) => ({ low, high, close });

const trending = [
  bar(100, 102, 101),
  bar(101, 104, 103),
  bar(103, 107, 106),
  bar(106, 110, 109),
  bar(109, 114, 113),
];

test('assessMarketOpportunity returns bounded score and band for trending bars', () => {
  const r = assessMarketOpportunity(trending);
  assert.ok(r.score >= 0 && r.score <= 100);
  assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(r.band));
  assert.equal(r.evidenceState, 'INPUT_SOURCE_REPORTED');
  assert.equal(r.authority, 'PROPOSAL_ONLY_EXISTING_GOVERNOR_REQUIRED');
  assert.ok(r.drift > 0);
});

test('assessMarketOpportunity rejects malformed bars', () => {
  assert.throws(() => assessMarketOpportunity([]), /BARS_EMPTY/);
  assert.throws(() => assessMarketOpportunity([bar(10, 5, 7)]), /BAR_HIGH_BELOW_LOW/);
  assert.throws(() => assessMarketOpportunity([bar(10, 20, 25)]), /BAR_CLOSE_OUT_OF_RANGE/);
  assert.throws(() => assessMarketOpportunity([{ low: 1, high: 2, close: NaN }]), /BAR_NON_FINITE/);
});

test('buildExperimentProposal is bounded and never authorizes effects', () => {
  const a = assessMarketOpportunity(trending);
  const p = buildExperimentProposal(a, { sampleTarget: 999999 });
  assert.equal(p.sampleTarget, 10000);
  assert.equal(p.resources.budget_usd, 0);
  assert.equal(p.resources.real_trades_allowed, false);
  assert.equal(p.resources.production_mutation_allowed, false);
  assert.equal(p.routing_state, 'AWAITING_EXISTING_COMPANY_OS_WORKPACKET');
  assert.throws(() => buildExperimentProposal({ score: 150, band: 'HIGH' }), /ASSESSMENT_SCORE_INVALID/);
});
