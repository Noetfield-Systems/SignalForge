import {beforeAll,afterAll,test,expect} from "bun:test";
import postgres from "postgres";
import {drainSourceATasks,activateDueSchedules} from "../src/sourcea-task-runtime.ts";
const url=Bun.env.DATABASE_URL||"";
if(!url.includes("/signalforge_test"))throw Error("SourceA integration requires disposable signalforge_test database");
const db=postgres(url,{ssl:false,max:2});
const PORT=18983,BASE="http://127.0.0.1:"+PORT;
const users:string[]=[];
let server:ReturnType<typeof Bun.spawn>|null=null;
async function call(path:string,init:RequestInit={}){
 const r=await fetch(BASE+path,init);
 return {status:r.status,data:await r.json().catch(()=>null),cookie:(r.headers.get("set-cookie")||"").split(";")[0]};
}
const post=(cookie:string,body:any,origin?:string)=>({method:"POST",headers:{"content-type":"application/json",cookie,...(origin?{origin}:{})},body:JSON.stringify(body)});
async function createUser(){
 const s=await call("/api/auth/signup",post("",{email:"sourcea-v5-"+crypto.randomUUID()+"@signalforge.test",password:"TempTestPassword#2026"}));
 expect(s.status).toBe(201);users.push(s.data.user.id);return {id:s.data.user.id,cookie:s.cookie};
}
const prompt="Inspect Hyperliquid BTC funding and open interest";
function mockObserved(p:string){
 const time=new Date().toISOString();
 return {schema:"signalforge.agent-research.v1",prompt:p,tool:"market.perps.research",lane:"perps",runId:crypto.randomUUID(),status:"SOURCE_OBSERVED",mode:"SOURCE_REPORTED",summary:"TEST_FIXTURE_ONLY",executedAt:time,
  financialExecution:false,independentlyVerified:false,evidence:[{venue:"Hyperliquid",label:"BTC",source:"Hyperliquid public Info API",sourceUrl:"https://app.hyperliquid.xyz/trade/BTC",observedAt:time,values:{markPrice:90000,openInterestUsdApprox:1234},independentlyVerified:false}]};
}
beforeAll(async()=>{
 server=Bun.spawn(["bun","run","src/server.ts"],{cwd:new URL("../",import.meta.url).pathname,
 env:{...Bun.env,PORT:String(PORT),NODE_ENV:"test",DATABASE_SSL:"disable"},stdout:"ignore",stderr:"ignore"});
 for(let i=0;i<120;i++){try{const r=await call("/api/health");if(r.data?.database==="connected")return}catch{}await Bun.sleep(150)}
 throw Error("SourceA adapter integration server not ready");
});
afterAll(async()=>{for(const id of users)await db.unsafe("DELETE FROM users WHERE id=$1",[id]);server?.kill();await db.end({timeout:1})});
test("SourceA customer runtime: prompt -> task -> observed artifact -> verifiable receipt -> owner response",async()=>{
 expect((await call("/api/agent/tasks")).status).toBe(401);
 expect((await call("/api/agent/schedules")).status).toBe(401);
 const alice=await createUser(),bob=await createUser();
 const skills=await call("/api/agent/skills");
 expect(skills.status).toBe(200);expect(skills.data.skills[0].skillId).toBe("signalforge.market-research");
 expect(skills.data.remoteSourceAExecutorConnected).toBe(false);
 const wrong=await call("/api/agent/tasks",post(alice.cookie,{prompt},"https://hostile.invalid"));
 expect(wrong.status).toBe(403);
 const bad=await call("/api/agent/tasks",post(alice.cookie,{prompt:"a"}));
 expect(bad.status).toBe(400);
 const submitted=await call("/api/agent/tasks",post(alice.cookie,{prompt}));
 expect(submitted.status).toBe(202);
 const id=submitted.data.taskId;
 expect(submitted.data.packet.schema).toBe("sourcea.signalforge-workpacket.v1");
 expect(submitted.data.packet.allowedCapabilities).toEqual(["read:market.perps"]);
 expect((await call("/api/agent/tasks/"+id)).status).toBe(401);
 expect((await call("/api/agent/tasks/"+id,{headers:{cookie:bob.cookie}})).status).toBe(404);
 expect((await call("/api/agent/tasks/"+id+"/cancel",post(bob.cookie,{}))).status).toBe(409);
 const result=await drainSourceATasks(db,{execute:async p=>mockObserved(p)});
 expect(result.status).toBe("SUCCEEDED");
 const details=await call("/api/agent/tasks/"+id,{headers:{cookie:alice.cookie}});
 expect(details.status).toBe(200);expect(details.data.status).toBe("SUCCEEDED");
 expect(details.data.artifact.schema).toBe("sourcea.signalforge-research-artifact.v1");
 expect(details.data.receipt.schema).toBe("sourcea.signalforge-execution-receipt.v1");
 expect(details.data.events.map((x:any)=>x.event)).toEqual(["QUEUED","RUNNING","SUCCEEDED"]);
 expect(details.data.usage.modelChargeUsd).toBe(0);
 expect(details.data.usage.providerBilledUsd).toBeNull();
 const verify=await call("/api/agent/tasks/"+id+"/verify",{headers:{cookie:alice.cookie}});
 expect(verify.status).toBe(200);expect(verify.data.valid).toBe(true);
 expect((await call("/api/agent/tasks/"+id+"/verify",{headers:{cookie:bob.cookie}})).status).toBe(404);
 const own=await call("/api/agent/tasks",{headers:{cookie:alice.cookie}});
 const other=await call("/api/agent/tasks",{headers:{cookie:bob.cookie}});
 expect(own.data.items.some((x:any)=>x.id===id)).toBe(true);
 expect(other.data.items.some((x:any)=>x.id===id)).toBe(false);
 // A tampered artifact cannot retain the same verified receipt.
 await db.unsafe("UPDATE sourcea_customer_tasks SET artifact=jsonb_set(artifact,'{sourceCount}','999'::jsonb) WHERE id=$1",[id]);
 const changed=await call("/api/agent/tasks/"+id+"/verify",{headers:{cookie:alice.cookie}});
 expect(changed.status).toBe(200);expect(changed.data.valid).toBe(false);
 expect(changed.data.reason).toBe("ARTIFACT_INTEGRITY_MISMATCH");
},45000);
test("cancellation, bounded retry, source outage and schedule isolation",async()=>{
 const alice=await createUser(),bob=await createUser();
 const created=await call("/api/agent/tasks",post(alice.cookie,{prompt}));
 const id=created.data.taskId;
 const cancelled=await call("/api/agent/tasks/"+id+"/cancel",post(alice.cookie,{}));
 expect(cancelled.status).toBe(200);expect(cancelled.data.status).toBe("CANCELLED");
 expect((await call("/api/agent/tasks/"+id,{headers:{cookie:alice.cookie}})).data.artifact).toBeNull();
 const retry=await call("/api/agent/tasks/"+id+"/retry",post(alice.cookie,{}));
 expect(retry.status).toBe(200);expect(retry.data.status).toBe("QUEUED");
 const fail=await drainSourceATasks(db,{execute:async p=>({...mockObserved(p),status:"SOURCE_UNAVAILABLE",evidence:[]})});
 expect(fail.status).toBe("FAILED");
 expect((await call("/api/agent/tasks/"+id+"/verify",{headers:{cookie:alice.cookie}})).status).toBe(409);
 const again=await call("/api/agent/tasks/"+id+"/retry",post(alice.cookie,{}));
 expect(again.status).toBe(200);
 const ok=await drainSourceATasks(db,{execute:async p=>mockObserved(p)});
 expect(ok.status).toBe("SUCCEEDED");
 const noThird=await call("/api/agent/tasks/"+id+"/retry",post(alice.cookie,{}));
 expect(noThird.status).toBe(409);
 expect((await call("/api/agent/tasks/"+id,{headers:{cookie:alice.cookie}})).data.attempts).toBe(2);
 const scheduled=await call("/api/agent/schedules",post(alice.cookie,{prompt,cadenceMinutes:60}));
 if(scheduled.status!==201)console.error("SCHEDULE_TEST_DIAGNOSTIC",scheduled.data);expect(scheduled.status).toBe(201);
 const other=await call("/api/agent/schedules",{headers:{cookie:bob.cookie}});
 expect(other.data.items).toHaveLength(0);
 const sid=scheduled.data.id;
 expect((await call("/api/agent/schedules/"+sid+"/disable",post(bob.cookie,{}))).status).toBe(404);
 await db.unsafe("UPDATE sourcea_customer_schedules SET next_run_at=NOW()-INTERVAL '2 minutes' WHERE id=$1",[sid]);
 const queued=await activateDueSchedules(db);expect(queued.scheduled).toBeGreaterThan(0);
 const scheduleTasks=await call("/api/agent/tasks",{headers:{cookie:alice.cookie}});
 expect(scheduleTasks.data.items.some((x:any)=>x.scheduleId===sid)).toBe(true);
 const falseDelete=await call("/api/account/delete",post(alice.cookie,{confirm:"DELETE",password:"bad"}));
 expect(falseDelete.status).toBe(401);
 expect((await call("/api/account/delete",post(alice.cookie,{confirm:"DELETE",password:"TempTestPassword#2026"},"https://evil.invalid"))).status).toBe(403);
 const disabled=await call("/api/agent/schedules/"+sid+"/disable",post(alice.cookie,{}));
 expect(disabled.status).toBe(200);expect(disabled.data.status).toBe("DISABLED");
 const deleted=await call("/api/account/delete",post(alice.cookie,{confirm:"DELETE",password:"TempTestPassword#2026"}));
 expect(deleted.status).toBe(200);expect(deleted.data.deleted).toBe(true);
 expect((await call("/api/agent/tasks",{headers:{cookie:alice.cookie}})).status).toBe(401);

},45000);
