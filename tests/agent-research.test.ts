import {test,expect} from "bun:test";
import {parseResearchIntent,runMarketResearch} from "../src/agent-research.ts";

const time="2026-11-14T19:00:00.000Z";
const deps={
 pulse:async()=>({observedAt:time,prediction:{state:"SOURCE_OBSERVED",items:[{title:"Will ETH outperform BTC by December?",slug:"eth-btc",publicUrl:"https://polymarket.com/event/eth-btc",observedAt:time,source:"Polymarket Gamma public API",volume24h:1200,liquidityUsd:1000}]},perps:{state:"SOURCE_OBSERVED",items:[{symbol:"BTC",markPx:90000,fundingRateRaw:-0.0001,openInterestUsdApprox:1000000,volume24hUsd:2000000,source:"Hyperliquid public Info API",publicUrl:"https://app.hyperliquid.xyz/trade/BTC",observedAt:time}]}}),
 solana:async()=>({status:"OBSERVED",source:{name:"DEX Screener"},observedAt:time,primary:{priceUsd:1.23}}),
 kraken:async()=>({mode:"LIVE_PUBLIC_DATA",source:"Kraken public OHLC",fetchedAt:time,candles:[{close:90000}],summary:{price:90000,change24h:1.2,rsi:55,regime:"UPTREND",lastTime:12345}}),
 validateSolana:(v:string)=>v.length>=32&&v.length<=44
};
test("router recognizes source intent without granting execution",()=>{
 expect(parseResearchIntent("Analyze Polymarket volume and event evidence")).toMatchObject({lane:"prediction"});
 expect(parseResearchIntent("Inspect Hyperliquid BTC funding")).toMatchObject({lane:"perps",symbol:"BTC"});
 expect(parseResearchIntent("Summarize BTC candles")).toMatchObject({lane:"kraken",symbol:"BTC"});
 expect(parseResearchIntent("anything")).toMatchObject({lane:"pulse"});
 expect(parseResearchIntent("x")).toEqual({error:"PROMPT_LENGTH_INVALID"});
});
test("real named provider observations include source, timestamp, and no claims of independently verified data",async()=>{
 const r:any=await runMarketResearch("Inspect Hyperliquid BTC funding",deps,()=>time);
 expect(r.status).toBe("SOURCE_OBSERVED");
 expect(r.model).toBe("DETERMINISTIC_SOURCE_ROUTER");
 expect(r.evidence[0].values.fundingRateRaw).toBe(-0.0001);
 expect(r.evidence[0].observedAt).toBe(time);
 expect(r.financialExecution).toBe(false);
 expect(r.independentlyVerified).toBe(false);
 expect(r.evidence[0].sourceUrl).toContain("hyperliquid");
});
test("Kraken deterministic fallback never becomes a live market observation",async()=>{
 const r:any=await runMarketResearch("Analyze BTC technical candles",{...deps,kraken:async()=>({mode:"DEMO_DATA",candles:[{close:100}]})},()=>time);
 expect(r.status).toBe("SOURCE_UNAVAILABLE");
 expect(r.mode).toBe("DEMO_DATA");
 expect(r.evidence).toEqual([]);
});
test("failed independent provider remains unavailable while working venue is retained",async()=>{
 const r:any=await runMarketResearch("What's going on across markets?",{...deps,pulse:async()=>({observedAt:time,prediction:{state:"SOURCE_UNAVAILABLE",items:[]},perps:(await deps.pulse()).perps})},()=>time);
 expect(r.status).toBe("SOURCE_OBSERVED");
 expect(r.unavailableSources).toEqual(["prediction"]);
 expect(r.evidence).toHaveLength(1);
});
test("Solana research refuses missing address without upstream request",async()=>{
 let called=0;
 const r:any=await runMarketResearch("Inspect Solana token liquidity",{...deps,solana:async()=>{called++;return {status:"OBSERVED"}}});
 expect(r.status).toBe("NEEDS_TOKEN_ADDRESS");
 expect(called).toBe(0);
});
test("public outage does not hallucinate any market data",async()=>{
 const r:any=await runMarketResearch("Analyze Polymarket market volume",{...deps,pulse:async()=>{throw Error("offline")}});
 expect(r.status).toBe("SOURCE_UNAVAILABLE");
 expect(r.evidence).toHaveLength(0);
});
