import {test,expect,beforeAll,afterAll} from "bun:test";
import postgres from "postgres";
import {eligibleResearcher,awardObservedResearchParticipation} from "../src/agent-genesis.ts";
import {drainSourceATasks} from "../src/sourcea-task-runtime.ts";
const url=Bun.env.DATABASE_URL||"";if(!url.includes("/signalforge_test"))throw Error("Must use disposable database");
const db=postgres(url,{ssl:false,max:2}),PORT=18985,BASE="http://127.0.0.1:"+PORT;
let server:ReturnType<typeof Bun.spawn>|null=null;const users:string[]=[];
async function api(path:string,init:RequestInit={}){const r=await fetch(BASE+path,init);return {status:r.status,data:await r.json().catch(()=>null),cookie:(r.headers.get("set-cookie")||"").split(";")[0]}}
const post=(ck:string,body:any)=>({method:"POST",headers:{"content-type":"application/json",cookie:ck},body:JSON.stringify(body)});
async function user(domain:string,referralCode?:string){const email="genesis-"+crypto.randomUUID()+"@"+domain;const r=await api("/api/auth/signup",post("",{email,password:"TestResearch#2026!",referralCode,emailConsent:false}));expect(r.status).toBe(201);users.push(r.data.user.id);return {id:r.data.user.id,cookie:r.cookie,referral:r.data.user.referral_code}}
function observation(prompt:string){const ts=new Date().toISOString();return {schema:"signalforge.agent-research.v1",tool:"market.perps.research",lane:"perps",prompt,runId:crypto.randomUUID(),executedAt:ts,financialExecution:false,readOnly:true,independentlyVerified:false,model:"DETERMINISTIC_SOURCE_ROUTER",status:"SOURCE_OBSERVED",mode:"SOURCE_REPORTED",summary:"Test fixture source reported funding observations.",limitations:["Test fixture only."],evidence:[{venue:"Hyperliquid",label:"BTC",source:"Hyperliquid Info API",sourceUrl:"https://app.hyperliquid.xyz/trade/BTC",observedAt:ts,values:{fundingRateRaw:0.0003},independentlyVerified:false}]}}
beforeAll(async()=>{server=Bun.spawn(["bun","run","src/server.ts"],{cwd:new URL("../",import.meta.url).pathname,env:{...Bun.env,PORT:String(PORT),NODE_ENV:"test",DATABASE_SSL:"disable"},stdout:"ignore",stderr:"ignore"});for(let i=0;i<120;i++){try{const r=await api("/api/health");if(r.data?.database==="connected")return}catch{}await Bun.sleep(180)}throw Error("Genesis test service not ready")});
afterAll(async()=>{for(const id of users.reverse())await db.unsafe("DELETE FROM users WHERE id=$1",[id]);server?.kill();await db.end({timeout:1})});
test("noncash qualification excludes disposable test and fake identities",async()=>{
 for(const email of ["x@signalforge.invalid","x@signalforge.test","x@example.com","x@a.test"])expect(eligibleResearcher(email,"user")).toBe(false);
 expect(eligibleResearcher("person@legitimate-mail.net","user")).toBe(true);
 expect(eligibleResearcher("person@legitimate-mail.net","admin")).toBe(false);
 expect((await api("/api/agent/genesis")).status).toBe(401);
});
test("qualified referral points require verified research and Signal Rooms publication is explicit, source-bound and idempotent",async()=>{
 const owner=await user("samplemail.org"),ref=await user("samplemail.org",owner.referral);
 const prompt="Inspect Hyperliquid BTC funding and open interest";
 const created=await api("/api/agent/tasks",post(ref.cookie,{prompt,engine:"source"}));expect(created.status).toBe(202);
 expect((await api("/api/agent/tasks/"+created.data.taskId+"/publish-room",post(ref.cookie,{}))).status).toBe(409);
 expect((await api("/api/agent/tasks/"+created.data.taskId+"/publish-room",post(owner.cookie,{}))).status).toBe(404);
 const worked=await drainSourceATasks(db,{execute:async p=>observation(p),onComplete:async(t)=>{await awardObservedResearchParticipation(db,t.userId,t.id)}});
 expect(worked.status).toBe("SUCCEEDED");
 const award=await awardObservedResearchParticipation(db,ref.id,created.data.taskId);
 expect(award.awarded).toBe(false);expect(award.reason).toBe("ALREADY_RECORDED");
 const referred=await api("/api/agent/genesis",{headers:{cookie:ref.cookie}});
 const sponsor=await api("/api/agent/genesis",{headers:{cookie:owner.cookie}});
 expect(referred.status).toBe(200);expect(referred.data.points).toBe(15);
 expect(sponsor.status).toBe(200);expect(sponsor.data.points).toBe(25);
 expect(sponsor.data.qualifiedReferralCount).toBe(1);
 expect(sponsor.data.marketValue).toBeNull();expect(sponsor.data.tokenIssued).toBe(false);
 expect(sponsor.data.transferable).toBe(false);
 const posted=await api("/api/agent/tasks/"+created.data.taskId+"/publish-room",post(ref.cookie,{}));
 expect(posted.status).toBe(201);expect(posted.data.cardPath.startsWith("/research/")).toBe(true);
 const repeat=await api("/api/agent/tasks/"+created.data.taskId+"/publish-room",post(ref.cookie,{}));
 expect(repeat.status).toBe(200);expect(repeat.data.alreadyPublished).toBe(true);
 expect(repeat.data.postId).toBe(posted.data.postId);
 const community=await api("/api/community/posts");
 expect(community.status).toBe(200);
 const postRow=community.data.items.find((x:any)=>x.id===posted.data.postId);
 expect(postRow.body).toContain("app.hyperliquid.xyz");
 expect(postRow.body).toContain("Research Card:");
 expect((await api("/api/agent/genesis",{headers:{cookie:owner.cookie}})).data.points).toBe(25);
},45000);
