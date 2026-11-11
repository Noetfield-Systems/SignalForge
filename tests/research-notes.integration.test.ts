import {beforeAll,afterAll,test,expect} from "bun:test";
import postgres from "postgres";

const databaseUrl=Bun.env.DATABASE_URL||"";
if(!databaseUrl.includes("/signalforge_test"))throw Error("Research-notes integration requires disposable signalforge_test database");
const PORT=18775,BASE="http://127.0.0.1:"+PORT;
const sql=postgres(databaseUrl,{ssl:false,max:2});
let server:ReturnType<typeof Bun.spawn>|undefined;
const userIds:string[]=[];
const SOL="So11111111111111111111111111111111111111112";
const req=async(path:string,options:RequestInit={})=>{
 const response=await fetch(BASE+path,options);
 return {response,json:await response.json().catch(()=>null)};
};
beforeAll(async()=>{
 server=Bun.spawn(["bun","run","src/server.ts"],{
  cwd:new URL("../",import.meta.url).pathname,
  env:{...Bun.env,DATABASE_SSL:"disable",NODE_ENV:"test",PORT:String(PORT)},stdout:"ignore",stderr:"ignore"
 });
 for(let i=0;i<120;i++){
  try{const x=await req("/api/health");if(x.response.status===200&&x.json.database==="connected")return;}catch{}
  await Bun.sleep(250);
 }
 throw Error("Disposable research journal server failed readiness");
});
afterAll(async()=>{
 for(const id of userIds)await sql.unsafe("DELETE FROM users WHERE id=$1",[id]);
 if(server)server.kill();
 await sql.end({timeout:1});
});
async function newUser(){
 const email="note-"+crypto.randomUUID()+"@signalforge.test";
 const s=await req("/api/auth/signup",{
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({email,password:"TestNotesSecure#123456"})
 });
 expect(s.response.status).toBe(201);
 userIds.push(s.json.user.id);
 return (s.response.headers.get("set-cookie")||"").split(";")[0];
}
test("private research notes are persisted per owner, have falsifiable thesis validation, and enforce access boundaries",async()=>{
 const page=await fetch(BASE+"/radar");
 expect(page.status).toBe(200);
 const html=await page.text();
 expect(html).toContain('id="researchNotes"');
 expect(html).toContain('id="noteForm"');
 expect(html).toContain('loadResearchNotes(mint)');
 expect((await req("/api/tokens/notes?address="+SOL)).response.status).toBe(401);
 const alice=await newUser(),bob=await newUser();
 const empty=await req("/api/tokens/notes?address="+SOL,{headers:{cookie:alice}});
 expect(empty.response.status).toBe(200);
 expect(empty.json.items).toHaveLength(0);
 const cross=await req("/api/tokens/notes",{method:"POST",headers:{"content-type":"application/json",cookie:alice,origin:"https://untrusted.invalid"},body:JSON.stringify({address:SOL,kind:"note",body:"Market data research question"})});
 expect(cross.response.status).toBe(403);
 const bad=await req("/api/tokens/notes",{method:"POST",headers:{"content-type":"application/json",cookie:alice},body:JSON.stringify({address:SOL,kind:"thesis",body:"Liquidity might increase"})});
 expect(bad.response.status).toBe(400);
 expect(bad.json.error).toBe("THESIS_INVALIDATION_REQUIRED");
 const good=await req("/api/tokens/notes",{method:"POST",headers:{"content-type":"application/json",cookie:alice},body:JSON.stringify({address:SOL,kind:"thesis",body:"Observed liquidity could persist across a week",invalidation:"Source shows pool liquidity below half of baseline"})});
 expect(good.response.status).toBe(201);
 expect(good.json.note.kind).toBe("thesis");
 const saved=await req("/api/tokens/notes?address="+SOL,{headers:{cookie:alice}});
 expect(saved.response.status).toBe(200);
 expect(saved.json.source).toBe("USER_AUTHORED_PRIVATE_NOTES");
 expect(saved.json.verifiedMarketFacts).toBe(false);
 expect(saved.json.items).toHaveLength(1);
 expect(saved.json.items[0].body).toContain("liquidity could persist");
 const other=await req("/api/tokens/notes?address="+SOL,{headers:{cookie:bob}});
 expect(other.response.status).toBe(200);
 expect(other.json.items).toHaveLength(0);
 const id=String(saved.json.items[0].id);
 const unauthorizedDelete=await req("/api/tokens/notes?id="+id,{method:"DELETE",headers:{cookie:bob}});
 expect(unauthorizedDelete.response.status).toBe(404);
 const wrongOrigin=await req("/api/tokens/notes?id="+id,{method:"DELETE",headers:{cookie:alice,origin:"https://evil.invalid"}});
 expect(wrongOrigin.response.status).toBe(403);
 const deletion=await req("/api/tokens/notes?id="+id,{method:"DELETE",headers:{cookie:alice}});
 expect(deletion.response.status).toBe(200);
 const after=await req("/api/tokens/notes?address="+SOL,{headers:{cookie:alice}});
 expect(after.json.items).toHaveLength(0);
},45000);

test("journal evidence anchors baseline at thesis creation and preserves owner privacy",async()=>{
 const mint="11111111111111111111111111111111";
 const alice=await newUser(),bob=await newUser();
 const baselineHash="research-baseline-"+crypto.randomUUID();
 const nextHash="research-next-"+crypto.randomUUID();
 const sourcePayload=(price:number)=>JSON.stringify({
  chainId:"solana",address:mint,source:"DEX Screener",primary:{
   address:"pool-baseline",priceUsd:price,liquidityUsd:10000,volume24hUsd:2000},pools:[]
 });
 try{
  await sql.unsafe("INSERT INTO token_observations(chain_id,address,source,observation_hash,payload,observed_at,last_seen_at) VALUES('solana',$1,'DEX Screener',$2,$3::jsonb,NOW()-INTERVAL '3 hours',NOW()-INTERVAL '3 hours')",[mint,baselineHash,sourcePayload(1)]);
  const post=await req("/api/tokens/notes",{method:"POST",headers:{"content-type":"application/json",cookie:alice},
   body:JSON.stringify({address:mint,kind:"thesis",body:"Reported pool liquidity could remain stable",invalidation:"Reported liquidity falls below half of baseline"})});
  expect(post.response.status).toBe(201);
  await sql.unsafe("UPDATE token_research_notes SET created_at=NOW()-INTERVAL '2 hours' WHERE id=$1",[post.json.note.id]);
  const before=await req("/api/tokens/notes?address="+mint,{headers:{cookie:alice}});
  expect(before.response.status).toBe(200);
  expect(before.json.items[0].evidence.status).toBe("NO_SUBSEQUENT_OBSERVATION");
  await sql.unsafe("INSERT INTO token_observations(chain_id,address,source,observation_hash,payload,observed_at,last_seen_at) VALUES('solana',$1,'DEX Screener',$2,$3::jsonb,NOW()-INTERVAL '1 hour',NOW()-INTERVAL '1 hour')",[mint,nextHash,sourcePayload(1.5)]);
  const after=await req("/api/tokens/notes?address="+mint,{headers:{cookie:alice}});
  expect(after.response.status).toBe(200);
  expect(after.json.items[0].evidence.status).toBe("NEW_SOURCE_OBSERVATION");
  expect(after.json.items[0].evidence.metrics[0].deltaPct).toBe(50);
  expect(after.json.items[0].evidence.thesisVerdict).toBeNull();
  expect(after.json.items[0].evidence.marketFactsVerifiedIndependently).toBe(false);
  const other=await req("/api/tokens/notes?address="+mint,{headers:{cookie:bob}});
  expect(other.json.items).toHaveLength(0);
 }finally{
  await sql.unsafe("DELETE FROM token_research_notes WHERE chain_id='solana' AND address=$1",[mint]);
  await sql.unsafe("DELETE FROM token_observations WHERE observation_hash IN ($1,$2)",[baselineHash,nextHash]);
 }
},45000);
