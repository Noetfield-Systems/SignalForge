import {beforeAll,afterAll,test,expect} from "bun:test";
import postgres from "postgres";

const dbUrl=Bun.env.DATABASE_URL||"";
if(!dbUrl.includes("/signalforge_test"))throw Error("Billing integration tests require disposable signalforge_test database");
const sql=postgres(dbUrl,{ssl:false,max:3});
const WEB_PORT=18768,GROWTH_PORT=18766,SECRET="whsec_signalforge_test_only_0123456789";
const BASE="http://127.0.0.1:"+GROWTH_PORT;
let web:ReturnType<typeof Bun.spawn>|undefined;
let growth:ReturnType<typeof Bun.spawn>|undefined;
const userIds:string[]=[],eventIds:string[]=[];
const env={...Bun.env,DATABASE_SSL:"disable",NODE_ENV:"test",DATABASE_URL:dbUrl,
 STRIPE_WEBHOOK_SECRET:SECRET,SF_PRICE_PRO_M:"price_SFProMonth01",SF_PRICE_PRO_Y:"price_SFProYear01",
 SF_PRICE_QUANT_M:"price_SFQuantMonth01",SF_PRICE_QUANT_Y:"price_SFQuantYear01"};

async function ready(port:number){
 for(let i=0;i<100;i++){
  try{const response=await fetch("http://127.0.0.1:"+port+"/api/health");
   if(response.ok&&(await response.json()).database==="connected")return;
  }catch{}
  await Bun.sleep(150);
 }
 throw Error("SignalForge disposable test server did not start");
}
async function growthReady(){
 for(let i=0;i<100;i++){
  try{const r=await fetch(BASE+"/health");if(r.ok&&(await r.json()).database===true)return;}catch{}
  await Bun.sleep(150);
 }
 throw Error("SignalForge Growth Function did not start");
}
beforeAll(async()=>{
 web=Bun.spawn(["bun","run","src/server.ts"],{cwd:new URL("../",import.meta.url).pathname,env:{...env,PORT:String(WEB_PORT),SIGNALFORGE_COMPANY_OS_KEY:"test-only-SignalForge-company-os-token-0123456789ABCDEF"},stdout:"ignore",stderr:"ignore"});
 await ready(WEB_PORT);
 growth=Bun.spawn(["bun","run","services/growth-assets/railway-function.ts"],{cwd:new URL("../",import.meta.url).pathname,env:{...env,PORT:String(GROWTH_PORT)},stdout:"ignore",stderr:"ignore"});
 await growthReady();
});
afterAll(async()=>{
 for(const id of userIds)await sql.unsafe("DELETE FROM users WHERE id=$1",[id]);
 if(eventIds.length)await sql.unsafe("DELETE FROM payment_events WHERE stripe_event_id=ANY($1::text[])",[eventIds]);
 if(growth)growth.kill();if(web)web.kill();await sql.end({timeout:1});
});

async function newTrial(){
 const id=crypto.randomUUID();
 userIds.push(id);
 await sql.unsafe("INSERT INTO users(id,email,password_hash,plan,selected_plan,selected_period,subscription_status,trial_started_at,trial_ends_at) VALUES($1,$2,'test-not-a-real-login','quant','pro','month','trialing',NOW(),NOW()+INTERVAL '30 days')",
  [id,"sf-billing-"+id+"@signalforge.test"]);
 // Signed Stripe sessions must correspond to a server-observed, authenticated
 // checkout intent; a mutable selected plan is not sufficient evidence.
 await sql.unsafe("INSERT INTO product_events(user_id,event_name,source,event_key) VALUES($1,'checkout_started','server_observed',$2)",[id,"checkout:"+id+":pro:month:"+Math.floor(Date.now()/300000)]);
 return id;
}
async function account(id:string){
 const rows=await sql.unsafe("SELECT subscription_status,plan,selected_plan,selected_period,stripe_customer_id,stripe_subscription_id,billing_price_id,billing_current_period_end,cancel_at_period_end FROM users WHERE id=$1",[id]);
 return rows[0];
}
async function signed(type:string,object:any,id?:string){
 const eid=id||"evt_"+crypto.randomUUID().replaceAll("-","");
 if(!eventIds.includes(eid))eventIds.push(eid);
 const raw=JSON.stringify({id:eid,object:"event",livemode:true,type,data:{object}});
 const t=Math.floor(Date.now()/1000);
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const bytes=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(t+"."+raw)));
 const sig="t="+t+",v1="+[...bytes].map(x=>x.toString(16).padStart(2,"0")).join("");
 const response=await fetch(BASE+"/stripe/webhook",{method:"POST",headers:{"stripe-signature":sig,"content-type":"application/json"},body:raw});
 return {status:response.status,data:await response.json(),eventId:eid};
}
const session=(uid:string,cus:string,sub:string)=>({
 object:"checkout.session",mode:"subscription",status:"complete",payment_status:"paid",
 client_reference_id:uid,customer:cus,subscription:sub,payment_link:"plink_1UYy8tL4BR0lqapBDHnvVO5k"
});
const invoice=(cus:string,sub:string,price:string)=>({
 object:"invoice",id:"in_"+crypto.randomUUID().replaceAll("-"),status:"paid",paid:true,currency:"cad",amount_paid:2900,
 customer:cus,subscription:sub,lines:{data:[{price:{id:price}}]}
});

test("signed completed checkout never activates access; only exact paid SKU invoice does",async()=>{
 const uid=await newTrial(),cus="cus_Alpha001",sub="sub_Alpha001";
 const first=await signed("checkout.session.completed",session(uid,cus,sub));
 expect(first.status).toBe(200);
 const sourceRow=await sql.unsafe("SELECT jsonb_typeof(payload) AS kind FROM payment_events WHERE stripe_event_id=$1",[first.eventId]);
 expect(sourceRow[0]?.kind).toBe("object");
 let u=await account(uid);
 expect(u.subscription_status).toBe("trialing");
 expect(u.stripe_subscription_id).toBe(sub);
 expect(u.plan).toBe("quant"); // Existing no-card trial plan; NOT proof of payment.
 await signed("invoice.paid",invoice(cus,sub,"price_UnrelatedProduct01"));
 expect((await account(uid)).subscription_status).toBe("trialing");
 await signed("invoice.paid",{...invoice(cus,sub,"price_SFProMonth01"),paid_out_of_band:true});
 expect((await account(uid)).subscription_status).toBe("trialing");
 await signed("invoice.paid",{...invoice(cus,sub,"price_SFProMonth01"),amount_paid:0});
 expect((await account(uid)).subscription_status).toBe("trialing");
 const payment=invoice(cus,sub,"price_SFProMonth01");
 const eid="evt_"+crypto.randomUUID().replaceAll("-");
 const paid=await signed("invoice.paid",payment,eid);
 expect(paid.status).toBe(200);
 u=await account(uid);
 expect(u.subscription_status).toBe("active");
 expect(u.plan).toBe("pro");
 expect(u.billing_price_id).toBe("price_SFProMonth01");
 const repeat=await signed("invoice.paid",payment,eid);
 expect(repeat.data.duplicate).toBe(true);
 await signed("invoice.payment_failed",{object:"invoice",customer:cus,subscription:sub});
 expect((await account(uid)).subscription_status).toBe("past_due");
 await signed("customer.subscription.deleted",{object:"subscription",customer:cus,id:sub});
 expect((await account(uid)).subscription_status).toBe("canceled");
 expect((await account(uid)).plan).toBe("explorer");
});

test("out-of-order paid invoice is reconciled only after exact account Checkout binding",async()=>{
 const uid=await newTrial(),cus="cus_Beta001",sub="sub_Beta001";
 const p=await signed("invoice.paid",invoice(cus,sub,"price_SFProMonth01"));
 expect(p.status).toBe(200);
 expect((await account(uid)).subscription_status).toBe("trialing");
 const ch=await signed("checkout.session.completed",session(uid,cus,sub));
 expect(ch.status).toBe(200);
 const u=await account(uid);
 expect(u.stripe_subscription_id).toBe(sub);
 if(u.subscription_status!=="active"){
  const rows=await sql.unsafe("SELECT event_type,payload FROM payment_events WHERE event_type='invoice.paid' ORDER BY id DESC LIMIT 10");
  throw Error("Out-of-order invoice was not reconciled: "+JSON.stringify({account:u,priorInvoicePayloads:rows.map(r=>({type:r.event_type,data:r.payload?.data?.object??r.payload}))}).slice(0,3500));
 }
 expect(u.subscription_status).toBe("active");
 expect(u.plan).toBe("pro");
});

test("unsigned or unrelated Checkout cannot capture accounts or entitlements",async()=>{
 const uid=await newTrial(),cus="cus_Gamma001",sub="sub_Gamma001";
 const r=await fetch(BASE+"/stripe/webhook",{method:"POST",headers:{"stripe-signature":"invalid","content-type":"application/json"},body:JSON.stringify({type:"invoice.paid"})});
 expect(r.status).toBe(400);
 const other=await signed("checkout.session.completed",{...session(uid,cus,sub),mode:"payment"});
 expect(other.status).toBe(200);
 const u=await account(uid);
 expect(u.stripe_subscription_id).toBe(null);
 expect(u.subscription_status).toBe("trialing");
});

test("shared-account unrelated Payment Link, wrong selected plan and unscoped checkout never bind",async()=>{
 const uid=await newTrial(),cus="cus_Isolation"+crypto.randomUUID().slice(0,8),sub="sub_Isolation"+crypto.randomUUID().slice(0,8);
 for(const item of [
  {...session(uid,cus,sub),payment_link:"plink_1UYi9PL4BR0lqapBY9PMDUvK"},
  {...session(uid,cus,sub),payment_link:"plink_1UYy8yL4BR0lqapBcocRlAvy"},
  {...session(uid,cus,sub),payment_link:null},
  {...session(uid,cus,sub),payment_link:"plink_1UYy8vL4BR0lqapBJ8pENtc7"}
 ]){
  const res=await signed("checkout.session.completed",item);
  expect(res.status).toBe(200);
  const after=await account(uid);
  expect(after.stripe_customer_id).toBe(null);
  expect(after.stripe_subscription_id).toBe(null);
  expect(after.subscription_status).toBe("trialing");
 }
 const correct=await signed("checkout.session.completed",session(uid,cus,sub));
 expect(correct.status).toBe(200);
 expect((await account(uid)).stripe_subscription_id).toBe(sub);
});

test("earlier genuine checkout intent survives later plan selection, then paid SKU controls actual plan",async()=>{
 const uid=await newTrial(),cus="cus_Intent"+crypto.randomUUID().slice(0,8),sub="sub_Intent"+crypto.randomUUID().slice(0,8);
 await sql.unsafe("UPDATE users SET selected_plan='quant',selected_period='year' WHERE id=$1",[uid]);
 const link=await signed("checkout.session.completed",session(uid,cus,sub));
 expect(link.status).toBe(200);
 expect((await account(uid)).stripe_subscription_id).toBe(sub);
 await signed("invoice.paid",invoice(cus,sub,"price_SFProMonth01"));
 let u=await account(uid);
 expect(u.subscription_status).toBe("active");
 expect(u.plan).toBe("pro");
 expect(u.selected_plan).toBe("pro");
 expect(u.selected_period).toBe("month");
 const expiry=Math.floor(Date.now()/1000)+86400*30;
 const subChanged=await signed("customer.subscription.updated",{object:"subscription",id:sub,customer:cus,
  current_period_end:expiry,cancel_at_period_end:true,items:{data:[{price:{id:"price_SFProMonth01"}}]}});
 expect(subChanged.status).toBe(200);
 u=await account(uid);
 expect(u.billing_current_period_end).toBeTruthy();
 expect(u.cancel_at_period_end).toBe(true);
 await signed("invoice.paid",invoice(cus,sub,"price_SFQuantMonth01"));
 u=await account(uid);
 expect(u.subscription_status).toBe("active");
 expect(u.plan).toBe("quant");
 expect(u.billing_price_id).toBe("price_SFQuantMonth01");
 await signed("customer.subscription.updated",{object:"subscription",id:sub,customer:cus,
  current_period_end:expiry+86400*30,cancel_at_period_end:false,items:{data:[{price:{id:"price_SFQuantMonth01"}}]}});
 expect((await account(uid)).cancel_at_period_end).toBe(false);
});

test("public analytics events cannot forge paid, server-observed user conversion or retain arbitrary PII",async()=>{
 const uid=await newTrial(),marker="spoof-"+crypto.randomUUID();
 const data={name:"pricing_view",userId:uid,source:"server_observed",
  metadata:{plan:"pro",feature:marker,email:"private@example.com",unexpected:{secret:"never"}}};
 try{
  const badOrigin=await fetch(BASE+"/events",{method:"POST",headers:{"content-type":"application/json",origin:"https://attacker.invalid"},body:JSON.stringify(data)});
  expect(badOrigin.status).toBe(403);
  const tooLarge=await fetch(BASE+"/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...data,padding:"x".repeat(3000)})});
  expect(tooLarge.status).toBe(413);
  const r=await fetch(BASE+"/events",{method:"POST",headers:{"content-type":"application/json",origin:"https://signalforge-web-production.up.railway.app"},body:JSON.stringify(data)});
  expect(r.status).toBe(202);
  const accepted=await r.json();
  expect(accepted.source).toBe("CLIENT_REPORTED_UNTRUSTED");
  expect(accepted.verified).toBe(false);
  const rows=await sql.unsafe("SELECT user_id,event_name,source,metadata FROM product_events WHERE event_name='pricing_view' AND metadata->>'feature'=$1 ORDER BY id DESC",[marker]);
  expect(rows).toHaveLength(1);
  expect(rows[0].user_id).toBe(null);
  expect(rows[0].source).toBe("client_reported");
  expect(rows[0].metadata.plan).toBe("pro");
  expect(rows[0].metadata.email).toBeUndefined();
  expect(rows[0].metadata.unexpected).toBeUndefined();
  const forged=await sql.unsafe("SELECT COUNT(*)::int AS n FROM product_events WHERE user_id=$1 AND event_name='pricing_view' AND source='server_observed'",[uid]);
  expect(forged[0].n).toBe(0);
 }finally{
  await sql.unsafe("DELETE FROM product_events WHERE event_name='pricing_view' AND metadata->>'feature'=$1",[marker]);
 }
});
