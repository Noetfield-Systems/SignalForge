import {GENERATED_MARKET_RULES} from "../company-os/generated/runtime-registry.ts";
/**
 * Customer-facing SignalForge market source-integrity state.
 * Kraken OHLC timestamps are exchange-reported, not an independent signature.
 * Never turn demo fallback or source freshness into a trading authorization.
 */
export type ResearchMarketInput={
 mode:string;source:string;interval:number;
 candles:Array<{time:number;close?:number}>;fetchedAt:string;
};
function evaluateGeneratedMarketRules(input:ResearchMarketInput, ageSeconds:number){
 const age=Math.max(0,ageSeconds);
 const passed={
  ageSeconds:age,
  intervalMinutes:input.interval,
  source:input.source,
  sourceReportedLive:input.mode==="LIVE_PUBLIC_DATA",
  sourceTimestampPresent:true,
 };
 // Cap consumption even if many independently reviewed code capabilities
 // have been merged. A model rule cannot overwrite the core market verdict.
 return GENERATED_MARKET_RULES.slice(-3).map(rule=>{
  try {
   const result=rule.evaluate(passed);
   if(!result||typeof result.state!=="string"||
      result.state.length>80||typeof result.researchReady!=="boolean"||
      result.tradingAuthorized!==false)
     return {workstreamId:rule.workstreamId,state:"INVALID_GENERATED_RULE",researchReady:false};
   return {workstreamId:rule.workstreamId,state:result.state,
           researchReady:result.researchReady};
  }catch{
   return {workstreamId:rule.workstreamId,state:"GENERATED_RULE_ERROR",researchReady:false};
  }
 });
}

export function assessMarketSourceIntegrity(input:ResearchMarketInput, nowMs=Date.now()){
 const denied={researchEligible:false,tradingAuthorized:false,independentlyVerified:false};
 if(!input||typeof input!=="object"||!Array.isArray(input.candles)||
    !Number.isFinite(nowMs)||nowMs<=0||
    !Number.isSafeInteger(input.interval)||![15,60,240].includes(input.interval))
  return {state:"INVALID_MARKET_METADATA",ageSeconds:null,sourceTimestamp:null,...denied};
 if(input.mode!=="LIVE_PUBLIC_DATA")
  return {state:"DEMO_OR_UNVERIFIED_SOURCE",ageSeconds:null,sourceTimestamp:null,...denied};
 if(input.source!=="Kraken public OHLC")
  return {state:"UNRECOGNIZED_PUBLIC_SOURCE",ageSeconds:null,sourceTimestamp:null,...denied};
 const last=input.candles.at(-1),seconds=last?.time;
 if(!Number.isSafeInteger(seconds)||typeof seconds!=="number"||seconds<=0||
    !last||typeof last.close!=="number"||!Number.isFinite(last.close)||last.close<=0)
  return {state:"INVALID_CANDLE",ageSeconds:null,sourceTimestamp:null,...denied};
 const ageSeconds=Math.floor(nowMs/1000-seconds);
 if(ageSeconds<0||ageSeconds>30*86400)
  return {state:"CLOCK_OR_TIMESTAMP_ANOMALY",ageSeconds,sourceTimestamp:seconds,...denied};
 // Closed hourly bars may legitimately be >1h old. A 2-bar + 5m
 // bound catches a stale provider without demanding tick-level precision.
 const stale=ageSeconds>input.interval*120+300;
 return {state:stale?"STALE_PUBLIC_CANDLES":"SOURCE_OBSERVED_CURRENT",
   ageSeconds,sourceTimestamp:seconds,
   researchEligible:!stale,tradingAuthorized:false,independentlyVerified:false,
   generatedResearchRules:stale?[]:evaluateGeneratedMarketRules(input,ageSeconds)};
}
