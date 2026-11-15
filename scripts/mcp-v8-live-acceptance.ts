import {Client,StreamableHTTPClientTransport} from "@modelcontextprotocol/client";
const BASE=(Bun.env.BASE||"https://signalforge-web-production.up.railway.app").replace(/\/$/,"");
function assert(ok:unknown,message:string):asserts ok{if(!ok)throw Error(message)}
async function get(path:string){
 const r=await fetch(BASE+path,{headers:{accept:"text/html,application/json"},signal:AbortSignal.timeout(15000)});
 return {status:r.status,text:await r.text()};
}
let html:string|undefined;
for(let i=0;i<42;i++){
 try{
  const r=await get("/developers");
  if(r.status===200&&r.text.includes("Market intelligence.")&&r.text.includes('id="createKey"')){html=r.text;break}
 }catch{}
 await Bun.sleep(2500);
}
assert(html,"DEVELOPERS_PAGE_NOT_PUBLISHED");
assert(html.includes(BASE+"/mcp"),"MCP_INSTALL_ENDPOINT_MISSING");
assert(html.includes('"/api/api-keys"'),"ACCOUNT_API_KEY_PATH_MISSING");
const manifest=await get("/server.json"),wellKnown=await get("/.well-known/mcp/server.json");
assert(manifest.status===200&&wellKnown.status===200,"REGISTRY_METADATA_NOT_ACCESSIBLE");
const j=JSON.parse(manifest.text);
assert(j.name==="io.github.Noetfield-Systems/signalforge","REGISTRY_NAMESPACE_MISMATCH");
assert(j.remotes?.[0]?.url===BASE+"/mcp","REGISTRY_REMOTE_MISMATCH");
assert(JSON.parse(wellKnown.text).name===j.name,"WELL_KNOWN_MISMATCH");
console.log("MCP_V8_DISTRIBUTION_PAGE_AND_MANIFEST_PASS");
const c=new Client({name:"signalforge-v8-distribution-readback",version:"1.0.0"},{versionNegotiation:{mode:"auto"}});
try{
 await c.connect(new StreamableHTTPClientTransport(new URL(BASE+"/mcp")));
 const listed=await c.listTools();
 assert(listed.tools.some(x=>x.name==="analyze_perps"),"PUBLIC_TOOLS_NOT_DISCOVERABLE");
 const r:any=await c.callTool({name:"analyze_perps",arguments:{symbol:"BTC"}});
 const data=r.structuredContent||JSON.parse(r.content?.find((x:any)=>x.type==="text")?.text||"{}");
 assert(data.status==="SOURCE_OBSERVED"&&data.observations?.some((o:any)=>o.sourceUrl?.startsWith("https://app.hyperliquid.xyz/")),"REAL_HYPERLIQUID_NOT_AVAILABLE");
 assert(data.financialExecution===false,"FALSE_TRADE_CLAIM");
 console.log("MCP_V8_EXTERNAL_PUBLIC_TOOL_PASS");
}finally{await c.close().catch(()=>{})}
const admin=await get("/api/admin/mcp-usage");
assert(admin.status===403,"ADMIN_USAGE_METRICS_EXPOSED");
console.log("MCP_V8_ADMIN_METRICS_DENIAL_PASS");
console.log("MCP_V8_PRODUCTION_ACCEPTED",j.name);
