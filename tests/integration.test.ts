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
      SIGNALFORGE_COMPANY_OS_KEY:SECRET,SIGNALFORGE_ADMIN_EMAIL:"admin@signalforge.test",SIGNALFORGE_STRIPE_PRO_MONTHLY_URL:"https://buy.stripe.com/test_signalforge_checkout"},
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
  // Trial remains uncharged until a user explicitly invokes the payment handoff.
  // An explicit paid upgrade must yield a secure external checkout URL, not a charge.
  const paidOptIn=await request("/api/checkout",{method:"POST",headers:headers(cookie),
    body:JSON.stringify({plan:"pro",period:"month",payNow:true})});
  expect(paidOptIn.response.status).toBe(200);
  expect(paidOptIn.data.url.startsWith("https://buy.stripe.com/")).toBe(true);
  expect(paidOptIn.data.url).toContain("client_reference_id=");
  expect(paidOptIn.data.saved).toBeUndefined();
  const afterOffer=await request("/api/auth/me",{headers:{cookie}});
  expect(afterOffer.data.user.subscription_status).toBe("trialing");


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

  const missingGate=await request("/api/company-os/evidence-gate",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({project_id:"signalforge-market-intelligence"})
  });
  expect(missingGate.response.status).toBe(401);
  const gate=await request("/api/company-os/evidence-gate",{
    method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+SECRET},
    body:JSON.stringify({
      project_id:"signalforge-market-intelligence",workstream_id:"a".repeat(32),
      source:{artifact_sha:"b".repeat(40),ref:"receipt:source/test"},
      verification:{project_id:"signalforge-market-intelligence",workstream_id:"a".repeat(32),
        artifact_sha:"b".repeat(40),result:"PASS",receipt_ref:"receipt:claimed/test"}
    })
  });
  expect(gate.response.status).toBe(200);
  expect(gate.data.independent_completion_verified).toBe(false);
  expect(gate.data.governor_permits_issued).toBe(0);
  expect(gate.data.state).toBe("RECEIPT_CLAIM_READY_FOR_INDEPENDENT_VERIFIER");
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
  const ops=await request("/api/company-os/operations",{headers:{authorization:"Bearer "+SECRET}});
  expect(ops.response.status).toBe(200);
  expect(ops.data.managed_platforms).toBe(1);
  expect(ops.data.company_operating_team).toBe(26);
  expect(ops.data.tenant).toBe("signalforge-market-intelligence");
  expect(ops.data.operating_state.verified_collected_cash_cad).toBeNull();
  expect(ops.data.workpackets.every((x:any)=>x.resources.real_trades_allowed===false)).toBe(true);
  expect(JSON.stringify(ops.data)).not.toContain(email);
  expect((await request("/api/company-os/operations")).response.status).toBe(401);


  expect((await request("/api/v1/strategies")).response.status).toBe(401);
},40000);


test("Token Radar public route and invalid-source research boundary", async () => {
  const radar = await fetch(BASE + "/radar");
  expect(radar.status).toBe(200);
  expect(await radar.text()).toContain("Know what the");
  const validPage = await fetch(BASE + "/tokens/solana/So11111111111111111111111111111111111111112");
  expect(validPage.status).toBe(200);
  expect(await validPage.text()).toContain("Solana token So111");
  const invalidPage = await fetch(BASE + "/tokens/solana/not-a-real-mint");
  expect(invalidPage.status).toBe(404);
  const bad = await request("/api/tokens/lookup?chain=solana&address=not-a-token");
  expect(bad.response.status).toBe(400);
  expect(bad.data.error).toBe("INVALID_SOLANA_ADDRESS");
  const unsupported = await request("/api/tokens/lookup?chain=ethereum&address=So11111111111111111111111111111111111111112");
  expect(unsupported.response.status).toBe(400);
  expect(unsupported.data.error).toBe("UNSUPPORTED_CHAIN");
  const wrongMethod = await request("/api/tokens/lookup", {method:"POST"});
  expect(wrongMethod.response.status).toBe(405);
  const historyInvalid=await request("/api/tokens/history?address=bad");
  expect(historyInvalid.response.status).toBe(400);
  expect(historyInvalid.data.error).toBe("INVALID_SOLANA_ADDRESS");
  const history=await request("/api/tokens/history?address=So11111111111111111111111111111111111111112");
  expect(history.response.status).toBe(200);
  expect(history.data.chainId).toBe("solana");
  expect(Array.isArray(history.data.items)).toBe(true);
  expect(["INSUFFICIENT_HISTORY","CHANGE_AVAILABLE"]).toContain(history.data.status);
  expect(history.data.items.length).toBeLessThanOrEqual(48);
  const wrongHistoryMethod=await request("/api/tokens/history",{method:"POST"});
  expect(wrongHistoryMethod.response.status).toBe(405);
});
