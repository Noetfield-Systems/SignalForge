import {Client,StreamableHTTPClientTransport} from "@modelcontextprotocol/client";
/** Independent real external MCP client against deployed SignalForge, with disposable owned user. */
const BASE=(Bun.env.BASE||"https://signalforge-web-production.up.railway.app").replace(/\/$/,"");
const pass="McpV7#"+crypto.randomUUID()+"aA1!";
const users:{email:string;cookie:string}[]=[];
function assert(cond:any,message:string):asserts cond{if(!cond)throw Error(message)}
async function api(path:string,body?:any,cookie="",method="GET"){
 const r=await fetch(BASE+path,{method:body? "POST":method,headers:{"content-type":"application/json",...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(17000)});
 const raw=await r.text();let data:any;try{data=JSON.parse(raw)}catch{data={raw:raw.slice(0,400)}}
 return {status:r.status,data,cookie:(r.headers.get("set-cookie")||"").split(";")[0]};
}
async function signup(){
 const email="sf-mcp7-"+crypto.randomUUID().slice(0,15)+"@signalforge.invalid";
 const result=await api("/api/auth/signup",{email,password:pass,emailConsent:false,marketingSource:"external_mcp_e2e"});
 assert(result.status===201,"MCP_SIGNUP_FAILED "+JSON.stringify(result.data));
 const user={email,cookie:result.cookie};users.push(user);
 const key=await api("/api/api-keys",{},user.cookie);
 assert(key.status===201&&key.data.apiKey?.startsWith("sf_live_"),"CUSTOMER_API_KEY_MISSING "+JSON.stringify(key.data));
 return {...user,key:key.data.apiKey as string};
}
function textResult(v:any){const r=v.structuredContent||JSON.parse(v.content?.find((x:any)=>x.type==="text")?.text||"{}");return r}
async function connect(key?:string){
 const c=new Client({name:"independent-signalforge-production-acceptance",version:"1.0.0"},{versionNegotiation:{mode:"auto"}});
 await c.connect(new StreamableHTTPClientTransport(new URL(BASE+"/mcp"),key?{requestInit:{headers:{Authorization:"Bearer "+key}}}:undefined));
 return c;
}
let account1:any=null,account2:any=null;let c1:Client|null=null,c2:Client|null=null;
try{
 // Wait for actual Railway auto-deploy; never confuse old v6 host with v7.
 let publicClient:Client|null=null,tools:any=null;
 for(let attempt=0;attempt<50;attempt++){
  try{
   const trial=await connect();const v=await trial.listTools();
   if(v.tools?.some(x=>x.name==="verify_research_receipt")&&v.tools?.some(x=>x.name==="market_snapshot")){
    publicClient=trial;tools=v;break
   }
   await trial.close();
  }catch{}
  await Bun.sleep(3000);
 }
 assert(publicClient,"MCP_V7_NOT_DEPLOYED");
 try{
  assert(tools.tools.length>=8,"MCP_TOOLS_MISSING");
  let source:any=null;
  for(let i=0;i<3;i++){
   const r=textResult(await publicClient.callTool({name:"analyze_perps",arguments:{symbol:"BTC"}}));
   if(r.status==="SOURCE_OBSERVED"&&r.observations?.some((o:any)=>o.sourceUrl?.startsWith("https://"))){source=r;break}
   await Bun.sleep(2500);
  }
  assert(source,"MCP_PUBLIC_REAL_HYPERLIQUID_UNAVAILABLE");
  assert(source.financialExecution===false&&source.independentlyVerified===false,"MCP_FALSE_FINANCIAL_OR_VERIFIER_CLAIM");
  console.log("MCP_LIVE_OFFICIAL_V2_CLIENT_PUBLIC_SOURCE_PASS",source.observations.length);
  const blocked=textResult(await publicClient.callTool({name:"create_research_task",arguments:{prompt:"Inspect Hyperliquid BTC funding",engine:"source"}}));
  assert(blocked.error==="SIGNALFORGE_BEARER_API_KEY_REQUIRED","MCP_ANONYMOUS_PRIVATE_ACCESS_NOT_BLOCKED");
  console.log("MCP_LIVE_ANONYMOUS_PRIVATE_SCOPE_PASS");
 }finally{await publicClient.close();}
 account1=await signup();account2=await signup();
 c1=await connect(account1.key);c2=await connect(account2.key);
 const queued=textResult(await c1.callTool({name:"create_research_task",arguments:{prompt:"Inspect Hyperliquid BTC funding and open interest",engine:"source"}}));
 assert(queued.status==="QUEUED"&&queued.taskId,"MCP_QUEUE_NOT_REAL "+JSON.stringify(queued));
 const other=textResult(await c2.callTool({name:"get_task_result",arguments:{taskId:queued.taskId}}));
 assert(other.error==="TASK_NOT_FOUND","MCP_CROSS_TENANT_RESEARCH_LEAK");
 let done:any=null;
 for(let i=0;i<35;i++){
  const x=textResult(await c1.callTool({name:"get_task_result",arguments:{taskId:queued.taskId}}));
  if(x.status==="SUCCEEDED"){done=x;break}
  if(x.status==="FAILED"||x.status==="CANCELLED")throw Error("MCP_TASK_NOT_SUCCEEDED_"+x.status);
  await Bun.sleep(1800);
 }
 assert(done&&done.artifact&&done.receipt,"MCP_TASK_NOT_PERSISTED");
 const verify=textResult(await c1.callTool({name:"verify_research_receipt",arguments:{taskId:queued.taskId}}));
 assert(verify.valid===true&&verify.verdict==="PASS","MCP_RECEIPT_NOT_VALID "+JSON.stringify(verify));
 assert(verify.sourceaCloudExecutor===false&&verify.digitalSignatureVerified===false,"MCP_OVERCLAIM_OF_PROOF");
 console.log("MCP_LIVE_PRIVATE_QUEUE_CROSS_TENANT_RECEIPT_PASS",queued.taskId);
 console.log("MCP_V7_INDEPENDENT_EXTERNAL_CLIENT_E2E_ACCEPTED");
}catch(e:any){
 console.error("MCP_V7_INDEPENDENT_EXTERNAL_CLIENT_FAILED",String(e?.message||e).slice(0,700));
 process.exitCode=1;
}finally{
 await c1?.close().catch(()=>{});await c2?.close().catch(()=>{});
 for(const user of users.reverse()){
  try{
   const r=await api("/api/account/delete",{confirm:"DELETE",password:pass},user.cookie);
   if(r.status===200&&r.data.deleted===true)console.log("MCP_TEMPORARY_CUSTOMER_PURGED");
   else{console.error("MCP_TEMPORARY_CUSTOMER_CLEANUP_FAILED",r.status);process.exitCode=1;}
  }catch(e){console.error("MCP_TEMPORARY_CUSTOMER_CLEANUP_FAILED",String(e));process.exitCode=1}
 }
}
