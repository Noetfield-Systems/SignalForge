import {expect,test} from "bun:test";
import { evaluateCompanyPolicy, type CompanyMetrics } from "../src/company-os-policy";

const baseline:CompanyMetrics={
  eligible24h:0,activated24h:0,eligibleDay7:0,returnedDay7:0,
  maturedTrials:0,invoicePaidMatured:0,overdueReports:0,failedInvoices7d:0
};
test("No invented traction, spending, or conclusions with small cohorts",()=>{
 const p=evaluateCompanyPolicy(baseline);
 expect(p.decisions).toEqual([]);
 expect(p.insufficient).toHaveLength(3);
 expect(p.grants_external_authority).toBe(false);
 expect(p.independent_payment_receipts_verified).toBe(false);
 expect(p.human_research_users_verified).toBe(false);
 expect(p.project_id).toBe("signalforge-market-intelligence");
});
test("Threshold gates require at least 100 source-eligible accounts",()=>{
 let p=evaluateCompanyPolicy({...baseline,eligible24h:99,activated24h:0});
 expect(p.decisions).toEqual([]);
 p=evaluateCompanyPolicy({...baseline,eligible24h:100,activated24h:34});
 expect(p.decisions.map(x=>x.code)).toEqual(["SF-P0-ACTIVATION_REPAIR"]);
 expect(p.decisions[0].event_type).toBe("activation_drop");
 expect(p.decisions[0].rate).toBe(0.34);
 expect(p.decisions[0].effects_authorized).toBe(false);
 expect(evaluateCompanyPolicy({...baseline,eligible24h:100,activated24h:35}).decisions).toEqual([]);
});
test("Market/revenue and moderation priorities remain bounded and source-reported",()=>{
 const p=evaluateCompanyPolicy({...baseline,eligible24h:200,activated24h:30,
 eligibleDay7:120,returnedDay7:20,maturedTrials:100,invoicePaidMatured:2,
 overdueReports:1,failedInvoices7d:3});
 expect(p.decisions.map(x=>x.code)).toEqual([
 "SF-P0-BILLING_RECONCILE","SF-P0-MODERATION_OVERDUE",
 "SF-P0-TRIAL_CONVERSION_REPAIR","SF-P0-ACTIVATION_REPAIR",
 "SF-P0-RETENTION_REPAIR"]);
 expect(p.decisions.every(x=>x.evidence_level==="SOURCE_REPORTED_NOT_INDEPENDENTLY_VERIFIED")).toBe(true);
});
test("Reject malformed or impossible counts fail-closed",()=>{
 for(const bad of [NaN,-1,1.1,Infinity,1e12]){
   expect(()=>evaluateCompanyPolicy({...baseline,eligible24h:bad})).toThrow();
 }
 expect(()=>evaluateCompanyPolicy({...baseline,eligible24h:20,activated24h:21})).toThrow();
 expect(()=>evaluateCompanyPolicy({...baseline,eligibleDay7:20,returnedDay7:21})).toThrow();
 expect(()=>evaluateCompanyPolicy({...baseline,maturedTrials:3,invoicePaidMatured:4})).toThrow();
});
