/**
 * SourceA Execution Adapter for SignalForge consumer research.
 * Stable hashing ported from SourceA packages/executive-control-plane-v0/src/hash.ts
 * at SourceA blob 3cfa38be34a9cc98c5749333c61905c49354a5de.
 * Evidence-required completion follows the SourceA executive kernel's
 * recordEvidence/verifyOutcome contract; this is an isolated versioned export,
 * NOT the SourceA corporate runtime or a live remote SourceA dispatch.
 */
import {parseResearchIntent, type ResearchLane} from "./agent-research.ts";

export const SOURCEA_ADAPTER_VERSION="sourcea.signalforge-execution.v1";
const allowedHosts=new Set(["polymarket.com","app.hyperliquid.xyz","www.kraken.com","dexscreener.com"]);
const SOURCES:Record<ResearchLane,string[]>={prediction:["Polymarket"],perps:["Hyperliquid"],kraken:["Kraken"],solana:["Solana"],pulse:["Polymarket","Hyperliquid"]};
export const MARKET_RESEARCH_SKILL=Object.freeze({
 schema:"sourcea.skill-manifest.v1",skillId:"signalforge.market-research",version:"1.0.0",
 runtime:"SIGNALFORGE_LOCAL_READONLY",input:"prompt",output:"sourcea.signalforge-research-artifact.v1",
 toolAllowlist:["market.prediction.research","market.perps.research","market.kraken.research","market.solana.research","market.pulse.research"],
 resultEvidence:["source_observation","research_artifact","execution_receipt"],
 forbiddenCapabilities:["trade","wallet_sign","transfer","issue_token","change_subscription","company_os_dispatch"]
});
export function stableStringify(value:unknown):string{
 if(value===null||typeof value!=="object")return JSON.stringify(value);
 if(Array.isArray(value))return "["+value.map(x=>stableStringify(x)).join(",")+"]";
 const obj=value as Record<string,unknown>;
 return "{"+Object.keys(obj).sort().filter(k=>obj[k]!==undefined).map(k=>JSON.stringify(k)+":"+stableStringify(obj[k])).join(",")+"}";
}
export async function sourceHash(value:unknown):Promise<string>{
 const bytes=new TextEncoder().encode(stableStringify(value));
 const digest=await crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
}
export function compileMarketWorkPacket(prompt:unknown,taskId:string,scope:{modelEnabled?:boolean}={}){
 const intent=parseResearchIntent(prompt);
 if("error" in intent)return {error:intent.error};
 if(!/^[0-9a-f-]{36}$/.test(taskId))return {error:"INVALID_TASK_ID"};
 const lane=intent.lane,skill=MARKET_RESEARCH_SKILL;
 return {value:{
  schema:"sourcea.signalforge-workpacket.v1",adapterVersion:SOURCEA_ADAPTER_VERSION,
  taskId,skillId:skill.skillId,skillVersion:skill.version,lane,
  taskType:"READ_ONLY_MARKET_RESEARCH",prompt:intent.prompt,
  tool:"market."+lane+".research",runner:"SIGNALFORGE_LOCAL_READONLY",
  allowedCapabilities:["read:market."+lane,...(scope.modelEnabled?["model:bounded_source_synthesis",...Object.keys(SOURCES).filter(x=>x!==lane).map(x=>"read:market."+x)]:[])],forbiddenCapabilities:[...skill.forbiddenCapabilities],
  requiredEvidence:[...skill.resultEvidence],attemptLimit:2,
  limits:{maxPromptChars:900,maxAttempts:2,maxWallTimeMs:60000,externalSpendAuthorizedUsd:scope.modelEnabled?0.08:0},
  sourceProviders:SOURCES[lane],outputSchema:"sourcea.signalforge-research-artifact.v1",
  status:"COMPILED_NOT_DISPATCHED"
 }};
}
function validSource(e:any,nowMs:number){
 if(!e||typeof e!=="object"||typeof e.source!=="string"||typeof e.venue!=="string"||e.independentlyVerified!==false)return false;
 try{const u=new URL(e.sourceUrl);if(u.protocol!=="https:"||!allowedHosts.has(u.hostname))return false}catch{return false}
 const t=Date.parse(e.observedAt||"");
 if(!Number.isFinite(t)||t>nowMs+180000||nowMs-t>10*60*1000)return false;
 return !!e.label&&e.values&&typeof e.values==="object";
}
export function evaluateObservedExecution(packet:any,result:any,nowMs=Date.now()){
 if(packet?.schema!=="sourcea.signalforge-workpacket.v1"||!packet.allowedCapabilities?.includes("read:market."+packet.lane))return {verdict:"FAIL",reason:"WORKPACKET_SCOPE_INVALID"};
 if(packet.status!=="COMPILED_NOT_DISPATCHED")return {verdict:"FAIL",reason:"WORKPACKET_STATE_INVALID"};
 if(result?.status!=="SOURCE_OBSERVED"||result?.mode!=="SOURCE_REPORTED")return {verdict:"FAIL",reason:"NO_FRESH_SOURCE_OBSERVATION"};
 if(result?.lane!==packet.lane||result?.tool!==packet.tool||result?.prompt!==packet.prompt||result?.financialExecution!==false)return {verdict:"FAIL",reason:"TASK_RESULT_MISMATCH"};
 if(!Array.isArray(result.evidence)||!result.evidence.length)return {verdict:"FAIL",reason:"EVIDENCE_MISSING"};
 if(result.evidence.length>12)return {verdict:"FAIL",reason:"EVIDENCE_LIMIT_EXCEEDED"};
 if(result.evidence.some((e:any)=>!packet.sourceProviders.includes(e.venue)||!validSource(e,nowMs)))return {verdict:"FAIL",reason:"SOURCE_PROVENANCE_OR_FRESHNESS_INVALID"};
 return {verdict:"PASS",reason:"SOURCE_EVIDENCE_AND_TASK_CONTRACT_MATCH",observations:result.evidence.length};
}
export function measuredUsage(startedAt:number,finishedAt:number){
 return {schema:"signalforge.execution-usage.v1",wallMs:Math.max(0,finishedAt-startedAt),
  marketSourceToolCalls:1,modelCalls:0,modelChargeUsd:0,
  // Public provider requests have no per-call invoice in this deployment.
  providerBilledUsd:null,infrastructureCostUsd:null,totalSettledCostUsd:null,
  costStatus:"PARTIALLY_METERED_UNBILLED_COMPUTE",billingEvidence:false};
}
export async function buildExecutionArtifactAndReceipt(input:{
 taskId:string,packet:any,result:any,startedAt:string,finishedAt:string,attempt:number,usage:any
}){
 const evaluated=evaluateObservedExecution(input.packet,input.result,Date.parse(input.finishedAt));
 const artifact={
  schema:"sourcea.signalforge-research-artifact.v1",taskId:input.taskId,
  workPacketSchema:input.packet.schema,tool:input.packet.tool,
  executedAt:input.finishedAt,sourceObservation:input.result,
  sourceMode:input.result?.mode,sourceCount:input.result?.evidence?.length||0
 };
 const artifactHash=await sourceHash(artifact);
 const packetHash=await sourceHash(input.packet);
 const body={
  schema:"sourcea.signalforge-execution-receipt.v1",adapterVersion:SOURCEA_ADAPTER_VERSION,
  taskId:input.taskId,artifactHash,packetHash,
  attempt:input.attempt,startedAt:input.startedAt,finishedAt:input.finishedAt,
  evaluator:"SOURCEA_ECP_EVIDENCE_REQUIRED_LOCAL_EXPORT_V1",
  executedBy:"SIGNALFORGE_LOCAL_READONLY",
  evaluation:evaluated,usage:input.usage,
  // This is an independently checkable integrity digest, not a SourceA or provider digital signature.
  signatureType:"SHA256_INTEGRITY_DIGEST_NOT_SIGNED",externalSourceVerification:false,
  financialExecution:false
 };
 return {artifact,receipt:{...body,receiptHash:await sourceHash(body)}};
}
export async function verifyExecutionReceipt(packet:any,artifact:any,receipt:any,nowMs=Date.now()){
 if(!receipt||!artifact||!packet)return {valid:false,reason:"MISSING_EVIDENCE"};
 if(receipt.schema!=="sourcea.signalforge-execution-receipt.v1"||receipt.signatureType!=="SHA256_INTEGRITY_DIGEST_NOT_SIGNED")return {valid:false,reason:"RECEIPT_SCHEMA_INVALID"};
 const {receiptHash,...body}=receipt;
 if(receiptHash!==await sourceHash(body))return {valid:false,reason:"RECEIPT_INTEGRITY_MISMATCH"};
 if(receipt.packetHash!==await sourceHash(packet)||receipt.artifactHash!==await sourceHash(artifact))return {valid:false,reason:"ARTIFACT_INTEGRITY_MISMATCH"};
 if(receipt.taskId!==packet.taskId||artifact.taskId!==packet.taskId||receipt.financialExecution!==false)return {valid:false,reason:"TASK_AUTHORITY_MISMATCH"};
 const verdict=evaluateObservedExecution(packet,artifact.sourceObservation,Date.parse(receipt.finishedAt));
 if(verdict.verdict!=="PASS"||receipt.evaluation?.verdict!=="PASS")return {valid:false,reason:"SOURCE_EVALUATION_FAILED"};
 if(!Number.isFinite(nowMs)||Date.parse(receipt.finishedAt)>nowMs+180000)return {valid:false,reason:"RECEIPT_TIMESTAMP_INVALID"};
 return {valid:true,verdict:"PASS",reason:"HASH_AND_SOURCE_CONTRACT_VERIFIED",sourceObservationCount:artifact.sourceCount,
  verifier:"SIGNALFORGE_INDEPENDENT_PURE_RECEIPT_VERIFIER",providerIndependentlyVerified:false};
}
