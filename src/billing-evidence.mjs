// SignalForge billing evidence policy — no paid entitlement without a signed, paid,
// price-identified Stripe subscription invoice. Uses existing configured price IDs;
// no Stripe product can be assumed or inferred from email, Checkout selection, or UI.
const tiers=Object.freeze([
 ["SF_PRICE_PRO_M","pro","month"],["SF_PRICE_PRO_Y","pro","year"],
 ["SF_PRICE_QUANT_M","quant","month"],["SF_PRICE_QUANT_Y","quant","year"]
]);

export function priceIdentity(id,env={}){
 if(typeof id!=="string"||!/^price_[a-zA-Z0-9]+$/.test(id))return null;
 const found=tiers.filter(([key])=>typeof env[key]==="string"&&env[key]===id);
 // Duplicate environment mapping is configuration failure, not an entitlement.
 return found.length===1?{priceId:id,plan:found[0][1],period:found[0][2]}:null;
}
export function invoiceSubscriptionId(invoice){
 const raw=invoice?.subscription??invoice?.parent?.subscription_details?.subscription;
 const id=typeof raw==="string"?raw:raw?.id;
 return typeof id==="string"&&id.startsWith("sub_")?id:null;
}
export function invoiceCustomerId(invoice){
 const raw=invoice?.customer;
 const id=typeof raw==="string"?raw:raw?.id;
 return typeof id==="string"&&id.startsWith("cus_")?id:null;
}
export function priceIdsFromInvoice(invoice){
 const lines=invoice?.lines?.data;
 if(!Array.isArray(lines))return [];
 return [...new Set(lines.flatMap(line=>{
  const price=line?.price?.id||line?.price||line?.pricing?.price_details?.price;
  return typeof price==="string"?[price]:[];
 }))];
}
export function paidInvoiceEvidence(invoice,env={}){
 if(!invoice||invoice.object!=="invoice"||invoice.status!=="paid"||invoice.paid!==true)return null;
 if(invoice.currency!=="cad"||!Number.isSafeInteger(invoice.amount_paid)||invoice.amount_paid<=0)return null;
 const subscriptionId=invoiceSubscriptionId(invoice),customerId=invoiceCustomerId(invoice);
 if(!subscriptionId||!customerId)return null;
 const ids=priceIdsFromInvoice(invoice);
 if(ids.length!==1)return null; // mixed / unknown line items require manual reconciliation
 const product=priceIdentity(ids[0],env);
 if(!product)return null;
 return {...product,customerId,subscriptionId,invoiceId:typeof invoice.id==="string"?invoice.id:null,amountPaidMinor:invoice.amount_paid};
}
export function validCheckoutBinding(session){
 const userId=session?.client_reference_id;
 const customerId=typeof session?.customer==="string"?session.customer:session?.customer?.id;
 const subscriptionId=typeof session?.subscription==="string"?session.subscription:session?.subscription?.id;
 if(session?.mode!=="subscription"||session?.status!=="complete")return null;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId||"")))return null;
 if(!/^cus_[a-zA-Z0-9]+$/.test(String(customerId||""))||!/^sub_[a-zA-Z0-9]+$/.test(String(subscriptionId||"")))return null;
 return {userId,customerId,subscriptionId};
}
