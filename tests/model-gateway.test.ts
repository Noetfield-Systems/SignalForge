import {test,expect} from "bun:test";
import {modelGatewayStatus,usageFromProvider,selectMarketTools,synthesizeMarketEvidence,validateGroundedSynthesis} from "../src/model-gateway.ts";
import {agentEntitlements} from "../src/agent-customer.ts";
const cfg={provider:"openai" as const,model:"gpt-4.1-mini",key:"test-only-never-call-network"};
const sample=()=>({prompt:"Inspect Hyperliquid BTC funding",lane:"perps",status:"SOURCE_OBSERVED",evidence:[
 {venue:"Hyperliquid",label:"BTC",source:"Hyperliquid public Info API",sourceUrl:"https://app.hyperliquid.xyz/trade/BTC",observedAt:new Date().toISOString(),values:{fundingRateRaw:0.01},independentlyVerified:false}
]});
test("gateway remains honest when no model keys are configured",()=>{
 const d=modelGatewayStatus({});
 expect(d.configured).toBe(false);expect(d.providers).toHaveLength(0);
 expect(modelGatewayStatus({OPENAI_API_KEY:"test-secret",SIGNALFORGE_OPENAI_MODEL:"gpt-4.1-mini"}).providers).toEqual([{provider:"openai",model:"gpt-4.1-mini"}]);
 expect(JSON.stringify(d)).not.toContain("test-secret");
});
test("provider-reported tokens and operator-configured rates are estimates, never settlement",()=>{
 const u=usageFromProvider(cfg,{prompt_tokens:10000,completion_tokens:3000},{SIGNALFORGE_OPENAI_INPUT_USD_PER_M:"0.4",SIGNALFORGE_OPENAI_OUTPUT_USD_PER_M:"1.6"});
 expect(u.totalTokens).toBe(13000);expect(u.estimatedUsd).toBe(0.0088);expect(u.settledUsd).toBeNull();
 expect(usageFromProvider(cfg,{input_tokens:1,output_tokens:3},{}).estimatedUsd).toBeNull();
});
test("structured tool selection only permits 2 distinct read-only lanes with primary preserved",async()=>{
 const mock=async()=>({text:"",toolInput:{lanes:["prediction","kraken","trade","perps"]},usage:usageFromProvider(cfg,{prompt_tokens:100,completion_tokens:15}),responseId:"fake",streamed:false});
 const r=await selectMarketTools("Compare BTC Hyperliquid and Polymarket", "perps",mock as any,{OPENAI_API_KEY:"test-only"});
 expect(r.lanes).toEqual(["perps","prediction"]);expect(r.planner?.provider).toBe("openai");
 expect((await selectMarketTools("Inspect BTC","kraken",mock as any,{})).error).toBe("MODEL_NOT_CONFIGURED");
});
test("model output cannot invent numeric quotes, arbitrary IDs or trade certainty",()=>{
 const e=sample().evidence;
 const ok=JSON.stringify({analysis:"Funding appears directionally informative, but source reporting does not resolve causality.",claims:[{sourceId:"S1",insight:"The reported funding observation needs confirmation in a later source snapshot."}],watchPoints:["Recheck the funding source for changes."],limitations:["This is provider reported data."]});
 expect(validateGroundedSynthesis(ok,e).ok).toBe(true);
 expect(validateGroundedSynthesis(ok.replace("S1","S999"),e).ok).toBe(false);
 expect(validateGroundedSynthesis(ok.replace("informative","99% guaranteed"),e).ok).toBe(false);
 expect(validateGroundedSynthesis("fake",e).ok).toBe(false);
});
test("real model call adapter is separately testable without claiming network invocation",async()=>{
 const fake=async(cfg:any,opts:any)=>({text:JSON.stringify({analysis:"Market activity appears significant within the retrieved venue observations.",claims:[{sourceId:"S1",insight:"Source observations suggest further comparison is useful."}],watchPoints:["Compare this source in a later session."],limitations:["No independent provider verification is included."]}),toolInput:null,usage:usageFromProvider(cfg,{prompt_tokens:240,completion_tokens:75}),responseId:"fake-test-response",streamed:true});
 const r=await synthesizeMarketEvidence({prompt:"Check BTC",observations:[sample()],memory:["Saved user preference: BTC only"]},fake as any,{OPENAI_API_KEY:"placeholder"});
 expect(r.status).toBe("MODEL_EXECUTED");expect(r.usage?.totalTokens).toBe(315);expect(r.responseId).toBe("fake-test-response");
});
test("paid entitlements are explicitly bounded and free retains useful sourced access",()=>{
 const free=agentEntitlements("explorer"),pro=agentEntitlements("pro"),trial=agentEntitlements("quant",true),quant=agentEntitlements("quant");
 expect(free.sourceResearchPerDay).toBeGreaterThan(0);
 expect(free.modelResearchPerDay).toBe(0);
 expect(pro.modelResearchPerDay).toBeGreaterThan(0);
 expect(trial.modelResearchPerDay).toBeLessThan(quant.modelResearchPerDay);
 expect(free.forgeMonitors).toBe(1);
});
