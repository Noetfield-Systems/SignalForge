import {test} from "node:test";
import assert from "node:assert/strict";
import {priceIdentity,paidInvoiceEvidence,invoiceSubscriptionId,validCheckoutBinding} from "../src/billing-evidence.mjs";

const env={
 SF_PRICE_PRO_M:"price_SFProMonth01",
 SF_PRICE_PRO_Y:"price_SFProYear01",
 SF_PRICE_QUANT_M:"price_SFQuantMonth01",
 SF_PRICE_QUANT_Y:"price_SFQuantYear01"
};
const invoice=(overrides={})=>({
 object:"invoice",id:"in_abc123",status:"paid",paid:true,currency:"cad",amount_paid:2900,
 subscription:"sub_abc123",customer:"cus_abc123",
 lines:{data:[{price:{id:"price_SFProMonth01"}}]},...overrides
});
test("recognized price must be explicitly configured and unambiguous",()=>{
 assert.deepEqual(priceIdentity(env.SF_PRICE_PRO_M,env),{priceId:env.SF_PRICE_PRO_M,plan:"pro",period:"month"});
 assert.deepEqual(priceIdentity(env.SF_PRICE_QUANT_Y,env),{priceId:env.SF_PRICE_QUANT_Y,plan:"quant",period:"year"});
 assert.equal(priceIdentity("price_unrelated",env),null);
 assert.equal(priceIdentity("",env),null);
 assert.equal(priceIdentity("price_SFProMonth01",{...env,SF_PRICE_QUANT_M:env.SF_PRICE_PRO_M}),null);
});
test("paid SignalForge invoice grants only price and payment evidence",()=>{
 const proof=paidInvoiceEvidence(invoice(),env);
 assert.equal(proof.plan,"pro");
 assert.equal(proof.period,"month");
 assert.equal(proof.amountPaidMinor,2900);
 assert.equal(proof.customerId,"cus_abc123");
 assert.equal(proof.subscriptionId,"sub_abc123");
});
test("unpaid, free, foreign currency, unknown price and unrelated Stripe products fail closed",()=>{
 for(const obj of [
  invoice({status:"open",paid:false}),
  invoice({amount_paid:0}),
  invoice({amount_paid:-1}),
  invoice({currency:"usd"}),
  invoice({lines:{data:[{price:{id:"price_other_product"}}]}}),
  invoice({lines:{data:[]}}),
  invoice({lines:{data:[{price:{id:env.SF_PRICE_PRO_M}},{price:{id:"price_unknown"}}]}}),
  invoice({subscription:null}),
  invoice({customer:null}),
  invoice({object:"checkout.session"}),
  invoice({amount_paid:2.3})
 ])assert.equal(paidInvoiceEvidence(obj,env),null);
});
test("new invoice line pricing field supported, without email-based identity",()=>{
 const obj=invoice({subscription:null,parent:{subscription_details:{subscription:"sub_nested"}},
  lines:{data:[{pricing:{price_details:{price:env.SF_PRICE_QUANT_M}}}]}});
 assert.equal(invoiceSubscriptionId(obj),"sub_nested");
 const proof=paidInvoiceEvidence(obj,env);
 assert.equal(proof.plan,"quant");
 assert.equal(proof.period,"month");
 assert.equal(proof.customerId,"cus_abc123");
});
test("Checkout binds Stripe identifiers but never constitutes paid evidence",()=>{
 assert.deepEqual(validCheckoutBinding({mode:"subscription",status:"complete",client_reference_id:"123e4567-e89b-12d3-a456-426614174000",customer:"cus_123",subscription:"sub_123"}),{
  userId:"123e4567-e89b-12d3-a456-426614174000",customerId:"cus_123",subscriptionId:"sub_123"
 });
 assert.equal(validCheckoutBinding({mode:"payment",status:"complete",client_reference_id:"123e4567-e89b-12d3-a456-426614174000",customer:"cus_123",subscription:"sub_123"}),null);
 assert.equal(validCheckoutBinding({mode:"subscription",status:"open",client_reference_id:"123e4567-e89b-12d3-a456-426614174000",customer:"cus_123",subscription:"sub_123"}),null);
 assert.equal(validCheckoutBinding({mode:"subscription",status:"complete",client_reference_id:"fake",customer:"cus_123",subscription:"sub_123"}),null);
});
