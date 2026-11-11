// Keep existing Railway variable names canonical while resolving monthly/annual Stripe checkout URLs.
export function stripeCheckoutUrlKey(plan:"pro"|"quant",interval:"month"|"year"){
 const suffix=interval==="year"?"ANNUAL":"MONTHLY";
 return "SIGNALFORGE_STRIPE_"+plan.toUpperCase()+"_"+suffix+"_URL";
}
