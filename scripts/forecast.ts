/**
 * SignalForge M20 - deterministic financial scenario calculator.
 * No inference about live users or cash; inputs are hypothetical and validated.
 * Run: bun run scripts/forecast.ts
 */
import scenarioFile from "../strategy/m20-scenarios.v1.json";

export type ScenarioInput = {
  case: string;
  day: number;
  cumulative_new_signups: number;
  matured_trial_users: number;
  trial_to_paid_rate: number;
  paid_retention_factor: number;
};
export type PriceMix = {
  pro_monthly: number;
  quant_monthly: number;
  pro_share: number;
  quant_share: number;
};
export function calculateScenario(input: ScenarioInput, prices: PriceMix) {
  const whole = (n:number) => Number.isSafeInteger(n) && n >= 0;
  const probability = (n:number) => Number.isFinite(n) && n >= 0 && n <= 1;
  if (!whole(input.day) || ![90,180].includes(input.day) ||
      !whole(input.cumulative_new_signups) || !whole(input.matured_trial_users) ||
      input.matured_trial_users > input.cumulative_new_signups ||
      !probability(input.trial_to_paid_rate) || !probability(input.paid_retention_factor) ||
      !Number.isFinite(prices.pro_monthly) || prices.pro_monthly < 0 ||
      !Number.isFinite(prices.quant_monthly) || prices.quant_monthly < 0 ||
      !probability(prices.pro_share) || !probability(prices.quant_share) ||
      Math.abs(prices.pro_share + prices.quant_share - 1) > 1e-8) {
    throw new Error("INVALID_ILLUSTRATIVE_SCENARIO");
  }
  const averageRevenueCents =
    Math.round(prices.pro_monthly * 100) * prices.pro_share +
    Math.round(prices.quant_monthly * 100) * prices.quant_share;
  const modeledPaying = Math.round(
    input.matured_trial_users *
    input.trial_to_paid_rate *
    input.paid_retention_factor
  );
  return {
    case: input.case,
    day: input.day,
    cumulative_new_signups: input.cumulative_new_signups,
    matured_trial_users: input.matured_trial_users,
    modeled_paying_users: modeledPaying,
    assumed_avg_monthly_price_cad: averageRevenueCents/100,
    modeled_gross_mrr_cad: Math.round(modeledPaying * averageRevenueCents)/100,
    verified_paying_users: null,
    verified_collected_cash_cad: null,
    reliability: "SCENARIO_ONLY_NOT_A_FORECAST_OR_RECEIPT"
  };
}
export const output = () => {
  const prices = scenarioFile.pricing_basis;
  return scenarioFile.scenarios.map(row=>calculateScenario(row,{
    pro_monthly:prices.pro_monthly,quant_monthly:prices.quant_monthly,
    pro_share:prices.pro_share,quant_share:prices.quant_share
  }));
};
if (import.meta.main) {
  console.log(JSON.stringify({
    schema:"signalforge.m20.revenue-model-output.v1",
    as_of_utc:scenarioFile.as_of_utc,
    assertion:"No actual customers, payments, net profit or probability of success inferred.",
    scenarios:output()
  },null,2));
}
