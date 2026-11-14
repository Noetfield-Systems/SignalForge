import {expect,test} from "bun:test";
import {assessMarketSourceIntegrity} from "../src/market-source-integrity.ts";

const now=Date.parse("2026-11-13T19:40:00Z");
function observed(ageSec:number,other:Record<string,unknown>={}):any{
 return {mode:"LIVE_PUBLIC_DATA",source:"Kraken public OHLC",interval:60,
   fetchedAt:new Date(now).toISOString(),
   candles:[{time:Math.floor(now/1000)-ageSec,close:99500}],...other};
}
test("fresh last completed Kraken bar yields source-observed research only",()=>{
 const r=assessMarketSourceIntegrity(observed(3600),now);
 expect(r.state).toBe("SOURCE_OBSERVED_CURRENT");
 expect(r.ageSeconds).toBe(3600);
 expect(r.researchEligible).toBe(true);
 expect(r.independentlyVerified).toBe(false);
 expect(r.tradingAuthorized).toBe(false);
});
test("stale exchange reports and future timestamps are visibly rejected",()=>{
 expect(assessMarketSourceIntegrity(observed(8000),now).state).toBe("STALE_PUBLIC_CANDLES");
 expect(assessMarketSourceIntegrity(observed(-90),now).state).toBe("CLOCK_OR_TIMESTAMP_ANOMALY");
 expect(assessMarketSourceIntegrity(observed(9000000),now).state).toBe("CLOCK_OR_TIMESTAMP_ANOMALY");
});
test("demo fallback, invalid candles and unrecognized sources cannot be called verified",()=>{
 expect(assessMarketSourceIntegrity(observed(100,{mode:"DEMO_DATA"}),now).researchEligible).toBe(false);
 expect(assessMarketSourceIntegrity(observed(100,{source:"UNKNOWN"}),now).state).toBe("UNRECOGNIZED_PUBLIC_SOURCE");
 expect(assessMarketSourceIntegrity(observed(100,{candles:[]}),now).state).toBe("INVALID_CANDLE");
 expect(assessMarketSourceIntegrity(observed(100,{candles:[{time:Math.floor(now/1000)-100,close:-3}]}),now).researchEligible).toBe(false);
});
test("15m and 4h timeframes apply their own completed-bar freshness windows",()=>{
 expect(assessMarketSourceIntegrity(observed(2000,{interval:15}),now).state).toBe("SOURCE_OBSERVED_CURRENT");
 expect(assessMarketSourceIntegrity(observed(2300,{interval:15}),now).state).toBe("STALE_PUBLIC_CANDLES");
 expect(assessMarketSourceIntegrity(observed(2000,{interval:240}),now).state).toBe("SOURCE_OBSERVED_CURRENT");
});
test("coding agent registry is actually imported by customer-facing source evaluator",async()=>{
 const market=await Bun.file(new URL("../src/market-source-integrity.ts",import.meta.url)).text();
 const registry=await Bun.file(new URL("../company-os/generated/runtime-registry.ts",import.meta.url)).text();
 expect(market).toContain('import {GENERATED_MARKET_RULES}');
 expect(market).toContain("rule.evaluate(passed)");
 expect(registry).toContain("SINA_GENERATED_IMPORTS");
 expect(registry).toContain("SINA_GENERATED_RULES");
 const result=assessMarketSourceIntegrity(observed(900),now);
 expect(Array.isArray(result.generatedResearchRules)).toBe(true);
 for(const entry of result.generatedResearchRules||[]){
  expect(typeof entry.workstreamId).toBe("string");
  expect(entry.workstreamId).toMatch(/^[a-f0-9]{32}$/);
  expect(typeof entry.state).toBe("string");
  expect(typeof entry.researchReady).toBe("boolean");
 }
 expect(result.tradingAuthorized).toBe(false);
 expect(result.independentlyVerified).toBe(false);
});

test("the deployed market endpoint and browser terminal must consume readiness",async()=>{
 const [server,ui]=await Promise.all([
  Bun.file(new URL("../src/server.ts",import.meta.url)).text(),
  Bun.file(new URL("../public/index.html",import.meta.url)).text(),
 ]);
 expect(server).toContain("researchIntegrity:assessMarketSourceIntegrity(pack)");
 expect(ui).toContain("j.researchIntegrity?.state");
 expect(ui).toContain("SOURCE CURRENT · KRAKEN");
});
