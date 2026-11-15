import {beforeAll,afterAll,test,expect} from "bun:test";
import postgres from "postgres";

const url=Bun.env.DATABASE_URL||"";
if(!url.includes("/signalforge_test"))throw Error("Use disposable signalforge_test PostgreSQL");
const db=postgres(url,{ssl:false,max:2});
const PORT=18973,BASE="http://127.0.0.1:"+PORT;
let process:ReturnType<typeof Bun.spawn>|null=null;
const users:string[]=[];
async function call(path:string,init:RequestInit={}){const response=await fetch(BASE+path,init);return {response,data:await response.json().catch(()=>null)}}
beforeAll(async()=>{
 process=Bun.spawn(["bun","run","src/server.ts"],{cwd:new URL("../",import.meta.url).pathname,env:{...Bun.env,PORT:String(PORT),NODE_ENV:"test",DATABASE_SSL:"disable"},stdout:"ignore",stderr:"ignore"});
 for(let i=0;i<100;i++){try{const h=await call("/api/health");if(h.data?.database==="connected")return}catch{}await Bun.sleep(200)}
 throw Error("Market Agent integration test service not ready");
});
afterAll(async()=>{for(const id of users)await db.unsafe("DELETE FROM users WHERE id=$1",[id]);process?.kill();await db.end({timeout:1})});
async function user(){
 const s=await call("/api/auth/signup",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:"agent-"+crypto.randomUUID()+"@signalforge.test",password:"TestAgentPassphrase!2026"})});
 expect(s.response.status).toBe(201);users.push(s.data.user.id);return {id:s.data.user.id,cookie:(s.response.headers.get("set-cookie")||"").split(";")[0]};
}
const json=(cookie:string,body:any,origin?:string)=>({method:"POST",headers:{"content-type":"application/json",cookie,...(origin?{origin}:{})},body:JSON.stringify(body)});
test("public Agent page, private job history, sourced thesis, owner-isolated sharing, and CSRF",async()=>{
 const page=await fetch(BASE+"/agent");expect(page.status).toBe(200);
 const html=await page.text();expect(html).toContain("Market Agent");expect(html).toContain('id="researchForm"');
 expect((await call("/api/agent/history")).response.status).toBe(401);
 expect((await call("/api/agent/theses")).response.status).toBe(401);
 expect((await call("/api/agent/research",json("",{prompt:"x"}))).response.status).toBe(400);
 expect((await call("/api/agent/research",json("",{prompt:"Inspect Polymarket market data"},"https://evil.invalid"))).response.status).toBe(403);
 const alice=await user(),bob=await user();
 const fixture={schema:"signalforge.agent-research.v1",status:"SOURCE_OBSERVED",mode:"SOURCE_REPORTED",summary:"Disposable integration fixture, not production market evidence.",evidence:[{venue:"Polymarket",label:"Disposable fixture",source:"test fixture",sourceUrl:"https://polymarket.com/event/test",observedAt:"2026-11-14T19:00:00Z",values:{volume24hUsd:10}}],limitations:["Test data; never count as live research."]};
 const rows=await db.unsafe("INSERT INTO agent_jobs(user_id,prompt,tool,status,mode,result) VALUES($1,$2,'market.prediction.research','SOURCE_OBSERVED','SOURCE_REPORTED',$3::jsonb) RETURNING id::text",[alice.id,"Test fixture only",JSON.stringify(fixture)]);const jobId=rows[0].id;
 const own=await call("/api/agent/history",{headers:{cookie:alice.cookie}});
 expect(own.response.status).toBe(200);expect(own.data.items.find((x:any)=>x.id===jobId)).toBeTruthy();
 expect((await call("/api/agent/recheck",json("",{jobId}))).response.status).toBe(401);
 expect((await call("/api/agent/recheck",json(bob.cookie,{jobId}))).response.status).toBe(404);
 expect((await call("/api/agent/recheck",json(alice.cookie,{jobId},"https://evil.invalid"))).response.status).toBe(403);
 expect((await call("/api/agent/recheck",json(alice.cookie,{jobId:"bad"}))).response.status).toBe(400);
 const other=await call("/api/agent/history",{headers:{cookie:bob.cookie}});
 expect(other.data.items.find((x:any)=>x.id===jobId)).toBeUndefined();
 expect((await call("/api/agent/theses",json(bob.cookie,{jobId,invalidation:"Source contradicts hypothesis"}))).response.status).toBe(409);
 expect((await call("/api/agent/share",json(bob.cookie,{jobId}))).response.status).toBe(404);
 expect((await call("/api/agent/share",json(alice.cookie,{jobId},"https://evil.invalid"))).response.status).toBe(403);
 const thesis=await call("/api/agent/theses",json(alice.cookie,{jobId,invalidation:"Volume drops below previous sample"}));
 expect(thesis.response.status).toBe(201);
 expect((await call("/api/agent/theses",json(alice.cookie,{jobId,invalidation:"Another assumption"}))).response.status).toBe(409);
 const aliceTheses=await call("/api/agent/theses",{headers:{cookie:alice.cookie}});
 expect(aliceTheses.data.items.some((x:any)=>x.jobId===jobId)).toBe(true);
 const bobTheses=await call("/api/agent/theses",{headers:{cookie:bob.cookie}});
 expect(bobTheses.data.items).toHaveLength(0);
 const share=await call("/api/agent/share",json(alice.cookie,{jobId}));
 expect(share.response.status).toBe(201);expect(share.data.path.startsWith("/research/")).toBe(true);
 const publicData=await call("/api/agent/public/"+share.data.path.split("/").pop());
 expect(publicData.response.status).toBe(200);
 expect(publicData.data.summary).toContain("Disposable integration fixture");
 expect(publicData.data).not.toHaveProperty("prompt");
 expect(publicData.data).not.toHaveProperty("user_id");
 const publicPage=await fetch(BASE+share.data.path);expect(publicPage.status).toBe(200);
 expect((await publicPage.text())).toContain("Research with a trace.");
},45000);
