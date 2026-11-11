import {test} from "node:test";
import assert from "node:assert/strict";
import {SIGNALFORGE_PRICE_IDS,summarizeBillingEvents} from "../src/revenue-metrics.mjs";
const id="123e4567-e89b-12d3-a456-426614174000";
const user={id,role:"user",email:"real-researcher@ordinarydomain.ca",stripe_customer_id:"cus_Sf001",stripe_subscription_id:"sub_Sf001",plan:"pro"};
const event=(type,obj,eventId)=>({stripe_event_id:eventId,event_type:type,payload:{data:{object:obj}}});
const checkout=event("checkout.session.completed",{object:"checkout.session",client_reference_id:id,mode:"subscription",status:"complete",customer:"cus_Sf001",subscription:"sub_Sf001",payment_link:"plink_1UYy8tL4BR0lqapBDHnvVO5k"},"evt_checkout");
const invoice=(invoiceId,price,amount,extras={})=>({object:"invoice",id:invoiceId,status:"paid",paid:true,currency:"cad",amount_paid:amount,customer:"cus_Sf001",subscription:"sub_Sf001",lines:{data:[{price:{id:price}}]},...extras});
test("only recognized, paid and nonzero SignalForge invoices count; Checkout alone is not money",()=>{
 const rows=[
  checkout,
  event("invoice.paid",invoice("in_good",SIGNALFORGE_PRICE_IDS.SF_PRICE_PRO_M,2900),"evt_paid"),
  event("invoice.paid",invoice("in_good",SIGNALFORGE_PRICE_IDS.SF_PRICE_PRO_M,2900),"evt_replayed_invoice_different_event"),
  event("invoice.paid",invoice("in_unrelated","price_NoteAnotherService",120000),"evt_unrelated"),
  event("invoice.paid",invoice("in_zero",SIGNALFORGE_PRICE_IDS.SF_PRICE_PRO_M,0),"evt_free"),
  event("invoice.paid",invoice("in_unpaid",SIGNALFORGE_PRICE_IDS.SF_PRICE_PRO_M,2900,{paid:false,status:"open"}),"evt_unpaid"),
  event("charge.refunded",{object:"charge",id:"ch_test",invoice:"in_good"},"evt_refund")
 ];
 const out=summarizeBillingEvents(rows,[user]);
 assert.equal(out.checkoutCompletedUsers,1);
 assert.equal(out.recognizedPaidInvoices,1);
 assert.equal(out.linkedPaidInvoices,1);
 assert.equal(out.linkedPaidSubscriberUsers,1);
 assert.equal(out.unmatchedPaidInvoices,0);
 assert.equal(out.sourceReportedGrossPaidCadMinor,2900);
 assert.equal(out.linkedRefundEvents,1);
 assert.equal(out.settledCashCadMinor,null);
 assert.equal(out.netRevenueCadMinor,null);
 assert.equal(out.stripeFeesCadMinor,null);
});
test("a signed matching SKU invoice without Checkout binding requires reconciliation",()=>{
 const out=summarizeBillingEvents([
  event("invoice.paid",invoice("in_orphan",SIGNALFORGE_PRICE_IDS.SF_PRICE_QUANT_M,9900,{customer:"cus_Unknown",subscription:"sub_Unknown"}),"evt_orphan")
 ],[user]);
 assert.equal(out.recognizedPaidInvoices,1);
 assert.equal(out.linkedPaidInvoices,0);
 assert.equal(out.unmatchedPaidInvoices,1);
 assert.equal(out.sourceReportedGrossPaidCadMinor,9900);
});
test("admin, test and example identities never become paying-customer evidence",()=>{
 const synthetic={...user,email:"fake@signalforge.test"};
 const out=summarizeBillingEvents([checkout,event("invoice.paid",invoice("in_valid",SIGNALFORGE_PRICE_IDS.SF_PRICE_PRO_M,2900),"evt_invoice")],[synthetic]);
 assert.equal(out.checkoutCompletedUsers,0);
 assert.equal(out.linkedPaidInvoices,0);
 assert.equal(out.unmatchedPaidInvoices,1);
 assert.equal(out.recognizedPaidInvoices,1);
});
test("failed invoice events only count for bound SignalForge customers",()=>{
 const failure=event("invoice.payment_failed",{customer:"cus_Sf001",subscription:"sub_Sf001"},"evt_failed");
 const unrelated=event("invoice.payment_failed",{customer:"cus_other",subscription:"sub_other"},"evt_unrelated_failed");
 const out=summarizeBillingEvents([checkout,failure,unrelated],[user]);
 assert.equal(out.failedInvoiceEvents,1);
 assert.equal(out.sourceReportedGrossPaidCadMinor,0);
});

test("a legitimate subscription renewal increases invoices, not unique paid customers",()=>{
 const rows=[
  checkout,
  event("invoice.paid",invoice("in_initial",SIGNALFORGE_PRICE_IDS.SF_PRICE_PRO_M,2900),"evt_initial"),
  event("invoice.paid",invoice("in_renewal",SIGNALFORGE_PRICE_IDS.SF_PRICE_PRO_M,2900),"evt_renewal")
 ];
 const o=summarizeBillingEvents(rows,[user]);
 assert.equal(o.linkedPaidInvoices,2);
 assert.equal(o.linkedPaidSubscriberUsers,1);
 assert.equal(o.sourceReportedGrossPaidCadMinor,5800);
});
test("a completed unrelated Stripe Payment Link does not count as a SignalForge customer",()=>{
 const unrelated={...checkout,payload:{data:{object:{...checkout.payload.data.object,payment_link:"plink_UnrelatedProduct"}}}};
 const o=summarizeBillingEvents([unrelated],[user]);
 assert.equal(o.checkoutCompletedUsers,0);
 assert.equal(o.linkedPaidSubscriberUsers,0);
});
