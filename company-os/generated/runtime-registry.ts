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
import { assessMarketSourceQuality as sf_market_rule_d5a6576c5244 } from "./feature_d5a6576c5244.mjs";
import { assessMarketSourceQuality as sf_market_rule_e82289256b13 } from "./feature_e82289256b13.mjs";
// SINA_GENERATED_IMPORTS
export const GENERATED_MARKET_RULES:SourceRule[]=[
    {workstreamId:"d5a6576c52442298a31c115da3bcf1af",evaluate:sf_market_rule_d5a6576c5244},
    {workstreamId:"e82289256b130542d4c7d4a936e6a7c8",evaluate:sf_market_rule_e82289256b13},
  // SINA_GENERATED_RULES
];
