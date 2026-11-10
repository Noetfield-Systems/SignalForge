import { afterAll, beforeAll, expect, test } from "bun:test";

const PORT = 18765;
const BASE = "http://127.0.0.1:" + PORT;
const SECRET = "test-only-SignalForge-company-os-token-0123456789ABCDEF";
let service: ReturnType<typeof Bun.spawn> | undefined;

const headers = (cookie?:string) => ({
  "content-type": "application/json",
  ...(cookie ? {cookie} : {})
});
const request = async (path:string, init:RequestInit={}) => {
  const response = await fetch(BASE+path,init);
  const data:any = await response.json().catch(()=>null);
  return {response,data};
};

beforeAll(async ()=>{
  if(!Bun.env.DATABASE_URL?.includes("/signalforge_test")) {
    throw new Error("Integration tests require a disposable database named signalforge_test.");
  }
  service = Bun.spawn(["bun", "run", "src/server.ts"],{
    cwd: new URL("../", import.meta.url).pathname,
    env: {...Bun.env, NODE_ENV:"test",DATABASE_SSL:"disable",PORT:String(PORT),
      SIGNALFORGE_COMPANY_OS_KEY:SECRET,SIGNALFORGE_ADMIN_EMAIL:"admin@signalforge.test"},
    stdout:"pipe",stderr:"pipe",
  });
  for(let i=0;i<80;i++){
    try{
      const r=await request("/api/health");
      if(r.response.status===200&&r.data.database==="connected")return;
    }catch{}
    await Bun.sleep(250);
  }
  const output=await new Response(service.stderr).text().catch(()=>"");
  service.kill();
  throw new Error("SignalForge failed to start against disposable PostgreSQL: "+output.slice(0,2500));
});

afterAll(async ()=>{
  if(service){service.kill();}
});

test("real database community lifecycle, security boundaries and Company OS contract",async ()=>{
  let {response:health,data:healthData}=await request("/api/health");
  expect(health.status).toBe(200);
  expect(healthData.database).toBe("connected");
  expect(healthData.mode).toContain("no broker execution");

  let homepage=await fetch(BASE+"/");
  expect(homepage.status).toBe(200);
  const html=await homepage.text();
  expect(html).toContain("Signal Rooms");
  expect(html).toContain('id="view-community"');

  let welcome=await fetch(BASE+"/welcome");
  expect(welcome.status).toBe(200);
  expect(await welcome.text()).toContain("SignalForge");

  let empty=await request("/api/community/posts");
  expect(empty.response.status).toBe(200);
  expect(Array.isArray(empty.data.items)).toBe(true);

  let unauth=await request("/api/community/posts",{
    method:"POST",headers:headers(),
    body:JSON.stringify({title:"A market question",body:"What is the evidence for this thesis over the next week?",category:"questions"})
  });
  expect(unauth.response.status).toBe(401);
  expect((await request("/api/community/moderation")).response.status).toBe(403);
  expect((await request("/api/company-os/snapshot")).response.status).toBe(401);
  expect((await request("/api/company-os/snapshot",{headers:{authorization:"Bearer incorrect"}})).response.status).toBe(401);

  const email="researcher-"+crypto.randomUUID().slice(0,8)+"@signalforge.test";
  let signup=await request("/api/auth/signup",{
    method:"POST",headers:headers(),
    body:JSON.stringify({email,password:"IntegrationTest!12345",emailConsent:false,marketingSource:"integration_test"})
  });
  expect(signup.response.status).toBe(201);
  expect(signup.data.user.email).toBe(email);
  expect(signup.data.trial.cardRequired).toBe(false);
  const cookie=(signup.response.headers.get("set-cookie")||"").split(";")[0];
  expect(cookie.startsWith("sf_session=")).toBe(true);
  const me=await request("/api/auth/me",{headers:{cookie}});
  expect(me.data.user.email).toBe(email);

  const invalid=await request("/api/community/posts",{
    method:"POST",headers:headers(cookie),body:JSON.stringify({title:"Short",body:"Tiny",category:"questions"})
  });
  expect(invalid.response.status).toBe(400);

  const forbiddenOrigin=await request("/api/community/posts",{
    method:"POST",headers:{...headers(cookie),origin:"https://untrusted.invalid"},
    body:JSON.stringify({title:"Origin check",body:"This must be rejected due to a cross-origin browser request.",category:"questions"})
  });
  expect(forbiddenOrigin.response.status).toBe(403);

  const created=await request("/api/community/posts",{
    method:"POST",headers:headers(cookie),
    body:JSON.stringify({title:"BTC scenario with falsifiable invalidation",body:"I am comparing public price action with volatility compression. A sustained break below the reference level would invalidate the thesis.",category:"analysis",symbol:"BTCUSD"})
  });
  expect(created.response.status).toBe(201);
  const postId=created.data.id;
  expect(typeof postId).toBe("string");

  const feed=await request("/api/community/posts?sort=recent&category=analysis");
  expect(feed.response.status).toBe(200);
  expect(feed.data.items.some((p:any)=>p.id===postId)).toBe(true);

  const liked=await request("/api/community/posts/"+postId+"/like",{
    method:"POST",headers:headers(cookie),body:JSON.stringify({liked:true})
  });
  expect(liked.response.status).toBe(200);

  const replied=await request("/api/community/posts/"+postId+"/comments",{
    method:"POST",headers:headers(cookie),body:JSON.stringify({body:"What would disprove this view on a different timeframe?"})
  });
  expect(replied.response.status).toBe(201);

  const comments=await request("/api/community/posts/"+postId+"/comments");
  expect(comments.response.status).toBe(200);
  expect(comments.data.items.some((c:any)=>c.body.includes("disprove"))).toBe(true);

  const report=await request("/api/community/posts/"+postId+"/report",{
    method:"POST",headers:headers(cookie),body:JSON.stringify({reason:"misinformation"})
  });
  expect(report.response.status).toBe(200);
  const adminSignup=await request("/api/auth/signup",{
    method:"POST",headers:headers(),
    body:JSON.stringify({email:"admin@signalforge.test",password:"IntegrationAdmin!12345",emailConsent:false})
  });
  expect(adminSignup.response.status).toBe(201);
  expect(adminSignup.data.user.role).toBe("admin");
  const adminCookie=(adminSignup.response.headers.get("set-cookie")||"").split(";")[0];

  const queue=await request("/api/community/moderation",{headers:{cookie:adminCookie}});
  expect(queue.response.status).toBe(200);
  expect(queue.data.items.some((x:any)=>x.postId===postId)).toBe(true);
  const hide=await request("/api/community/moderation",{
    method:"POST",headers:headers(adminCookie),body:JSON.stringify({postId,action:"hide"})
  });
  expect(hide.response.status).toBe(200);
  const hiddenFeed=await request("/api/community/posts?category=analysis");
  expect(hiddenFeed.data.items.some((p:any)=>p.id===postId)).toBe(false);

  const snap=await request("/api/company-os/snapshot",{headers:{authorization:"Bearer "+SECRET}});
  expect(snap.response.status).toBe(200);
  expect(snap.data.schemaVersion).toBe("1.0.0");
  expect(snap.data.tenant).toBe("signalforge");
  expect(snap.data.readOnly).toBe(true);
  expect(snap.data.users.total).toBeGreaterThanOrEqual(2);
  expect(snap.data.moderation.open).toBe(0);
  expect(snap.data.privacy.identifiersIncluded).toBe(false);
  expect(JSON.stringify(snap.data)).not.toContain(email);
  expect(JSON.stringify(snap.data)).not.toContain("falsifiable invalidation");

  expect((await request("/api/v1/strategies")).response.status).toBe(401);
},40000);
