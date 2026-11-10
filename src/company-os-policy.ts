/** Deterministic M20 operating rules over source-reported SignalForge aggregates.
 * Pure evaluator: no permits, trades, billing writes, customer messages or worker queue.
 * For typed Company OS signals only after minimum cohort denominators are met.
 */
export const COMPANY_POLICY_SCHEMA = "signalforge.company-policy.v1";
export type RuleCode =
  | "SF-P0-BILLING_RECONCILE" | "SF-P0-MODERATION_OVERDUE"
  | "SF-P0-ACTIVATION_REPAIR" | "SF-P0-RETENTION_REPAIR"
  | "SF-P0-TRIAL_CONVERSION_REPAIR";
export type RuleEvent = "service_degraded" | "customer_feedback" | "activation_drop";
export interface CompanyMetrics {
  eligible24h: number;
  activated24h: number;
  eligibleDay7: number;
  returnedDay7: number;
  maturedTrials: number;
  invoicePaidMatured: number;
  overdueReports: number;
  failedInvoices7d: number;
}
export interface CompanyRecommendation {
  code: RuleCode;
  event_type: RuleEvent;
  priority: number;
  rate: number | null;
  numerator: number;
  denominator: number | null;
  threshold: number | null;
  next_action: string;
  evidence_level: "SOURCE_REPORTED_NOT_INDEPENDENTLY_VERIFIED";
  effects_authorized: false;
}
function count(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000) throw new Error("invalid company aggregate");
  return value;
}
export function evaluateCompanyPolicy(raw: CompanyMetrics): {
  schema: typeof COMPANY_POLICY_SCHEMA;
  project_id: "signalforge-market-intelligence";
  source: "PRODUCTION_DATABASE_AGGREGATES";
  decisions: CompanyRecommendation[];
  insufficient: string[];
  human_research_users_verified: false;
  independent_payment_receipts_verified: false;
  grants_external_authority: false;
} {
  const x: CompanyMetrics = {
    eligible24h: count(raw.eligible24h),
    activated24h: count(raw.activated24h),
    eligibleDay7: count(raw.eligibleDay7),
    returnedDay7: count(raw.returnedDay7),
    maturedTrials: count(raw.maturedTrials),
    invoicePaidMatured: count(raw.invoicePaidMatured),
    overdueReports: count(raw.overdueReports),
    failedInvoices7d: count(raw.failedInvoices7d)
  };
  if (x.activated24h > x.eligible24h || x.returnedDay7 > x.eligibleDay7 ||
      x.invoicePaidMatured > x.maturedTrials) throw new Error("inconsistent company cohorts");
  const decisions: CompanyRecommendation[] = [];
  const insufficient: string[] = [];
  const add=(code:RuleCode,event_type:RuleEvent,priority:number,numerator:number,
       denominator:number|null,threshold:number|null,next_action:string)=>{
    decisions.push({code,event_type,priority,rate:denominator?Number((numerator/denominator).toFixed(4)):null,
      numerator,denominator,threshold,next_action,
      evidence_level:"SOURCE_REPORTED_NOT_INDEPENDENTLY_VERIFIED",effects_authorized:false});
  };
  if (x.failedInvoices7d > 0) add("SF-P0-BILLING_RECONCILE","service_degraded",99,
    x.failedInvoices7d,null,null,
    "Inspect signed Stripe events, payment failure causes, entitlement reconciliation and customer impact. Do not infer collected cash from trial or plan selection.");
  if (x.overdueReports > 0) add("SF-P0-MODERATION_OVERDUE","customer_feedback",95,
    x.overdueReports,null,null,
    "Review aged community abuse reports in the authorized moderation queue, address user safety, and record a real disposition.");
  const cohort=(numerator:number,denominator:number,code:RuleCode,event_type:RuleEvent,priority:number,threshold:number,work:string)=>{
    if (denominator < 100) {insufficient.push(code+":MINIMUM_100_NOT_MET");return;}
    if (numerator/denominator < threshold) add(code,event_type,priority,numerator,denominator,threshold,work);
  };
  cohort(x.activated24h,x.eligible24h,"SF-P0-ACTIVATION_REPAIR","activation_drop",92,0.35,
    "Fix observed first research action/onboarding friction in the existing SignalForge Company OS, run a bounded experiment and compare source-backed cohorts.");
  cohort(x.returnedDay7,x.eligibleDay7,"SF-P0-RETENTION_REPAIR","customer_feedback",87,0.2,
    "Improve authentic day-7 research return via watchlist utility and consent-aware lifecycle; do not count marketing opens or bot traffic as return.");
  cohort(x.invoicePaidMatured,x.maturedTrials,"SF-P0-TRIAL_CONVERSION_REPAIR","activation_drop",94,0.03,
    "Investigate matured trial-to-invoice-paid conversion, payment readiness, checkout and value proposition before changing prices.");
  decisions.sort((a,b)=>b.priority-a.priority || a.code.localeCompare(b.code));
  return {schema:COMPANY_POLICY_SCHEMA,project_id:"signalforge-market-intelligence",
    source:"PRODUCTION_DATABASE_AGGREGATES",decisions,insufficient,
    human_research_users_verified:false,independent_payment_receipts_verified:false,
    grants_external_authority:false};
}
