/**
 * Optional MCP Client for SignalForge customer workspace.
 * Uses the official SDK, requires an operator-pinned external HTTPS server and
 * tool allowlist. No arbitrary user URLs, Company OS secrets or trading tools.
 */
import {Client,StreamableHTTPClientTransport} from "@modelcontextprotocol/client";
export const EXTERNAL_MCP_SCHEMA="signalforge.external-mcp-client.v1";
export type ExternalMcpSettings={url:string;allowedHost:string;allowedTools:string[]};
export function externalMcpConfig(env:Record<string,string|undefined>=Bun.env):ExternalMcpSettings|null{
 const raw=env.SIGNALFORGE_EXTERNAL_MCP_URL||"";
 const allowedHost=env.SIGNALFORGE_EXTERNAL_MCP_ALLOWED_HOST||"";
 const allowedTools=(env.SIGNALFORGE_EXTERNAL_MCP_ALLOWED_TOOLS||"").split(",").map(x=>x.trim()).filter(Boolean);
 if(!raw||!allowedHost||!allowedTools.length)return null;
 try{
  const u=new URL(raw);
  if(u.protocol!=="https:"||u.username||u.password||u.hash||u.search||u.hostname!==allowedHost||u.port||
   u.hostname==="localhost"||u.hostname.endsWith(".local")||!u.hostname.includes(".")||
   allowedTools.some(x=>!/^[a-zA-Z][a-zA-Z0-9_-]{1,70}$/.test(x)))return null;
  return {url:u.toString(),allowedHost,allowedTools:[...new Set(allowedTools)]};
 }catch{return null}
}
export async function connectExternalMcp<T>(
 config:ExternalMcpSettings,
 operation:(client:Client)=>Promise<T>,
 fetchFn:typeof fetch=fetch
):Promise<T>{
 const client=new Client({name:"signalforge-customer-market-client",version:"1.0.0"},{versionNegotiation:{mode:"auto"}});
 const transport=new StreamableHTTPClientTransport(new URL(config.url),{
  redirectPolicy:"same-origin",
  fetch:(url:any,init:any)=>fetchFn(url,{...init,signal:AbortSignal.timeout(12000),redirect:"error"})
 });
 try{
  await client.connect(transport);
  return await operation(client);
 }finally{await client.close().catch(()=>{})}
}
export async function listExternalMcpTools(env:Record<string,string|undefined>=Bun.env){
 const cfg=externalMcpConfig(env);
 if(!cfg)return {schema:EXTERNAL_MCP_SCHEMA,configured:false,tools:[],scope:"DISABLED_NOT_FAKE_CONNECTED"};
 const tools=await connectExternalMcp(cfg,async client=>(await client.listTools()).tools
  .filter(t=>cfg.allowedTools.includes(t.name))
  .map(t=>({name:t.name,description:t.description||"",inputSchema:t.inputSchema})));
 return {schema:EXTERNAL_MCP_SCHEMA,configured:true,tools,host:cfg.allowedHost,scope:"OPERATOR_ALLOWLIST_ONLY"};
}
export async function callExternalMcpTool(name:string,args:any,env:Record<string,string|undefined>=Bun.env){
 const cfg=externalMcpConfig(env);
 if(!cfg)return {error:"EXTERNAL_MCP_NOT_CONFIGURED"};
 if(!cfg.allowedTools.includes(name))return {error:"EXTERNAL_MCP_TOOL_NOT_ALLOWED"};
 if(typeof args!=="object"||Array.isArray(args)||args===null||JSON.stringify(args).length>1600)return {error:"EXTERNAL_MCP_ARGUMENTS_INVALID"};
 return connectExternalMcp(cfg,async client=>{
  const listed=(await client.listTools()).tools.find(t=>t.name===name);
  if(!listed)return {error:"EXTERNAL_MCP_TOOL_NOT_ADVERTISED"};
  // Untrusted outputs must never be interpreted as SourceA verification,
  // permission or payment authority.
  const value:any=await client.callTool({name,arguments:args},{},{timeout:12000});
  const content=Array.isArray(value.content)?value.content.filter((x:any)=>x.type==="text").map((x:any)=>String(x.text||"").slice(0,3500)).slice(0,4):[];
  return {schema:EXTERNAL_MCP_SCHEMA,status:value.isError?"TOOL_ERROR":"TOOL_RESULT_UNVERIFIED",
   host:cfg.allowedHost,tool:name,content,untrusted:true,sourceaVerified:false,
   settlementEvidence:false,tradeAuthority:false};
 });
}
