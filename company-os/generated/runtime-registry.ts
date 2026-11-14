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
import { assessMarketSourceQuality as sf_market_rule_b25284650a86 } from "./feature_b25284650a86.mjs";
// SINA_GENERATED_IMPORTS
export const GENERATED_MARKET_RULES:SourceRule[]=[
    {workstreamId:"b25284650a86178464c4425b481a03fc",evaluate:sf_market_rule_b25284650a86},
  // SINA_GENERATED_RULES
];
