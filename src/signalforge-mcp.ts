/**
 * SignalForge MCP Fabric v1 — official MCP SDK 2.x, Streamable HTTP.
 * Public sources and private SourceA-compatible tasks share ONE existing Bun
 * server, ONE PostgreSQL database and ONE customer executor.
 * Not an independent SourceA Verify server or a Company OS runtime.
 */
import {createMcpHandler,McpServer} from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import {verifyExecutionReceipt} from "./sourcea-execution-adapter.ts";

export const SIGNALFORGE_MCP_VERSION="signalforge.mcp-fabric.v1";
type Db={unsafe:(sql:string,args?:any[])=>Promise<any[]>};
export type McpPrincipal={id:string;user_id:string;plan:string;rateLimited?:boolean}|null;
export type McpDeps={
 principal:McpPrincipal;db:Db|null;dbReady:boolean;
 research:(prompt:string)=>Promise<any>;
 quota:(userId:string,type:"source"|"model")=>Promise<{eligible:boolean;limit:number;consumed:number;entitlements:any}>;
 newTask:(db:Db,userId:string,prompt:string,scheduleId:string|null,options:{modelEnabled:boolean})=>Promise<any>;
 getTask:(db:Db,userId:string,taskId:string)=>Promise<any>;
 cancelTask:(db:Db,userId:string,taskId:string)=>Promise<boolean>;
 modelConfigured:()=>boolean;
 recordToolEvent?:(event:{tool:string;status:"SUCCEEDED"|"FAILED";durationMs:number})=>Promise<void>;
};
const symbol=z.enum(["BTC","ETH","SOL","XRP","ADA","DOGE","LINK","AVAX","LTC","DOT"]);
const uuid=z.string().uuid();
function reply(value:any,error=false){
 return {content:[{type:"text" as const,text:JSON.stringify(value)}],structuredContent:value,isError:error};
}
function fail(message:string){return reply({schema:SIGNALFORGE_MCP_VERSION,status:"ERROR",error:message},true)}
function privateOwner(deps:McpDeps){
 if(!deps.dbReady||!deps.db)return "DATABASE_UNAVAILABLE";
 if(!deps.principal)return "SIGNALFORGE_BEARER_API_KEY_REQUIRED";
 if(deps.principal.rateLimited)return "API_KEY_RATE_LIMITED";
 if(deps.principal.plan==="explorer")return "PAID_DEVELOPER_API_REQUIRED";
 return null;
}
function sourceView(d:any){
 // No synthetic demo data, trading authority or inferred certainty.
 return {schema:"signalforge.mcp-source-observation.v1",sourceMode:d.mode,tool:d.tool,
  status:d.status,executedAt:d.executedAt,observedAt:d.observedAt||null,
  summary:d.summary,observations:Array.isArray(d.evidence)?d.evidence:[],
  limitations:d.limitations||[],unavailableSources:d.unavailableSources||[],
  financialExecution:false,independentlyVerified:false,
  workspace:"https://signalforge-web-production.up.railway.app/agent"};
}
export function makeSignalForgeMcpHandler(deps:McpDeps){
 // Count actual tool calls, not protocol initialization/discovery traffic.
 const observed=(name:string,run:(args:any)=>Promise<any>)=>async(args:any)=>{
  const started=Date.now();
  let outcome:any;
  try{outcome=await run(args)}catch{outcome=fail("MCP_TOOL_RUNTIME_UNAVAILABLE")}
  if(deps.recordToolEvent)try{
   await deps.recordToolEvent({tool:name,status:outcome?.isError?"FAILED":"SUCCEEDED",
    durationMs:Math.max(0,Date.now()-started)});
  }catch{/* Telemetry failure must not alter a research result. */}
  return outcome;
 };
 return createMcpHandler(()=>{
  const server=new McpServer({name:"signalforge-market-intelligence",version:"1.0.0"});
  const registerSource=(name:string,description:string,schema:any,compile:(p:any)=>string)=>
   server.registerTool(name,{description,inputSchema:schema,annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true}},
    observed(name,async (args:any)=>{
     try{
      const result=await deps.research(compile(args));
      if(result?.status!=="SOURCE_OBSERVED")return reply(sourceView(result),true);
      return reply(sourceView(result));
     }catch{return fail("MARKET_SOURCE_UNAVAILABLE")}
    }));
  registerSource("market_snapshot","Read actual completed Kraken OHLC market observations, timestamped and linked to their public source. No forecast or trade.",
   z.object({symbol:symbol.default("BTC")}),({symbol}:any)=>"Analyze Kraken "+symbol+" USD OHLC completed candles and indicators");
  registerSource("analyze_perps","Read actual Hyperliquid perpetual funding and open-interest snapshots from existing SignalForge adapters.",
   z.object({symbol:symbol.default("BTC")}),({symbol}:any)=>"Inspect Hyperliquid "+symbol+" perps funding and open interest");
  registerSource("research_prediction_market","Inspect public Polymarket event-market observations, probabilities are source-reported only.",
   z.object({}),()=> "Inspect Polymarket prediction event market activity");
  registerSource("inspect_solana_token","Inspect DEX Screener reported Solana mint liquidity; requires a valid Solana base58 address.",
   z.object({mintAddress:z.string().min(32).max(44)}),({mintAddress}:any)=>"Inspect Solana token liquidity for mint address "+mintAddress);
  server.registerTool("create_research_task",{
   description:"Submit user-owned, read-only market research WorkPacket to existing durable SignalForge queue. Requires personal paid SignalForge API key.",
   inputSchema:z.object({prompt:z.string().min(5).max(900),engine:z.enum(["source","auto"]).default("source")}),
   annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false}
  },observed("create_research_task",async ({prompt,engine}:any)=>{
   const gate=privateOwner(deps);if(gate)return fail(gate);
   const db=deps.db!,userId=deps.principal!.user_id;
   try{
    const quota=await deps.quota(userId,"source");
    if(!quota.eligible)return fail("SOURCE_RESEARCH_QUOTA_REACHED");
    const modelQuota=await deps.quota(userId,"model");
    const modelEnabled=engine==="auto"&&deps.modelConfigured()&&modelQuota.eligible;
    const task=await deps.newTask(db,userId,prompt,null,{modelEnabled});
    if("error" in task)return fail(task.error);
    return reply({schema:SIGNALFORGE_MCP_VERSION,taskId:task.taskId,status:"QUEUED",engine:modelEnabled?"INTELLIGENT_REQUESTED":"SOURCE_ONLY",
     pollWith:"get_task_result",verifyWith:"verify_research_receipt",cancelWith:"cancel_research_task",
     customerOwned:true,workspace:"https://signalforge-web-production.up.railway.app/agent"});
   }catch{return fail("CUSTOMER_TASK_CREATION_UNAVAILABLE")}
  }));
  server.registerTool("get_task_result",{description:"Read your queued/finished research, source artifact and bounded task events. Owner scope enforced.",
   inputSchema:z.object({taskId:uuid}),annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},
   observed("get_task_result",async ({taskId}:any)=>{
    const gate=privateOwner(deps);if(gate)return fail(gate);
    const t=await deps.getTask(deps.db!,deps.principal!.user_id,taskId);
    if(!t)return fail("TASK_NOT_FOUND");
    return reply({schema:SIGNALFORGE_MCP_VERSION,id:t.id,status:t.status,attempts:t.attempts,events:t.events,artifact:t.artifact,
     receipt:t.receipt,usage:t.usage,lastError:t.lastError,executionAuthority:"READ_ONLY_MARKET_RESEARCH",customerOwned:true});
   }));
  server.registerTool("verify_research_receipt",{description:"Independently recompute SourceA-compatible artifact hash and source timestamp contract for your completed task. SHA-256 is not a provider signature.",
   inputSchema:z.object({taskId:uuid}),annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},
   observed("verify_research_receipt",async ({taskId}:any)=>{
    const gate=privateOwner(deps);if(gate)return fail(gate);
    const t=await deps.getTask(deps.db!,deps.principal!.user_id,taskId);
    if(!t)return fail("TASK_NOT_FOUND");
    if(t.status!=="SUCCEEDED"||!t.artifact||!t.receipt)return fail("NO_COMPLETED_RECEIPT");
    const verified=await verifyExecutionReceipt(t.packet,t.artifact,t.receipt);
    return reply({schema:SIGNALFORGE_MCP_VERSION,taskId,receiptHash:t.receipt.receiptHash,...verified,
     sourceProviderVerified:false,digitalSignatureVerified:false,sourceaCloudExecutor:false},!verified.valid);
   }));
  server.registerTool("cancel_research_task",{description:"Cancel only your own queued or running read-only customer research task. No payment or trade effects.",
   inputSchema:z.object({taskId:uuid}),annotations:{readOnlyHint:false,destructiveHint:true,openWorldHint:false}},
   observed("cancel_research_task",async ({taskId}:any)=>{
    const gate=privateOwner(deps);if(gate)return fail(gate);
    const ok=await deps.cancelTask(deps.db!,deps.principal!.user_id,taskId);
    return ok?reply({schema:SIGNALFORGE_MCP_VERSION,taskId,status:"CANCELLED"}):fail("TASK_NOT_FOUND_OR_INELIGIBLE");
   }));
  return server;
 });
}
