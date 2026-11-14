/**
 * Customer-facing SignalForge market source-integrity state.
 * Kraken OHLC timestamps are exchange-reported, not an independent signature.
 * Never turn demo fallback or source freshness into a trading authorization.
 */
export type ResearchMarketInput={
 mode:string;source:string;interval:number;
 candles:Array<{time:number;close?:number}>;fetchedAt:string;
};
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
 if(!Number.isSafeInteger(seconds)||seconds!<=0||!Number.isFinite(last?.close)||last!.close!<=0)
  return {state:"INVALID_CANDLE",ageSeconds:null,sourceTimestamp:null,...denied};
 const ageSeconds=Math.floor(nowMs/1000-seconds);
 if(ageSeconds<0||ageSeconds>30*86400)
  return {state:"CLOCK_OR_TIMESTAMP_ANOMALY",ageSeconds,sourceTimestamp:seconds,...denied};
 // Closed hourly bars may legitimately be >1h old. A 2-bar + 5m
 // bound catches a stale provider without demanding tick-level precision.
 const stale=ageSeconds>input.interval*120+300;
 return {state:stale?"STALE_PUBLIC_CANDLES":"SOURCE_OBSERVED_CURRENT",
   ageSeconds,sourceTimestamp:seconds,
   researchEligible:!stale,tradingAuthorized:false,independentlyVerified:false};
}
