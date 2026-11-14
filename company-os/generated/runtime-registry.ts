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
import { assessMarketSourceQuality as sf_market_rule_c2f454e8945f } from "./feature_c2f454e8945f.mjs";
// SINA_GENERATED_IMPORTS
export const GENERATED_MARKET_RULES:SourceRule[]=[
    {workstreamId:"d5a6576c52442298a31c115da3bcf1af",evaluate:sf_market_rule_d5a6576c5244},
    {workstreamId:"c2f454e8945fffe9d885794cc9d1beaa",evaluate:sf_market_rule_c2f454e8945f},
  // SINA_GENERATED_RULES
];
