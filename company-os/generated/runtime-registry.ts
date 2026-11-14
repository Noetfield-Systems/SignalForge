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
import { assessMarketSourceQuality as sf_market_rule_de56e8bbbd7e } from "./feature_de56e8bbbd7e.mjs";
// SINA_GENERATED_IMPORTS
export const GENERATED_MARKET_RULES:SourceRule[]=[
    {workstreamId:"de56e8bbbd7e05657ac8b6b34225d13a",evaluate:sf_market_rule_de56e8bbbd7e},
  // SINA_GENERATED_RULES
];
