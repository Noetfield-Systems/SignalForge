import {beforeAll,afterAll,test,expect} from "bun:test";
import postgres from "postgres";

const DATABASE=Bun.env.DATABASE_URL||"";
if(!DATABASE.includes("/signalforge_test"))throw Error("Token digest integration requires disposable signalforge_test PostgreSQL");
const DB=postgres(DATABASE,{max:3,ssl:false}),PORT=18893,MAIL_PORT=18894;
const BASE="http://127.0.0.1:"+PORT;
const mint="So11111111111111111111111111111111111111112";
let web:ReturnType<typeof Bun.spawn>|undefined,provider:ReturnType<typeof Bun.serve>|undefined;
const users:string[]=[],observationHashes:string[]=[],accepted:any[]=[];
async function request(path:string,options:RequestInit={}){
 const r=await fetch(BASE+path,options);
 const body=(r.headers.get("content-type")||"").includes("application/json")?await r.json().catch(()=>null):await r.text();
 return {status:r.status,body,cookie:(r.headers.get("set-cookie")||"").split(";")[0]};
}
beforeAll(async()=>{
 web=Bun.spawn(["bun","run","src/server.ts"],{cwd:new URL("../",import.meta.url).pathname,
  env:{...Bun.env,NODE_ENV:"test",DATABASE_SSL:"disable",PORT:String(PORT)},stdout:"ignore",stderr:"ignore"});
 for(let k=0;k<120;k++){
  try{const r=await request("/api/health");if(r.status===200&&r.body.database==="connected")return;}catch{}
  await Bun.sleep(200);
 }
 throw Error("Disposable SignalForge API did not start for digest test");
});
afterAll(async()=>{
 for(const id of users)await DB.unsafe("DELETE FROM users WHERE id=$1",[id]);
 if(observationHashes.length)await DB.unsafe("DELETE FROM token_observations WHERE observation_hash=ANY($1::text[])",[observationHashes]);
 if(provider)provider.stop(true);
 if(web)web.kill();
 await DB.end({timeout:1});
});
function post(cookie:string,enabled:any,extraHeaders:Record<string,string>={}){
 return request("/api/tokens/digest",{method:"POST",headers:{"content-type":"application/json",cookie,...extraHeaders},
  body:JSON.stringify({enabled})});
}
async function runWorker(){
 const p=Bun.spawn(["bun","run","services/lifecycle-worker/railway-function.ts"],{
  cwd:new URL("../",import.meta.url).pathname,
  env:{...Bun.env,NODE_ENV:"test",DATABASE_SSL:"disable",DATABASE_URL:DATABASE,
   RESEND_API_KEY:"sandbox-local-only",RESEND_FROM:"SignalForge Test <test@signalforge.test>",
   TOKEN_DIGEST_TEST_FORCE_HOUR:"16",TOKEN_DIGEST_TEST_ALLOW_FIXTURE:"true",
   TOKEN_DIGEST_TEST_NO_SOURCE_FETCH:"true",
   SF_RESEND_TEST_ENDPOINT:"http://127.0.0.1:"+MAIL_PORT+"/emails"},
  stdout:"pipe",stderr:"pipe"});
 const exit=await p.exited;
 const output=await new Response(p.stdout).text();
 const errors=await new Response(p.stderr).text();
 expect(exit,output.slice(-1200)+" "+errors.slice(-1200)).toBe(0);
 return output;
}
test("opt-in Pro/Quant daily sourced digests: authentication, consent, provider acceptance, idempotency and unsubscribe",async()=>{
 expect((await request("/api/tokens/digest")).status).toBe(401);
 expect((await request("/digest/unsubscribe?token=no")).status).toBe(400);
 const newEmail="digest-"+crypto.randomUUID()+"@signalforge.test";
 const user=await request("/api/auth/signup",{method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({email:newEmail,password:"DigestIntegration#2026",emailConsent:false})});
 expect(user.status).toBe(201);const cookie=user.cookie,uid=user.body.user.id;users.push(uid);
 expect((await post(cookie,true)).status).toBe(409); // no saved monitored token
 expect((await post(cookie,"yes")).status).toBe(400);
 expect((await post(cookie,true,{origin:"https://attacker.invalid"})).status).toBe(403);
 const saved=await request("/api/tokens/watchlist",{method:"POST",headers:{"content-type":"application/json",cookie},body:JSON.stringify({address:mint,inAppAlerts:true})});
 expect(saved.status).toBe(201);
 const acceptedOptIn=await post(cookie,true);
 expect(acceptedOptIn.status).toBe(200);
 expect(acceptedOptIn.body.enabled).toBe(true);
 expect(acceptedOptIn.body.monitoredTokens).toBe(1);
 // A genuine source-backed event is represented by an isolated test fixture in
 // disposable PostgreSQL. Never counts as a real provider or paying customer.
 const hash="source-digest-fixture-"+crypto.randomUUID();
 observationHashes.push(hash);
 const o=await DB.unsafe("INSERT INTO token_observations(chain_id,address,source,observation_hash,payload) VALUES('solana',$1,'DEX Screener',$2,$3::jsonb) RETURNING id",
  [mint,hash,JSON.stringify({primary:{address:"pool-fixture",priceUsd:1,liquidityUsd:10000,volume24hUsd:5000},pools:[]})]);
 const changes=await DB.unsafe("INSERT INTO token_change_events(chain_id,address,observation_id,event_type,before_value,after_value,delta_pct,evidence) VALUES('solana',$1,$2,'LIQUIDITY_CHANGE',10000,5000,-50,'{}'::jsonb) RETURNING id",[mint,o[0].id]);
 await DB.unsafe("INSERT INTO token_alert_events(user_id,change_event_id) VALUES($1,$2)",[uid,changes[0].id]);
 provider=Bun.serve({port:MAIL_PORT,hostname:"127.0.0.1",fetch:async(req)=>{
  if(new URL(req.url).pathname!=="/emails"||req.method!=="POST")return new Response("Not found",{status:404});
  const body=await req.json();
  accepted.push({subject:body.subject,to:body.to,headers:Object.fromEntries(req.headers)});
  return Response.json({id:"email_disposable_digest_provider_only"});
 }});
 const first=await runWorker();
 expect(first).toContain("TOKEN_DIGEST_RUN");
 const digestMessages=accepted.filter(x=>x.subject.startsWith("SignalForge · "));
 expect(digestMessages).toHaveLength(1);
 expect(digestMessages[0].to).toEqual([newEmail]);
 expect(digestMessages[0].headers["idempotency-key"]).toContain("signalforge-token-digest-");
 const deliveries=await DB.unsafe("SELECT status,provider_message_id,attempts FROM token_digest_deliveries WHERE user_id=$1",[uid]);
 expect(deliveries).toHaveLength(1);
 expect(deliveries[0].status).toBe("accepted");
 expect(deliveries[0].provider_message_id).toBe("email_disposable_digest_provider_only");
 await runWorker();
 expect(accepted.filter(x=>x.subject.startsWith("SignalForge · "))).toHaveLength(1);
 const tokenRows=await DB.unsafe("SELECT lifecycle_unsubscribe_token FROM users WHERE id=$1",[uid]);
 const token=tokenRows[0].lifecycle_unsubscribe_token;
 const check=await request("/digest/unsubscribe?token="+encodeURIComponent(token));
 expect(check.status).toBe(200);
 expect(String(check.body)).toContain("Stop token digests");
 expect((await request("/api/tokens/digest",{headers:{cookie}})).body.configuredEnabled).toBe(true);
 const off=await request("/digest/unsubscribe",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:"token="+encodeURIComponent(token)});
 expect(off.status).toBe(200);
 expect((await request("/api/tokens/digest",{headers:{cookie}})).body.configuredEnabled).toBe(false);
 expect((await post(cookie,true)).status).toBe(200);
 await DB.unsafe("UPDATE users SET subscription_status='expired',trial_ends_at=NOW()-INTERVAL '1 day',stripe_subscription_id=NULL WHERE id=$1",[uid]);
 expect((await post(cookie,true)).status).toBe(402);
 expect((await post(cookie,false)).status).toBe(200);
},85000);
