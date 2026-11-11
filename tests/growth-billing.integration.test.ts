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
},35000);
afterAll(async()=>{
 for(const id of userIds)await sql.unsafe("DELETE FROM users WHERE id=$1",[id]);
 if(eventIds.length)await sql.unsafe("DELETE FROM payment_events WHERE stripe_event_id=ANY($1::text[])",[eventIds]);
 if(growth)growth.kill();if(web)web.kill();await sql.end({timeout:1});
},15000);

async function newTrial(){
 const id=crypto.randomUUID();
 userIds.push(id);
 await sql.unsafe("INSERT INTO users(id,email,password_hash,plan,selected_plan,selected_period,subscription_status,trial_started_at,trial_ends_at) VALUES($1,$2,'test-not-a-real-login','quant','pro','month','trialing',NOW(),NOW()+INTERVAL '30 days')",
  [id,"sf-billing-"+id+"@signalforge.test"]);
 return id;
}
async function account(id:string){
 const rows=await sql.unsafe("SELECT subscription_status,plan,selected_plan,stripe_customer_id,stripe_subscription_id,billing_price_id FROM users WHERE id=$1",[id]);
 return rows[0];
}
async function signed(type:string,object:any,id?:string){
 const eid=id||"evt_"+crypto.randomUUID().replaceAll("-","");
 if(!eventIds.includes(eid))eventIds.push(eid);
 const raw=JSON.stringify({id:eid,object:"event",type,data:{object}});
 const t=Math.floor(Date.now()/1000);
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const bytes=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(t+"."+raw)));
 const sig="t="+t+",v1="+[...bytes].map(x=>x.toString(16).padStart(2,"0")).join("");
 const response=await fetch(BASE+"/stripe/webhook",{method:"POST",headers:{"stripe-signature":sig,"content-type":"application/json"},body:raw});
 return {status:response.status,data:await response.json()};
}
const session=(uid:string,cus:string,sub:string)=>({
 object:"checkout.session",mode:"subscription",status:"complete",payment_status:"paid",
 client_reference_id:uid,customer:cus,subscription:sub
});
const invoice=(cus:string,sub:string,price:string)=>({
 object:"invoice",id:"in_"+crypto.randomUUID().replaceAll("-"),status:"paid",paid:true,currency:"cad",amount_paid:2900,
 customer:cus,subscription:sub,lines:{data:[{price:{id:price}}]}
});

test("signed completed checkout never activates access; only exact paid SKU invoice does",async()=>{
 const uid=await newTrial(),cus="cus_Alpha001",sub="sub_Alpha001";
 const first=await signed("checkout.session.completed",session(uid,cus,sub));
 expect(first.status).toBe(200);
 let u=await account(uid);
 expect(u.subscription_status).toBe("trialing");
 expect(u.stripe_subscription_id).toBe(sub);
 expect(u.plan).toBe("quant"); // Existing no-card trial plan; NOT proof of payment.
 await signed("invoice.paid",invoice(cus,sub,"price_UnrelatedProduct01"));
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
},35000);

test("out-of-order paid invoice is reconciled only after exact account Checkout binding",async()=>{
 const uid=await newTrial(),cus="cus_Beta001",sub="sub_Beta001";
 const p=await signed("invoice.paid",invoice(cus,sub,"price_SFProMonth01"));
 expect(p.status).toBe(200);
 expect((await account(uid)).subscription_status).toBe("trialing");
 const ch=await signed("checkout.session.completed",session(uid,cus,sub));
 expect(ch.status).toBe(200);
 const u=await account(uid);
 expect(u.subscription_status).toBe("active");
 expect(u.plan).toBe("pro");
},35000);

test("unsigned or unrelated Checkout cannot capture accounts or entitlements",async()=>{
 const uid=await newTrial(),cus="cus_Gamma001",sub="sub_Gamma001";
 const r=await fetch(BASE+"/stripe/webhook",{method:"POST",headers:{"stripe-signature":"invalid","content-type":"application/json"},body:JSON.stringify({type:"invoice.paid"})});
 expect(r.status).toBe(400);
 const other=await signed("checkout.session.completed",{...session(uid,cus,sub),mode:"payment"});
 expect(other.status).toBe(200);
 const u=await account(uid);
 expect(u.stripe_subscription_id).toBe(null);
 expect(u.subscription_status).toBe("trialing");
},35000);
