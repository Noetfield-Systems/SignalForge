import {test,expect} from "bun:test";
import {compileMarketWorkPacket,stableStringify,sourceHash,evaluateObservedExecution,measuredUsage,buildExecutionArtifactAndReceipt,verifyExecutionReceipt,MARKET_RESEARCH_SKILL} from "../src/sourcea-execution-adapter.ts";

const id="b2a20a83-50f5-46ca-8b4d-4ab108a099fd";
const now=()=>new Date().toISOString();
function fixture(){
 const prompt="Inspect Hyperliquid BTC funding and open interest";
 const {value:packet}=compileMarketWorkPacket(prompt,id) as any;
 const observedAt=now();
 const result={schema:"signalforge.agent-research.v1",prompt,tool:packet.tool,lane:"perps",status:"SOURCE_OBSERVED",mode:"SOURCE_REPORTED",financialExecution:false,
  executedAt:observedAt,evidence:[{venue:"Hyperliquid",label:"BTC",source:"Hyperliquid public Info API",sourceUrl:"https://app.hyperliquid.xyz/trade/BTC",observedAt,values:{fundingRateRaw:-0.0003,openInterestUsdApprox:1234},independentlyVerified:false}]};
 return {packet,result};
}
test("canonical stable hashing is SourceA-compatible and invariant to object key order",async()=>{
 const a={z:[3,1],b:{y:9,a:1}},b={b:{a:1,y:9},z:[3,1]};
 expect(stableStringify(a)).toBe(stableStringify(b));
 expect(await sourceHash(a)).toBe(await sourceHash(b));
 expect(await sourceHash(a)).toMatch(/^[0-9a-f]{64}$/);
});
test("SignalForge customer workpacket is SourceA compatible and excludes internal/external financial capability",()=>{
 const r:any=compileMarketWorkPacket("Inspect Hyperliquid BTC funding",id);
 expect(r.value.schema).toBe("sourcea.signalforge-workpacket.v1");
 expect(r.value.allowedCapabilities).toEqual(["read:market.perps"]);
 expect(r.value.forbiddenCapabilities).toContain("company_os_dispatch");
 expect(r.value.forbiddenCapabilities).toContain("wallet_sign");
 expect(r.value.budget).toBeUndefined();
 expect(r.value.limits.externalSpendAuthorizedUsd).toBe(0);
 expect(MARKET_RESEARCH_SKILL.runtime).toBe("SIGNALFORGE_LOCAL_READONLY");
 expect(compileMarketWorkPacket("x",id)).toEqual({error:"PROMPT_LENGTH_INVALID"});
});
test("observed fresh market source required, not provider-unavailable or invented proof",()=>{
 const {packet,result}=fixture();
 expect(evaluateObservedExecution(packet,result).verdict).toBe("PASS");
 expect(evaluateObservedExecution(packet,{...result,status:"SOURCE_UNAVAILABLE",evidence:[]}).verdict).toBe("FAIL");
 expect(evaluateObservedExecution(packet,{...result,evidence:[{...result.evidence[0],observedAt:"2026-01-01T00:00:00Z"}]}).reason).toBe("SOURCE_PROVENANCE_OR_FRESHNESS_INVALID");
 expect(evaluateObservedExecution(packet,{...result,evidence:[{...result.evidence[0],sourceUrl:"https://attacker.example"}]}).verdict).toBe("FAIL");
 expect(evaluateObservedExecution(packet,{...result,financialExecution:true}).verdict).toBe("FAIL");
 expect(evaluateObservedExecution({...packet,allowedCapabilities:["trade"]},result).verdict).toBe("FAIL");
});
test("receipt hashes bind workpacket and actual source result, and independent verifier rejects tampering",async()=>{
 const {packet,result}=fixture();
 const startedAt=now(),finishedAt=now();
 const {artifact,receipt}=await buildExecutionArtifactAndReceipt({taskId:id,packet,result,startedAt,finishedAt,attempt:1,usage:measuredUsage(Date.now()-300,Date.now())});
 expect(receipt.evaluation.verdict).toBe("PASS");
 expect(receipt.financialExecution).toBe(false);
 expect(receipt.signatureType).toBe("SHA256_INTEGRITY_DIGEST_NOT_SIGNED");
 const verified=await verifyExecutionReceipt(packet,artifact,receipt);
 expect(verified.valid).toBe(true);
 expect((await verifyExecutionReceipt(packet,{...artifact,sourceCount:999},receipt)).reason).toBe("ARTIFACT_INTEGRITY_MISMATCH");
 expect((await verifyExecutionReceipt(packet,artifact,{...receipt,receiptHash:"0".repeat(64)})).reason).toBe("RECEIPT_INTEGRITY_MISMATCH");
 expect((await verifyExecutionReceipt({...packet,allowedCapabilities:["trade"]},artifact,receipt)).valid).toBe(false);
});
test("failure receipt remains a failure and does not become a PASS if hash is valid",async()=>{
 const {packet,result}=fixture();const unavailable={...result,status:"SOURCE_UNAVAILABLE",evidence:[]};
 const {artifact,receipt}=await buildExecutionArtifactAndReceipt({taskId:id,packet,result:unavailable,startedAt:now(),finishedAt:now(),attempt:1,usage:measuredUsage(0,30)});
 expect(receipt.evaluation.verdict).toBe("FAIL");
 expect((await verifyExecutionReceipt(packet,artifact,receipt)).valid).toBe(false);
});
test("metering does not invent actual billed provider or infrastructure charges",()=>{
 const x=measuredUsage(100,420);
 expect(x.wallMs).toBe(320);
 expect(x.modelCalls).toBe(0);
 expect(x.modelChargeUsd).toBe(0);
 expect(x.providerBilledUsd).toBeNull();
 expect(x.infrastructureCostUsd).toBeNull();
 expect(x.totalSettledCostUsd).toBeNull();
});
