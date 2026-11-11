import { paidInvoiceEvidence, validCheckoutBinding } from "./billing-evidence.mjs";

// Public, account-specific Stripe price identifiers; never API keys. An unrecognized
// invoice is NOT SignalForge revenue, even in the shared company Stripe account.
export const SIGNALFORGE_PRICE_IDS = Object.freeze({
 SF_PRICE_PRO_M:"price_1UYxf3L4BR0lqapB4InuEu4U",
 SF_PRICE_PRO_Y:"price_1UYxf5L4BR0lqapBw8m7iGgI",
 SF_PRICE_QUANT_M:"price_1UYxf6L4BR0lqapBXnxfsRSr",
 SF_PRICE_QUANT_Y:"price_1UYxf7L4BR0lqapB0mN9QfRg"
});

function objectOf(row){
 const raw=row?.payload;
 try{const payload=typeof raw==="string"?JSON.parse(raw):raw;return payload?.data?.object||null}
 catch{return null}
}
function idOf(raw){return typeof raw==="string"?raw:raw?.id||null}
function isGenuineUser(user){return user?.role==="user"&&!/@signalforge\.test$|@example\.com$|@signalforge\.invalid$/i.test(user.email||"")}

// Pure evidence classification. Live cash settlement, fees, refunds and net profit
// are deliberately unknown until reconciled against authoritative Stripe records.
export function summarizeBillingEvents(rows,users,prices=SIGNALFORGE_PRICE_IDS){
 const knownUsers=new Map(users.filter(isGenuineUser).map(u=>[String(u.id),u]));
 const bindings=new Map();
 const seen=new Set();
 const completed=new Set();
 for(const row of rows){
  if(seen.has(row.stripe_event_id))continue;
  seen.add(row.stripe_event_id);
  if(row.event_type!=="checkout.session.completed"&&row.event_type!=="checkout.session.async_payment_succeeded")continue;
  const binding=validCheckoutBinding(objectOf(row));
  if(!binding||!knownUsers.has(binding.userId))continue;
  bindings.set(binding.customerId+"|"+binding.subscriptionId,binding.userId);
  completed.add(binding.userId);
 }
 let recognizedInvoices=0,linkedInvoices=0,unmatchedInvoices=0,grossPaidMinor=0,failedInvoices=0,refundEvents=0,disputeEvents=0;
 const uniquePaidUsers=new Set();
 const invoiceIds=new Set(),seenInvoices=new Set();
 for(const row of rows){
  const o=objectOf(row);
  if(row.event_type==="invoice.paid"){
   const proof=paidInvoiceEvidence(o,prices);
   if(!proof||!proof.invoiceId||seenInvoices.has(proof.invoiceId))continue;
   seenInvoices.add(proof.invoiceId);
   recognizedInvoices++;
   grossPaidMinor+=proof.amountPaidMinor;
   invoiceIds.add(proof.invoiceId);
   const key=proof.customerId+"|"+proof.subscriptionId;
   const linkedId=bindings.get(key);
   const user=linkedId?knownUsers.get(linkedId):users.find(x=>isGenuineUser(x)&&x.stripe_customer_id===proof.customerId&&x.stripe_subscription_id===proof.subscriptionId);
   if(user){linkedInvoices++;uniquePaidUsers.add(String(user.id));}
   else unmatchedInvoices++;
  }
 }
 for(const row of rows){
  const o=objectOf(row);
  if(row.event_type==="invoice.payment_failed"){
   const customer=idOf(o?.customer),sub=idOf(o?.subscription||o?.parent?.subscription_details?.subscription);
   if(customer&&sub&&(bindings.has(customer+"|"+sub)||users.some(x=>isGenuineUser(x)&&x.stripe_customer_id===customer&&x.stripe_subscription_id===sub)))failedInvoices++;
  }
  if(row.event_type==="charge.refunded"&&invoiceIds.has(idOf(o?.invoice)))refundEvents++;
  if(row.event_type==="charge.dispute.created"&&invoiceIds.has(idOf(o?.invoice)))disputeEvents++;
 }
 return {checkoutCompletedUsers:completed.size,recognizedPaidInvoices:recognizedInvoices,linkedPaidInvoices:linkedInvoices,linkedPaidSubscriberUsers:uniquePaidUsers.size,unmatchedPaidInvoices:unmatchedInvoices,sourceReportedGrossPaidCadMinor:grossPaidMinor,failedInvoiceEvents:failedInvoices,linkedRefundEvents:refundEvents,linkedDisputeEvents:disputeEvents,settledCashCadMinor:null,stripeFeesCadMinor:null,netRevenueCadMinor:null,contributionMarginCadMinor:null};
}

export async function getRevenueSnapshot(db){
 const [users,events,paymentEvents,returning]=await Promise.all([
  db.unsafe("SELECT id,email,role,created_at,trial_ends_at,subscription_status,plan,billing_risk_status,stripe_customer_id,stripe_subscription_id FROM users"),
  db.unsafe("SELECT event_name,COUNT(DISTINCT user_id)::int AS users,COUNT(*)::int AS events FROM product_events WHERE source='server_observed' AND created_at>NOW()-INTERVAL '30 days' AND user_id IN (SELECT id FROM users WHERE role='user' AND email NOT LIKE '%@signalforge.test' AND email NOT LIKE '%@example.com' AND email NOT LIKE '%@signalforge.invalid') GROUP BY event_name ORDER BY events DESC"),
  db.unsafe("SELECT stripe_event_id,event_type,payload FROM payment_events WHERE event_type IN ('checkout.session.completed','checkout.session.async_payment_succeeded','invoice.paid','invoice.payment_failed','charge.refunded','charge.dispute.created') ORDER BY id DESC LIMIT 2001"),
   db.unsafe("SELECT COUNT(*)::int AS users FROM (SELECT e.user_id FROM product_events e JOIN users u ON u.id=e.user_id WHERE e.source='server_observed' AND e.event_name IN ('token_researched','token_watchlist_added','research_note_created','research_backtest') AND e.created_at>NOW()-INTERVAL '30 days' AND u.role='user' AND u.email NOT LIKE '%@signalforge.test' AND u.email NOT LIKE '%@example.com' AND u.email NOT LIKE '%@signalforge.invalid' GROUP BY e.user_id HAVING COUNT(DISTINCT DATE(e.created_at AT TIME ZONE 'UTC'))>=2) t")
 ]);
 const genuine=users.filter(isGenuineUser);
 const included=paymentEvents.slice(0,2000);
 const billing=summarizeBillingEvents(included,genuine);
 const active=genuine.filter(u=>u.subscription_status==="active"&&u.billing_risk_status==="clear").length;
 const pastDue=genuine.filter(u=>u.subscription_status==="past_due").length;
 const trials=genuine.filter(u=>u.subscription_status==="trialing"&&new Date(u.trial_ends_at).getTime()>Date.now()).length;
 const eventMap=Object.fromEntries(events.map(e=>[e.event_name,{users:e.users,events:e.events}]));
 const started=eventMap.checkout_started?.users||0;
 return {
  asOf:new Date().toISOString(),currency:"CAD",source:"SignalForge PostgreSQL; signed Stripe webhooks stored by Growth Function",
  status:paymentEvents.length>2000?"PARTIAL_EVENT_WINDOW":"SOURCE_REPORTED_NOT_SETTLED",
  coverage:{maxRecentStripeEvents:2000,eventsProcessed:included.length,completeForAllHistory:paymentEvents.length<=2000},
  accounts:{genuineAccounts:genuine.length,signupsLast30Days:genuine.filter(u=>new Date(u.created_at).getTime()>Date.now()-30*86400000).length,activeFreeTrials:trials,activePaidEntitlementsReportedByApp:active,pastDueEntitlementsReportedByApp:pastDue},
  funnel:{
    qualifiedPublicVisitorsLast30Days:null,
    qualifiedPublicVisitorsStatus:"NOT_MEASURED",
    authenticatedTokenResearchersLast30Days:eventMap.token_researched?.users||0,
    journalAdoptersLast30Days:eventMap.research_note_created?.users||0,
    returnDayResearchersLast30Days:returning[0]?.users||0,
    pricingViewersLast30Days:eventMap.pricing_view?.users||0,
    shareButtonUsersLast30Days:eventMap.report_share_clicked?.users||0,
    researchActionsLast30Days:{tokenWatchlistAdded:eventMap.token_watchlist_added?.users||0,backtest:eventMap.research_backtest?.users||0},
    checkoutStartedUsersLast30Days:started,
    checkoutCompletedUsersInRetainedWebhookWindow:billing.checkoutCompletedUsers,
    sourceLinkedPaidSubscriberUsersInRetainedWebhookWindow:billing.linkedPaidSubscriberUsers,
    eventsLast30Days:eventMap},
  billing:{...billing,sourceReportedGrossPaidCad:Number((billing.sourceReportedGrossPaidCadMinor/100).toFixed(2))},
  cautions:["Gross paid invoice amounts are signed-webhook observations, not bank settlement.","Only exact SignalForge price IDs qualify; unrelated company Stripe invoices are excluded.","Refund-adjusted revenue, Stripe fees, cash settlement and margin are unavailable until direct reconciliation.","Customer cohorts exclude admins and test/example addresses.","Anonymous visits are not measured as genuine human visitors; authenticated, source-backed research is measured instead.","Share interactions are button clicks, not independently verified external posts.","Return-day researchers have authenticated research actions on at least two distinct UTC calendar dates within 30 days."]
 };
}
