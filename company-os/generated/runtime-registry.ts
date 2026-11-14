/** SignalForge-only approved-in-repository pure market research rules.
 * The GitHub Company OS delivery runner appends static imports ONLY after
 * generating source and tests. Rules cannot grant trading/finance/production
 * authority; actual release still requires GitHub/CI/Railway verification.
 */
export type SourceReviewInput={
  ageSeconds:number; intervalMinutes:number; source:string;
  sourceReportedLive:boolean; sourceTimestampPresent:boolean;
};
export type SourceReviewResult={
  state:string; researchReady:boolean; tradingAuthorized:false;
};
export type SourceRule={
  workstreamId:string; evaluate:(input:SourceReviewInput)=>SourceReviewResult;
};
import { assessMarketSourceQuality as sf_market_rule_8ea89640c000 } from "./feature_8ea89640c000.mjs";
// SINA_GENERATED_IMPORTS
export const GENERATED_MARKET_RULES:SourceRule[]=[
    {workstreamId:"8ea89640c0008b1e83189c001d731e8e",evaluate:sf_market_rule_8ea89640c000},
  // SINA_GENERATED_RULES
];
