import {expect,test} from "bun:test";
import config from "../company-os/organization.v2.json";
import {compileOperatingBoard, validateSnapshot, verifySingleCompanyHierarchy} from "../company-os/operating-engine";

const at=new Date("2026-11-10T10:00:00.000Z");
function make(overrides:Record<string,any>={}):any{
 return {
  schemaVersion:"1.0.0",tenant:"signalforge",environment:"production",
  generatedAt:"2026-11-10T10:00:00.000Z",readOnly:true,
  source:"SignalForge PostgreSQL aggregate observations",
  privacy:{identifiersIncluded:false,freeTextIncluded:false,syntheticUsersExcluded:true},
  users:{total:120,signups7d:12,active7d:29,trials:12,paying:0},
  community:{posts:4,posts7d:0,authors:2},
  moderation:{open:3},product:{events7d:54},signals:{recorded:24,resolved:12},
  ...overrides
 };
}
test("one and only one Web3 company with management hierarchy and independent verifier",()=>{
 const result=verifySingleCompanyHierarchy();
 expect(result.roles).toBe(100);
 expect(result.root).toBe("sina_founder_os");
 expect(config.number_of_companies).toBe(1);
 expect(config.number_of_product_platforms).toBe(1);
 expect(config.operating_continuity.local_scheduler_creation).toBe(false);
 expect(config.agents.filter(x=>x.id==="managing_director")).toHaveLength(1);
 const verifier=config.agents.find(x=>x.id==="independent_verifier");
 expect(verifier?.reports_to).toBe("sina_founder_os");
});
test("real-source-shaped observations create ranked evidence-gated per-team work proposals",()=>{
 const board=compileOperatingBoard(make(),at);
 expect(board.managed_platforms).toBe(1);
 expect(board.company_operating_team).toBe(100);
 expect(board.goal).toBe("M20-SIGNALFORGE-COMMUNITY");
 expect(board.tenant).toBe("signalforge-market-intelligence");
 expect(board.operating_state.verified_collected_cash_cad).toBeNull();
 expect(board.operating_state.meaningful_activation_rate).toBeNull();
 expect(board.workpackets[0].id).toBe("SF-P0-OPEN-REPORTS");
 const ids=board.workpackets.map(x=>x.id);
 expect(ids).toContain("SF-P0-01");
 expect(ids).toContain("SF-P0-02");
 expect(ids).toContain("SF-P1-ETH-DATA");
 expect(ids).toContain("SF-P1-ONCHAIN-TOKEN");
 for(const packet of board.workpackets){
  expect(packet.parent_goal).toBe("M20-SIGNALFORGE-COMMUNITY");
  expect(packet.project_id).toBe("signalforge-market-intelligence");
  expect(packet.authority).toBe("PROPOSAL_ONLY_EXISTING_GOVERNOR_REQUIRED");
  expect(packet.resources.budget_usd).toBe(0);
  expect(packet.resources.production_mutation_allowed).toBe(false);
  expect(packet.resources.real_trades_allowed).toBe(false);
  expect(packet.resources.token_issuance_allowed).toBe(false);
  expect(packet.routing_state).toBe("AWAITING_EXISTING_COMPANY_OS_WORKPACKET");
  expect(packet.owner_role_id).not.toBe("independent_verifier");
 }
});
test("only bounded, anonymized commercial evidence can inform the single Company OS",()=>{
 const commercialEvidence={
  source:"SignalForge signed local webhook and authenticated source activity",
  asOf:at.toISOString(),genuineAccounts:20,tokenResearchersLast30Days:4,returnDayResearchersLast30Days:2,
  pricingViewersLast30Days:3,checkoutStartedUsersLast30Days:1,
  linkedPaidSubscriberUsersInRetainedEvents:0,sourceReportedGrossPaidCadMinor:0,
  settledCashCadMinor:null,settlementStatus:"NOT_INDEPENDENTLY_RECONCILED"
 };
 const board=compileOperatingBoard(make({commercialEvidence}),at);
 expect(board.operating_state.commercial_evidence.tokenResearchersLast30Days).toBe(4);
 expect(board.operating_state.commercial_evidence.settledCashCadMinor).toBeNull();
 expect(board.operating_state.verified_collected_cash_cad).toBeNull();
 expect(board.constraints.no_new_scheduler).toBe(true);
 expect(()=>compileOperatingBoard(make({commercialEvidence:{...commercialEvidence,settledCashCadMinor:1000}}),at)).toThrow();
 expect(()=>compileOperatingBoard(make({commercialEvidence:{...commercialEvidence,genuineAccounts:1}}),at)).toThrow();
});
test("stable same-day decision on same data, never invents activation rate or money",()=>{
 const x=compileOperatingBoard(make(),at),y=compileOperatingBoard(make(),at);
 expect(x).toEqual(y);
 expect(x.operating_state.source_reported_paying).toBe(0);
 expect(x.operating_state.verified_collected_cash_cad).toBeNull();
 expect(x.daily_plan_id).toBe("M20-SIGNALFORGE-COMMUNITY:2026-11-10");
});
test("different observed conditions reorder safe priorities, no manufactured trades",()=>{
 const a=compileOperatingBoard(make({moderation:{open:0},community:{posts:3,posts7d:2,authors:2}}),at);
 expect(a.workpackets[0].id).toBe("SF-P0-01");
 expect(a.workpackets.map(x=>x.id)).not.toContain("SF-P0-OPEN-REPORTS");
 expect(a.workpackets.map(x=>x.id)).not.toContain("SF-P1-COMMUNITY-ACTIVATION");
 expect(a.constraints.no_live_trading).toBe(true);
});
test("rejects stale, untrusted, cross-tenant, synthetic or malformed snapshots",()=>{
 const invalid=[
  make({tenant:"other-company"}),
  make({generatedAt:"2026-11-09T00:00:00Z"}),
  make({privacy:{identifiersIncluded:true,freeTextIncluded:false,syntheticUsersExcluded:true}}),
  make({users:{total:10,signups7d:1,active7d:99,trials:0,paying:0}}),
  make({signals:{recorded:2,resolved:3}}),
  make({readOnly:false})
 ];
 for(const bad of invalid)expect(()=>validateSnapshot(bad,at)).toThrow();
});


test("one existing operating brain incorporates measured M20 cohorts and bounded specialist decisions",()=>{
 const observed={eligible24h:200,activated24h:28,eligibleDay7:120,returnedDay7:12,
  maturedTrials:100,invoicePaidMatured:2,overdueReports:2,failedInvoices7d:1};
 const board=compileOperatingBoard(make({operatingMetrics:observed}),at);
 expect(board.operating_state.meaningful_activation_rate).toBe(0.14);
 expect(board.operating_state.d7_retention_rate).toBe(0.1);
 expect(board.operating_state.paid_conversion_rate).toBe(0.02);
 expect(board.operating_state.source_reported_policy_issues).toContain("SF-P0-BILLING_RECONCILE");
 expect(board.operating_state.source_reported_policy_issues).toContain("SF-P0-ACTIVATION_REPAIR");
 const action=board.workpackets.find(x=>x.id==="SF-P0-BILLING_RECONCILE");
 expect(action?.owner_role_id).toBe("billing_operator");
 expect(action?.authority).toBe("PROPOSAL_ONLY_EXISTING_GOVERNOR_REQUIRED");
 expect(action?.resources.external_effects_allowed).toBe(false);
 expect(board.operating_state.verified_collected_cash_cad).toBeNull();
});
test("no fake growth claims for insufficient cohorts and invalid counts",()=>{
 const metrics={eligible24h:55,activated24h:2,eligibleDay7:0,returnedDay7:0,
  maturedTrials:0,invoicePaidMatured:0,overdueReports:0,failedInvoices7d:0};
 const board=compileOperatingBoard(make({operatingMetrics:metrics}),at);
 expect(board.operating_state.meaningful_activation_rate).toBeNull();
 expect(board.operating_state.d7_retention_rate).toBeNull();
 expect(board.operating_state.paid_conversion_rate).toBeNull();
 expect(board.operating_state.source_reported_policy_issues).toEqual([]);
 expect(()=>compileOperatingBoard(make({operatingMetrics:{...metrics,eligible24h:1,activated24h:2}}),at)).toThrow();
});
