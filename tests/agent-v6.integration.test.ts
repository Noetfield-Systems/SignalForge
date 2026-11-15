import {beforeAll,afterAll,test,expect} from "bun:test";
import postgres from "postgres";
import {drainSourceATasks} from "../src/sourcea-task-runtime.ts";
import {recordMarketNotification} from "../src/agent-customer.ts";
import {compareMarketObservations} from "../src/agent-compare.ts";
const url=Bun.env.DATABASE_URL||"";
if(!url.includes("/signalforge_test"))throw Error("Use only disposable signalforge_test");
const db=postgres(url,{ssl:false,max:2});
const PORT=18984,BASE="http://127.0.0.1:"+PORT;
const users:string[]=[];
let server:ReturnType<typeof Bun.spawn>|null=null;
async function call(path:string,init:RequestInit={}){
 const r=await fetch(BASE+path,init);return {status:r.status,data:await r.json().catch(()=>null),cookie:(r.headers.get("set-cookie")||"").split(";")[0]};
}
const post=(cookie:string,body:any,origin?:string)=>({method:"POST",headers:{"content-type":"application/json",cookie,...(origin?{origin}:{})},body:JSON.stringify(body)});
async function signup(){
 const email="v6-"+crypto.randomUUID()+"@signalforge.test",password="TestResearch#StrongPass2026";
 const r=await call("/api/auth/signup",post("",{email,password,emailConsent:false}));
 expect(r.status).toBe(201);users.push(r.data.user.id);return {id:r.data.user.id,email,password,cookie:r.cookie};
}
function observed(prompt:string,value:number){
 const at=new Date().toISOString();return {schema:"signalforge.agent-research.v1",tool:"market.perps.research",lane:"perps",prompt,runId:crypto.randomUUID(),executedAt:at,readOnly:true,model:"DETERMINISTIC_SOURCE_ROUTER",financialExecution:false,independentlyVerified:false,
 status:"SOURCE_OBSERVED",mode:"SOURCE_REPORTED",summary:"Disposable TEST market observation, not production evidence.",limitations:["Fixture: not externally verified."],
 evidence:[{venue:"Hyperliquid",label:"BTC",source:"Hyperliquid public Info API",sourceUrl:"https://app.hyperliquid.xyz/trade/BTC",observedAt:at,values:{fundingRateRaw:value,openInterestUsdApprox:50000},independentlyVerified:false}]};
}
beforeAll(async()=>{
 server=Bun.spawn(["bun","run","src/server.ts"],{cwd:new URL("../",import.meta.url).pathname,env:{...Bun.env,PORT:String(PORT),NODE_ENV:"test",DATABASE_SSL:"disable"},stdout:"ignore",stderr:"ignore"});
 for(let i=0;i<130;i++){try{const r=await call("/api/health");if(r.data?.database==="connected")return}catch{}await Bun.sleep(160)}
 throw Error("SignalForge v6 integration test service never became healthy");
});
afterAll(async()=>{for(const id of users)await db.unsafe("DELETE FROM users WHERE id=$1",[id]);server?.kill();await db.end({timeout:1})});
test("persistent private research survives signout, sign-in and new device cookie",async()=>{
 const alice=await signup(),bob=await signup();
 expect((await call("/api/agent/conversations")).status).toBe(401);
 expect((await call("/api/agent/memories")).status).toBe(401);
 const gateway=await call("/api/agent/gateway");expect(gateway.status).toBe(200);
 const quota=await call("/api/agent/entitlements",{headers:{cookie:alice.cookie}});
 expect(quota.status).toBe(200);expect(quota.data.entitlements.sourceResearchPerDay).toBeGreaterThan(0);
 const created=await call("/api/agent/tasks",post(alice.cookie,{prompt:"Inspect Hyperliquid BTC funding and open interest",engine:"source"}));
 expect(created.status).toBe(202);
 const cid=created.data.conversationId,taskId=created.data.taskId;
 expect(created.data.engine).toBe("DETERMINISTIC_SOURCE_ONLY");
 expect((await call("/api/agent/conversations/"+cid,{headers:{cookie:bob.cookie}})).status).toBe(404);
 expect((await call("/api/agent/tasks",post(bob.cookie,{prompt:"Inspect BTC funding",conversationId:cid}))).status).toBe(404);
 const tested=await drainSourceATasks(db,{execute:async p=>observed(p,0.0001)});
 expect(tested.status).toBe("SUCCEEDED");
 const before=await call("/api/agent/conversations/"+cid,{headers:{cookie:alice.cookie}});
 expect(before.status).toBe(200);expect(before.data.messages.length).toBe(1);
 expect(before.data.messages[0].id).toBe(taskId);
 expect(before.data.messages[0].sourceCount).toBe(1);
 const mem=await call("/api/agent/memories",post(alice.cookie,{note:"Prioritize BTC funding changes and cite provider timestamps."}));
 expect(mem.status).toBe(201);
 expect((await call("/api/agent/memories",{headers:{cookie:bob.cookie}})).data.items).toHaveLength(0);
 await call("/api/auth/logout",post(alice.cookie,{}));
 expect((await call("/api/agent/conversations/"+cid,{headers:{cookie:alice.cookie}})).status).toBe(401);
 const login=await call("/api/auth/login",post("",{email:alice.email,password:alice.password}));
 expect(login.status).toBe(200);
 const resumed=await call("/api/agent/conversations/"+cid,{headers:{cookie:login.cookie}});
 expect(resumed.status).toBe(200);expect(resumed.data.messages[0].id).toBe(taskId);
 expect((await call("/api/agent/memories",{headers:{cookie:login.cookie}})).data.items).toHaveLength(1);
 const followUp=await call("/api/agent/tasks",post(login.cookie,{prompt:"Inspect Hyperliquid BTC funding compared with our prior research",conversationId:cid,engine:"source"}));
 expect(followUp.status).toBe(202);expect(followUp.data.conversationId).toBe(cid);
 expect((await call("/api/agent/conversations/"+cid,{headers:{cookie:login.cookie}})).data.messages.length).toBe(2);
 expect((await call("/api/agent/tasks/"+followUp.data.taskId+"/cancel",post(login.cookie,{}))).status).toBe(200);
},45000);
test("Forge Studio monitor runs in existing queue, source-changed alert persists and sharing is opt-in",async()=>{
 const a=await signup(),b=await signup();
 const made=await call("/api/agent/forge",post(a.cookie,{title:"BTC Funding Source Monitor",prompt:"Inspect Hyperliquid BTC funding and open interest",cadenceMinutes:60}));
 expect(made.status).toBe(201);
 const mid=made.data.id;
 expect((await call("/api/agent/forge",{headers:{cookie:b.cookie}})).data.items).toHaveLength(0);
 expect((await call("/api/agent/forge/"+mid+"/share",post(a.cookie,{}))).status).toBe(409);
 expect((await call("/api/agent/forge/"+mid+"/run",post(b.cookie,{}))).status).toBe(404);
 const first=await call("/api/agent/forge/"+mid+"/run",post(a.cookie,{}));
 expect(first.status).toBe(202);
 let val=0.0001;
 const complete=async()=>drainSourceATasks(db,{execute:async p=>observed(p,val),onComplete:async(task,result)=>{await recordMarketNotification(db,task,result,compareMarketObservations)}});
 expect((await complete()).status).toBe("SUCCEEDED");
 const published=await call("/api/agent/forge/"+mid+"/share",post(a.cookie,{}));
 expect(published.status).toBe(201);
 const publicData=await call(published.data.path);
 expect(publicData.status).toBe(200);
 expect(publicData.data.sourceLinked).toBe(true);
 expect(publicData.data.evidence.length).toBe(1);
 expect(publicData.data).not.toHaveProperty("userId");
 expect(publicData.data).not.toHaveProperty("email");
 expect(publicData.data).not.toHaveProperty("receipt");
 expect((await call("/api/agent/notifications",{headers:{cookie:a.cookie}})).data.items).toHaveLength(0);
 val=0.0002;
 const second=await call("/api/agent/forge/"+mid+"/run",post(a.cookie,{}));
 expect(second.status).toBe(202);
 expect((await complete()).status).toBe("SUCCEEDED");
 const alerts=await call("/api/agent/notifications",{headers:{cookie:a.cookie}});
 expect(alerts.status).toBe(200);expect(alerts.data.items).toHaveLength(1);
 expect(alerts.data.delivery).toBe("IN_APP_PERSISTENT");
 expect(alerts.data.externalEmailSent).toBe(false);
 const alert=alerts.data.items[0];
 expect((await call("/api/agent/notifications/"+alert.id+"/seen",post(b.cookie,{}))).status).toBe(404);
 expect((await call("/api/agent/notifications/"+alert.id+"/seen",post(a.cookie,{}))).status).toBe(200);
 const disabled=await call("/api/agent/schedules/"+mid+"/disable",post(a.cookie,{}));
 expect(disabled.status).toBe(200);
 expect((await call("/api/agent/forge/"+mid+"/run",post(a.cookie,{}))).status).toBe(409);
},45000);
