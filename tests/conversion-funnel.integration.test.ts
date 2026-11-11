import {beforeAll,afterAll,test,expect} from "bun:test";
import postgres from "postgres";

// Discrete account fixtures in disposable PostgreSQL. These events are excluded
// from genuine-customer cohorts and NEVER represent real traffic or revenue.
const url=Bun.env.DATABASE_URL||"";
if(!url.includes("/signalforge_test"))throw Error("Conversion tests require disposable signalforge_test database");
const sql=postgres(url,{ssl:false,max:2});
const PORT=18911,BASE="http://127.0.0.1:"+PORT;
let server:ReturnType<typeof Bun.spawn>|undefined;
const users:string[]=[];
async function call(path:string,options:RequestInit={}){
 const r=await fetch(BASE+path,options);
 return {status:r.status,data:await r.json().catch(()=>null),cookie:(r.headers.get("set-cookie")||"").split(";")[0]};
}
beforeAll(async()=>{
 server=Bun.spawn(["bun","run","src/server.ts"],{cwd:new URL("../",import.meta.url).pathname,
  env:{...Bun.env,PORT:String(PORT),DATABASE_SSL:"disable",NODE_ENV:"test"},
  stdout:"ignore",stderr:"ignore"});
 for(let n=0;n<120;n++){
  try{const h=await call("/api/health");if(h.status===200&&h.data.database==="connected")return}catch{}
  await Bun.sleep(200);
 }
 throw Error("Conversion E2E test runtime unavailable");
});
afterAll(async()=>{
 for(const id of users)await sql.unsafe("DELETE FROM users WHERE id=$1",[id]);
 if(server)server.kill();
 await sql.end({timeout:1});
});
test("authenticated first-use pricing and share engagement is origin-checked, deduped and server-observed",async()=>{
 const email="conversion-"+crypto.randomUUID()+"@signalforge.test";
 const signup=await call("/api/auth/signup",{method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({email,password:"DisposableTest#2026",emailConsent:false})});
 expect(signup.status).toBe(201);
 users.push(signup.data.user.id);
 const cookie=signup.cookie,uid=signup.data.user.id;
 const post=(action:string,address?:string,extra:Record<string,string>={})=>
  call("/api/engagement",{method:"POST",headers:{"content-type":"application/json",cookie,...extra},
   body:JSON.stringify({action,address})});
 expect((await call("/api/engagement",{method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({action:"pricing_view"})})).status).toBe(401);
 expect((await post("pricing_view",undefined,{origin:"https://evil.invalid"})).status).toBe(403);
 expect((await post("money_collected")).status).toBe(400);
 expect((await post("pricing_view")).status).toBe(200);
 expect((await post("pricing_view")).status).toBe(200);
 const SOL="So11111111111111111111111111111111111111112";
 expect((await post("report_share_clicked","bad-mint")).status).toBe(400);
 expect((await post("report_share_clicked",SOL)).status).toBe(200);
 expect((await post("report_share_clicked",SOL)).status).toBe(200);
 expect((await call("/api/checkout",{method:"POST",headers:{"content-type":"application/json",cookie,origin:"https://evil.invalid"},
  body:JSON.stringify({plan:"pro",period:"month"})})).status).toBe(403);
 expect((await call("/api/tokens/lookup?chain=solana&address=INVALID",{headers:{cookie}})).status).toBe(400);
 const events=await sql.unsafe("SELECT event_name,source,COUNT(*)::int AS count FROM product_events WHERE user_id=$1 GROUP BY event_name,source",[uid]);
 const rows=Object.fromEntries(events.map(x=>[x.event_name,{count:x.count,source:x.source}]));
 expect(rows.pricing_view).toEqual({count:1,source:"server_observed"});
 expect(rows.report_share_clicked).toEqual({count:1,source:"server_observed"});
 expect(rows.token_researched).toBeUndefined();
 expect(rows.checkout_started).toBeUndefined();
},40000);
