import {expect,test} from "bun:test";
test("Commercial pricing reflects the difference between a free trial and a charged subscription",async()=>{
 const source=await Bun.file(new URL("../services/growth-assets/railway-function.ts",import.meta.url)).text();
 expect(source).toContain("At trial expiry, users who have not actually purchased a subscription");
 expect(source).toContain("You can keep using your free trial or voluntarily pay now.");
 expect(source).toContain("Subscribe to Pro · Pay now");
 expect(source).toContain("Subscribe to Quant · Pay now");
 expect(source).toContain("Simply selecting a plan does not charge a card");
 expect(source).not.toContain("Reserve a plan now; no charge is taken during the trial.");
});
