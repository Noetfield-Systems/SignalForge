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

  let homepage=await fetch(BASE+"/app");
  expect(homepage.status).toBe(200);
  const html=await homepage.text();
  expect(html).toContain("Signal Rooms");
  expect(html).toContain("function renderPricing()");
  expect(html).toContain("CAD $29");
  expect(html).toContain("CAD $99");
  expect(html).toContain('data-subscribe');
  expect(html).toContain('payNow:true');
  expect(html).toContain('id="view-community"');

  let publicHome=await fetch(BASE+"/");
  expect(publicHome.status).toBe(200);
  const landingHtml = await publicHome.text();
  expect(landingHtml).toContain("The market moves.");
  expect(landingHtml).toContain("SignalForge");
  expect(landingHtml).toContain("href=\"/radar\"");
  expect(landingHtml).toContain("href=\"/app\"");

  let welcome=await fetch(BASE+"/welcome");
  expect(welcome.status).toBe(200);
  const welcomeHtml = await welcome.text();
  expect(welcomeHtml).toContain("SignalForge");
  expect(welcomeHtml).toContain("Research the token.");
  expect(welcomeHtml).toContain("CAD $29/month");

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
  expect(snap.data.users.total).toBe(0); // Only @signalforge.test fixtures exist; never report them as real users.
  expect(snap.data.privacy.syntheticUsersExcluded).toBe(true);
  expect(snap.data.commercialEvidence.source).toBe("SignalForge signed local webhook and authenticated source activity");
  expect(snap.data.commercialEvidence.genuineAccounts).toBe(0);
  expect(snap.data.commercialEvidence.settledCashCadMinor).toBeNull();
  expect(snap.data.commercialEvidence.settlementStatus).toBe("NOT_INDEPENDENTLY_RECONCILED");
  expect(snap.data.product.events7d).toBe(0);
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
});


test("Token Radar watchlists enforce user isolation, provenance-backed history and deduplicated in-app alerts",async()=>{
 const SOL="So11111111111111111111111111111111111111112";
 const USDC="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
 const PAIR="58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
 const history=await request("/api/tokens/history?address="+SOL);
 expect(history.response.status).toBe(200);
 expect(history.data.historyStatus).toBe("INSUFFICIENT_HISTORY");
 expect((await request("/api/tokens/watchlist")).response.status).toBe(401);
 expect((await request("/api/tokens/notifications")).response.status).toBe(401);
 const makeUser=async()=>{
  const email="token-radar-"+crypto.randomUUID().slice(0,8)+"@signalforge.test";
  const response=await request("/api/auth/signup",{
   method:"POST",headers:headers(),body:JSON.stringify({email,password:"TokenRadarTest#123456",emailConsent:false})
  });
  expect(response.response.status).toBe(201);
  return {cookie:(response.response.headers.get("set-cookie")||"").split(";")[0],id:response.data.user.id};
 };
 const first=await makeUser(),second=await makeUser();
 const save=await request("/api/tokens/watchlist",{
  method:"POST",headers:headers(first.cookie),body:JSON.stringify({address:SOL,inAppAlerts:true})
 });
 expect(save.response.status).toBe(201);
 expect(save.data.inAppAlerts).toBe(true);
 const saved=await request("/api/tokens/watchlist",{headers:headers(first.cookie)});
 expect(saved.response.status).toBe(200);
 expect(saved.data.items.some((x:any)=>x.address===SOL&&x.inAppAlerts)).toBe(true);
 const paused=await request("/api/tokens/watchlist",{
  method:"POST",headers:headers(first.cookie),body:JSON.stringify({address:SOL,inAppAlerts:false})
 });
 expect(paused.response.status).toBe(201);
 const pausedList=await request("/api/tokens/watchlist",{headers:headers(first.cookie)});
 expect(pausedList.data.items.some((x:any)=>x.address===SOL&&x.inAppAlerts===false)).toBe(true);
 const resumed=await request("/api/tokens/watchlist",{
  method:"POST",headers:headers(first.cookie),body:JSON.stringify({address:SOL,inAppAlerts:true})
 });
 expect(resumed.response.status).toBe(201);
 const resumedList=await request("/api/tokens/watchlist",{headers:headers(first.cookie)});
 expect(resumedList.data.items.some((x:any)=>x.address===SOL&&x.inAppAlerts)).toBe(true);
 const other=await request("/api/tokens/watchlist",{headers:headers(second.cookie)});
 expect(other.data.items.some((x:any)=>x.address===SOL)).toBe(false);
 const crossSite=await request("/api/tokens/watchlist",{method:"POST",headers:{...headers(first.cookie),origin:"https://bad-origin.example"},body:JSON.stringify({address:SOL})});
 expect(crossSite.response.status).toBe(403);
 const pg=await import("postgres");
 const {normalizeDexPairs}=await import("../src/token-radar.mjs");
 const {persistTokenObservation}=await import("../src/token-radar-storage.mjs");
 const db=pg.default(Bun.env.DATABASE_URL!,{ssl:false,max:2});
 const source=(price:number,liquidity:number,volume:number,at:number)=>{
  const pair={chainId:"solana",pairAddress:PAIR,dexId:"raydium",
   baseToken:{address:SOL,name:"Wrapped SOL",symbol:"SOL"},
   quoteToken:{address:USDC,name:"USD Coin",symbol:"USDC"},
   priceUsd:String(price),liquidity:{usd:liquidity},volume:{h24:volume},
   txns:{h24:{buys:30,sells:20}},priceChange:{h24:3},pairCreatedAt:1700000000000};
  return {...normalizeDexPairs([pair],SOL,at),cacheStatus:"FRESH_FETCH"};
 };
 try{
  const firstSnapshot=await persistTokenObservation(db,source(10,100000,50000,1794370000000));
  expect(["INITIAL_OBSERVATION","NO_MATERIAL_CHANGE"].includes(firstSnapshot.status)).toBe(true);
  const secondSnapshot=await persistTokenObservation(db,source(15,50000,150000,1794370060000));
  expect(secondSnapshot.status).toBe("SIGNIFICANT_CHANGE");
  expect(secondSnapshot.newEvents).toBeGreaterThan(0);
  const duplicate=await persistTokenObservation(db,source(15,50000,150000,1794370120000));
  expect(duplicate.newEvents).toBe(0);
  const timeline=await request("/api/tokens/history?address="+SOL);
  expect(timeline.response.status).toBe(200);
  expect(timeline.data.historyStatus).toBe("AVAILABLE");
  expect(timeline.data.events.some((x:any)=>x.type==="LIQUIDITY_CHANGE")).toBe(true);
  const notice=await request("/api/tokens/notifications",{headers:headers(first.cookie)});
  expect(notice.response.status).toBe(200);
  expect(notice.data.channel).toBe("IN_APP_ONLY");
  expect(notice.data.items.some((x:any)=>x.address===SOL&&x.type==="LIQUIDITY_CHANGE")).toBe(true);
  const markUnauth=await request("/api/tokens/notifications/read",{method:"POST",headers:headers(),body:JSON.stringify({all:true})});
 expect(markUnauth.response.status).toBe(401);
 const wrongOrigin=await request("/api/tokens/notifications/read",{method:"POST",headers:{...headers(first.cookie),origin:"https://evil.example"},body:JSON.stringify({all:true})});
 expect(wrongOrigin.response.status).toBe(403);
 const wrongBody=await request("/api/tokens/notifications/read",{method:"POST",headers:headers(first.cookie),body:JSON.stringify({all:false})});
 expect(wrongBody.response.status).toBe(400);
 const marked=await request("/api/tokens/notifications/read",{method:"POST",headers:headers(first.cookie),body:JSON.stringify({all:true})});
 expect(marked.response.status).toBe(200);
 expect(marked.data.updated).toBeGreaterThan(0);
 const readBack=await request("/api/tokens/notifications",{headers:headers(first.cookie)});
 expect(readBack.data.items.every((x:any)=>x.readAt!==null)).toBe(true);
 const otherNotices=await request("/api/tokens/notifications",{headers:headers(second.cookie)});
  expect(otherNotices.data.items).toHaveLength(0);
 }finally{await db.end();}
 const removed=await request("/api/tokens/watchlist?address="+SOL,{method:"DELETE",headers:headers(first.cookie)});
 expect(removed.response.status).toBe(200);
 const afterDelete=await request("/api/tokens/watchlist",{headers:headers(first.cookie)});
 expect(afterDelete.data.items.some((x:any)=>x.address===SOL)).toBe(false);
},45000);



test("Token Radar self-service watchlist UI exposes live authenticated management and private event history",async()=>{
 const response=await fetch(BASE+"/radar");
 expect(response.status).toBe(200);
 const html=await response.text();
 expect(html).toContain('id="myRadar"');
 expect(html).toContain('id="savedTokens"');
 expect(html).toContain('id="alertFeed"');
 expect(html).toContain('id="refreshMyRadar"');
 expect(html).toContain('id="markAlertsRead"');
 expect(html).toContain('/api/tokens/notifications/read');
 expect(html).toContain('data-token-action="toggle"');
 expect(html).toContain('data-token-action="remove"');
 expect(html).toContain('fetch("/api/tokens/notifications"');
 expect(html).toContain('fetch("/api/tokens/watchlist"');
 expect(html).toContain('Monitoring paused');
 expect(html).toContain("No material changes recorded");
 expect(html).toContain("not guaranteed immediate");
});

test("Token Radar organic distribution has canonical public reports, truthful sitemaps, and excludes private pages",async()=>{
 const SOL="So11111111111111111111111111111111111111112";
 const r=await fetch(BASE+"/robots.txt");
 expect(r.status).toBe(200);
 const robots=await r.text();
 expect(robots).toContain("Disallow: /api/");
 expect(robots).toContain("Disallow: /app");
 expect(robots).toContain("Sitemap:");
 const s=await fetch(BASE+"/sitemap.xml");
 expect(s.status).toBe(200);
 const xml=await s.text();
 expect(xml).toContain("<urlset");
 expect(xml).toContain("/radar</loc>");
 expect(xml).toContain("/welcome</loc>");
 expect(xml).not.toContain("/api/auth/");
 const report=await fetch(BASE+"/tokens/solana/"+SOL);
 expect(report.status).toBe(200);
 const html=await report.text();
 expect(html).toContain('<link rel="canonical" href="https://signalforge-web-production.up.railway.app/tokens/solana/'+SOL+'">');
 expect(html).toContain('content="Solana '+SOL+' market research');
 expect(html).toContain('id="shareTelegram"');
 expect(html).toContain('id="shareX"');
 expect(html).not.toContain("Noetfield Starter");
});
