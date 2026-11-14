import {test,expect} from "bun:test";
import {MARKET_PULSE_SOURCES,normalizePolymarketEvents,normalizeHyperliquidPerps,getWeb3NativePulse} from "../src/web3-native-pulse.ts";
const at="2026-11-14T05:30:00.000Z";
test("prediction market observations have real source timestamps and safely constrained external paths",()=>{
 const r=normalizePolymarketEvents([{title:"Will XYZ event occur before year end?",slug:"will-xyz-event-occur",volume24hr:"12345.67",liquidity:"5000",closed:false,endDate:"2026-12-31"},
  {title:"Bad url item",slug:"https://evil.example/",volume24hr:999999},
  {title:"Expired",slug:"expired",closed:true}],at);
 expect(r).toHaveLength(1);
 expect(r[0].volume24h).toBe(12345.67);
 expect(r[0].publicUrl).toBe("https://polymarket.com/event/will-xyz-event-occur");
 expect(r[0].independentlyVerified).toBe(false);
 expect(r[0].observedAt).toBe(at);
 expect(()=>normalizePolymarketEvents({message:"not real"} as any,at)).toThrow(/SOURCE_SHAPE/);
});
test("perp market fields retain funding sign, source and explicitly estimated OI notional",()=>{
 const rows=normalizeHyperliquidPerps([{universe:[{name:"BTC"},{name:"ETH",isDelisted:true}]},
  [{dayNtlVlm:"123456",markPx:"50000",openInterest:"12.5",funding:"-0.000014"},
   {markPx:"2000",openInterest:"10",dayNtlVlm:"600"}]],at);
 expect(rows).toHaveLength(1);
 expect(rows[0].openInterestUsdApprox).toBe(625000);
 expect(rows[0].fundingRateRaw).toBe(-0.000014);
 expect(rows[0].source).toBe("Hyperliquid public Info API");
 expect(rows[0].independentlyVerified).toBe(false);
 expect(()=>normalizeHyperliquidPerps(["bad"],at)).toThrow(/SOURCE_SHAPE/);
});
test("real source adapters are explicit read only and no provider failure is fabricated as live",async()=>{
 const calls:any[]=[];
 const mock=async(url:string,options:any)=>{
  calls.push({url,options});
  if(url===MARKET_PULSE_SOURCES.prediction)return {ok:true,json:async()=>[{title:"Will a real event resolve?",slug:"real-event",volume24hr:"900",liquidity:"80"}]};
  if(url===MARKET_PULSE_SOURCES.perps)return {ok:true,json:async()=>[{universe:[{name:"BTC"}]},{length:0}]};
  throw Error("unrecognized");
 };
 const p=await getWeb3NativePulse(mock as any,()=>new Date(at));
 expect(p.prediction.state).toBe("SOURCE_OBSERVED");
 expect(p.perps.state).toBe("SOURCE_UNAVAILABLE");
 expect(p.perps.items).toHaveLength(0);
 expect(p.prediction.items).toHaveLength(1);
 expect(p.independentlyVerified).toBe(false);
 expect(p.executionAuthorized).toBe(false);
 expect(p.trenches.path).toBe("/radar");
 expect(calls).toHaveLength(2);
 expect(calls[0].options.method).toBe("GET");
 expect(calls[1].options.method).toBe("POST");
 expect(JSON.parse(calls[1].options.body)).toEqual({type:"metaAndAssetCtxs"});
});
test("provider offline returns honest unavailable states without invented numbers",async()=>{
 const p=await getWeb3NativePulse((async()=>{throw Error("offline")}) as any,()=>new Date(at));
 expect(p.prediction.state).toBe("SOURCE_UNAVAILABLE");
 expect(p.perps.state).toBe("SOURCE_UNAVAILABLE");
 expect(p.prediction.items).toEqual([]);
 expect(p.perps.items).toEqual([]);
});
