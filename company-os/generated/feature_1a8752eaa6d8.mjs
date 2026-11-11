const MAX_BARS = 5000;
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

function validateBars(bars) {
  if (!Array.isArray(bars)) throw new Error('BARS_NOT_ARRAY');
  if (bars.length === 0) throw new Error('BARS_EMPTY');
  if (bars.length > MAX_BARS) throw new Error('BARS_TOO_MANY');
  for (const b of bars) {
    if (!b || typeof b !== 'object') throw new Error('BAR_INVALID');
    if (!finite(b.high) || !finite(b.low) || !finite(b.close)) throw new Error('BAR_NON_FINITE');
    if (b.high < b.low) throw new Error('BAR_HIGH_BELOW_LOW');
    if (b.close < b.low || b.close > b.high) throw new Error('BAR_CLOSE_OUT_OF_RANGE');
  }
}

function mean(values) {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdev(values) {
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) * (v - m), 0) / values.length);
}

/**
 * Assess observed market opportunity from OHLC bars.
 * Pure, deterministic. Returns a bounded score in [0,100] plus a band.
 * Not a trading signal, order, or proof of edge.
 */
export function assessMarketOpportunity(bars, options = {}) {
  validateBars(bars);
  const lookback = Number.isSafeInteger(options.lookback) && options.lookback > 1
    ? Math.min(options.lookback, bars.length)
    : Math.min(20, bars.length);
  const window = bars.slice(-lookback);
  const closes = window.map((b) => b.close);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const drift = first === 0 ? 0 : (last - first) / Math.abs(first);
  const vol = stdev(closes);
  const range = Math.max(...window.map((b) => b.high)) - Math.min(...window.map((b) => b.low));
  const rangeRatio = last === 0 ? 0 : range / Math.abs(last);
  const trendScore = Math.min(1, Math.abs(drift) * 10);
  const volScore = Math.min(1, vol === 0 ? 0 : rangeRatio);
  const raw = 100 * (0.6 * trendScore + 0.4 * volScore);
  const score = Math.round(Math.max(0, Math.min(100, raw)));
  const band = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
  return {
    score,
    band,
    lookback,
    drift: Number(drift.toFixed(6)),
    volatility: Number(vol.toFixed(6)),
    rangeRatio: Number(rangeRatio.toFixed(6)),
    evidenceState: 'INPUT_SOURCE_REPORTED',
    authority: 'PROPOSAL_ONLY_EXISTING_GOVERNOR_REQUIRED',
  };
}

/**
 * Build a bounded experiment proposal from an assessment.
 * Never authorizes trades, spend, or production mutation.
 */
export function buildExperimentProposal(assessment, options = {}) {
  if (!assessment || typeof assessment !== 'object') throw new Error('ASSESSMENT_REQUIRED');
  if (!Number.isSafeInteger(assessment.score) || assessment.score < 0 || assessment.score > 100) {
    throw new Error('ASSESSMENT_SCORE_INVALID');
  }
  const hypothesis = typeof options.hypothesis === 'string' && options.hypothesis.trim()
    ? options.hypothesis.trim().slice(0, 280)
    : 'Observed opportunity band predicts measurable follow-through over the next evaluation window.';
  const sampleTarget = Number.isSafeInteger(options.sampleTarget) && options.sampleTarget > 0
    ? Math.min(options.sampleTarget, 10000)
    : 200;
  return {
    hypothesis,
    band: assessment.band,
    score: assessment.score,
    sampleTarget,
    successCriteria: [
      'Outcome distribution differs from baseline at declared confidence',
      'No real trades, spend, or production mutation performed',
    ],
    resources: {
      budget_usd: 0,
      external_effects_allowed: false,
      real_trades_allowed: false,
      production_mutation_allowed: false,
    },
    routing_state: 'AWAITING_EXISTING_COMPANY_OS_WORKPACKET',
  };
}
