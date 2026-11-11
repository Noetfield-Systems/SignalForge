import {expect,test} from "bun:test";
import {stripeCheckoutUrlKey} from "../src/billing-keys";
test("billing checkout resolves the configured Railway variable names",()=>{
 expect(stripeCheckoutUrlKey("pro","month")).toBe("SIGNALFORGE_STRIPE_PRO_MONTHLY_URL");
 expect(stripeCheckoutUrlKey("pro","year")).toBe("SIGNALFORGE_STRIPE_PRO_ANNUAL_URL");
 expect(stripeCheckoutUrlKey("quant","month")).toBe("SIGNALFORGE_STRIPE_QUANT_MONTHLY_URL");
 expect(stripeCheckoutUrlKey("quant","year")).toBe("SIGNALFORGE_STRIPE_QUANT_ANNUAL_URL");
});
