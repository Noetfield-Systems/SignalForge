import {test,expect} from "bun:test";
import {scannerSourceStatus,scannerDeepLinks,compileSourceRankedScanner} from "../src/scanner-research.ts";
const candle={state:"SOURCE_OBSERVED_CURRENT",researchEligible:true,sourceTimestamp:1794627000,ageSeconds:160};
const mk=(symbol:string,mode:string,integrity:any,score:number)=>({symbol,mode,integrity,
 source:mode==="LIVE_PUBLIC_DATA"?"Kraken public OHLC":"Deterministic fallback",
 fetchedAt:"2026-11-14T05:00:00.000Z",
 signals:[{id:"breakout",name:"Volume Breakout",direction:"LONG",state:"ACTIVE",score,
 entry:120,stop:116,targets:[121,125,129],riskReward:1.25}]});
test("current Kraken receives live rank; demo with higher signal score is never ranked",()=>{
 const x=compileSourceRankedScanner([
  mk("BTCUSD","LIVE_PUBLIC_DATA",candle,74),
  mk("ETHUSD","DEMO_DATA",{state:"DEMO_OR_UNVERIFIED_SOURCE",researchEligible:false},99)],60,"2026-11-14T05:00:00.000Z");
 expect(x.coverage).toEqual({markets:2,currentMarkets:1,excludedMarkets:1,source:"Kraken public OHLC",independentVerification:false});
 expect(x.liveRankedCount).toBe(1);expect(x.unrankedCount).toBe(1);
 expect(x.items[0].symbol).toBe("BTCUSD");expect(x.items[0].liveRank).toBe(1);
 expect(x.items[1].symbol).toBe("ETHUSD");expect(x.items[1].liveRank).toBeNull();
 expect(x.items[1].rankEligible).toBe(false);
 expect(x.items[0].researchLinks.chart).toBe("/app?view=dashboard&symbol=BTCUSD&interval=60");
 expect(x.items[0].researchLinks.backtest).toContain("strategy=breakout");
 expect(x.items.every(i=>i.evidence.independentlyVerified===false&&i.evidence.tradingAuthorized===false)).toBe(true);
});
test("stale/source anomalies never promote an active high-scoring setup to live ranking",()=>{
 for(const state of ["STALE_PUBLIC_CANDLES","CLOCK_OR_TIMESTAMP_ANOMALY","UNRECOGNIZED_PUBLIC_SOURCE"]){
  const x=compileSourceRankedScanner([mk("SOLUSD","LIVE_PUBLIC_DATA",{state,researchEligible:false},100)],15,new Date().toISOString());
  expect(x.liveRankedCount).toBe(0);expect(x.items[0].sourceStatus).toBe("STALE_OR_UNVERIFIED_UNRANKED");
 }
});
test("source sort ranks only eligible ACTIVE signals; guards chart deep links",()=>{
 const x=compileSourceRankedScanner([
  mk("BTCUSD","LIVE_PUBLIC_DATA",candle,65),
  mk("SOLUSD","LIVE_PUBLIC_DATA",candle,92)],240,new Date().toISOString());
 expect(x.items.map(i=>i.symbol)).toEqual(["SOLUSD","BTCUSD"]);
 expect(x.items.map(i=>i.liveRank)).toEqual([1,2]);
 expect(scannerDeepLinks("../../../api/admin",60,"breakout")).toBeNull();
 expect(scannerDeepLinks("BTCUSD",59,"breakout")).toBeNull();
 expect(scannerDeepLinks("BTCUSD",60,"hijacked")).toEqual({chart:"/app?view=dashboard&symbol=BTCUSD&interval=60",backtest:null});
 expect(()=>compileSourceRankedScanner([],59,new Date().toISOString())).toThrow("SCANNER_INTERVAL_NOT_SUPPORTED");
});
test("unconfigured/fallback cannot be claimed source-current",()=>{
 expect(scannerSourceStatus("DEMO_DATA",candle)).toBe("DEMO_UNRANKED");
 expect(scannerSourceStatus("LIVE_PUBLIC_DATA",{state:"SOURCE_OBSERVED_CURRENT",researchEligible:false})).toBe("STALE_OR_UNVERIFIED_UNRANKED");
});
