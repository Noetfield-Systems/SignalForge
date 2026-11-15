import {expect,test} from "bun:test";
import {compareMarketObservations} from "../src/agent-compare.ts";
const snapshot=(price:number,vol:number,sourceUrl="https://app.hyperliquid.xyz/trade/BTC")=>({
 lane:"perps",status:"SOURCE_OBSERVED",runId:crypto.randomUUID(),
 evidence:[{venue:"Hyperliquid",label:"BTC",sourceUrl,observedAt:"2026-11-14T18:00:00Z",
  values:{markPrice:price,volume24hUsd:vol,fundingRateRaw:-0.0001,meta:{anything:"ignored"},bad:null}}]
});
test("same source market compares numbers and preserves signed funding and timestamp provenance",()=>{
 const before=snapshot(100,200),after=snapshot(110,250);
 after.evidence[0].values.fundingRateRaw=-0.0002;
 const r:any=compareMarketObservations(before,after);
 expect(r.status).toBe("COMPARISON_AVAILABLE");
 expect(r.matchingMarkets).toBe(1);
 const fields=Object.fromEntries(r.changes[0].metrics.map((x:any)=>[x.field,x]));
 expect(fields.markPrice.delta).toBe(10);
 expect(fields.markPrice.percentChange).toBe(10);
 expect(fields.fundingRateRaw.delta).toBe(-0.0001);
 expect(fields.fundingRateRaw.percentChange).toBe(-100);
 expect(fields.meta).toBeUndefined();
 expect(fields.bad).toBeUndefined();
 expect(r.financialExecution).toBe(false);
 expect(r.independentlyVerified).toBe(false);
});
test("different market, lost visibility or source outage is not a fabricated market movement",()=>{
 const a=snapshot(100,200);
 expect(compareMarketObservations(a,snapshot(150,300,"https://app.hyperliquid.xyz/trade/ETH")).status).toBe("NO_MATCHING_MARKETS");
 expect(compareMarketObservations(a,{...snapshot(150,300),status:"SOURCE_UNAVAILABLE",evidence:[]}).status).toBe("CURRENT_SOURCE_UNAVAILABLE");
 expect(compareMarketObservations({...a,lane:"kraken"},snapshot(150,300)).status).toBe("DIFFERENT_RESEARCH_LANES");
});
test("non-finite and zero baselines do not create fake percentages",()=>{
 const a=snapshot(0,200),b=snapshot(5,200);
 const r:any=compareMarketObservations(a,b);
 const field=r.changes[0].metrics.find((x:any)=>x.field==="markPrice");
 expect(field.percentChange).toBeNull();
 expect(field.delta).toBe(5);
});
