import {expect, test} from "bun:test";
import {calculateScenario,output} from "../scripts/forecast.ts";
import scenarios from "../strategy/m20-scenarios.v1.json";
const prices={pro_monthly:29,quant_monthly:99,pro_share:0.85,quant_share:0.15};

test("price blending uses real published CAD plan prices, not an invented receipt",()=>{
 const x=calculateScenario({case:"base",day:90,cumulative_new_signups:650,matured_trial_users:400,trial_to_paid_rate:0.05,paid_retention_factor:0.85},prices);
 expect(x.assumed_avg_monthly_price_cad).toBe(39.5);
 expect(x.modeled_paying_users).toBe(17);
 expect(x.modeled_gross_mrr_cad).toBe(671.5);
 expect(x.verified_collected_cash_cad).toBeNull();
 expect(x.reliability).toContain("SCENARIO_ONLY");
});
test("all six scenarios are bounded and do not claim cash",()=>{
 const rows=output();
 expect(rows.length).toBe(6);
 expect(rows.map(x=>x.modeled_gross_mrr_cad)).toEqual([79,671.5,4029,632,5293,25596]);
 for(const item of rows){
   expect(item.verified_collected_cash_cad).toBeNull();
   expect(item.modeled_paying_users).toBeLessThanOrEqual(item.matured_trial_users);
 }
});
test("rejects impossible conversion, unearned eligibility, unsafe price mix",()=>{
 const row=scenarios.scenarios[0];
 expect(()=>calculateScenario({...row,trial_to_paid_rate:2},prices)).toThrow("INVALID_ILLUSTRATIVE_SCENARIO");
 expect(()=>calculateScenario({...row,matured_trial_users:999999},prices)).toThrow("INVALID_ILLUSTRATIVE_SCENARIO");
 expect(()=>calculateScenario(row,{...prices,pro_share:0.9})).toThrow("INVALID_ILLUSTRATIVE_SCENARIO");
 expect(()=>calculateScenario({...row,paid_retention_factor:Number.NaN},prices)).toThrow("INVALID_ILLUSTRATIVE_SCENARIO");
});
