import {expect,test} from "bun:test";
import {compileOperatingBoard} from "../company-os/operating-engine.ts";
import {compileSignalForgeCompany,verifySignalForgeOnly} from "../company-os/signalforge-autonomy.ts";

const when=new Date("2026-11-13T12:00:00.000Z");
function snapshot(changes:Record<string,unknown>={}):any{
 return {
  schemaVersion:"1.0.0",tenant:"signalforge",environment:"production",
  generatedAt:when.toISOString(),readOnly:true,
  source:"SignalForge PostgreSQL aggregate observations",
  privacy:{identifiersIncluded:false,freeTextIncluded:false,syntheticUsersExcluded:true},
  users:{total:12,signups7d:3,active7d:4,trials:1,paying:0},
  community:{posts:3,posts7d:1,authors:2},moderation:{open:0},
  product:{events7d:7},signals:{recorded:10,resolved:6},
  ...changes,
 };
}
test("real 100 role contracts compile into 11 scoped department missions",()=>{
 const org=verifySignalForgeOnly();
 expect(org.defined_roles).toBe(100);
 expect(org.departments).toBe(11);
 const board=compileOperatingBoard(snapshot(),when);
 const x=compileSignalForgeCompany(board);
 expect(x.project_id).toBe("signalforge-market-intelligence");
 expect(x.goal).toBe("M20-SIGNALFORGE-COMMUNITY");
 expect(x.department_workstreams).toHaveLength(11);
 expect(x.role_assignments).toHaveLength(100);
 expect(new Set(x.role_assignments.map(r=>r.role_id)).size).toBe(100);
 expect(x.role_assignments.filter(r=>r.activation==="EVENT_DRIVEN_IDLE").length).toBeGreaterThan(0);
 for(const d of x.department_workstreams){
  expect(d.prompt).toContain("NOETFIELD AGENTOS");
  expect(d.prompt).toContain("SIGNALFORGE COMPANY M20");
  expect(d.next_action.length).toBeGreaterThan(15);
  expect(d.dispatch_effects_authorized).toBe(false);
  expect(d.current_evidence_state).toBe("PRODUCT_SOURCE_REPORTED_UNVERIFIED");
 }
 for(const r of x.role_assignments){
  expect(r.prompt).toContain("Founder goal:");
  expect(r.prompt).toContain("M20");
  expect(r.prompt).toContain("ROLE PROMPT CONTRACT");
  expect(r.actual_provider_invocations).toBe(0);
  expect(r.artifact_receipt).toBeNull();
 }
 expect(x.orchestration.no_new_scheduler).toBe(true);
 expect(x.orchestration.maximum_internal_parallel_drafts).toBeGreaterThan(0);
 expect(x.counts.product_releases_verified_from_this_projection).toBe(0);
 expect(x.counts.settled_cash_verified_from_this_projection).toBeNull();
 expect(x.independent_completion_claimed).toBe(false);
});
test("same source produces stable role-specific prompts; live change changes priority",()=>{
 const a=compileSignalForgeCompany(compileOperatingBoard(snapshot(),when));
 const b=compileSignalForgeCompany(compileOperatingBoard(snapshot(),when));
 expect(a).toEqual(b);
 expect(a.department_workstreams.find(d=>d.id==="commercial")!.workpacket_id).toBe("SF-P0-01");
 const next=compileSignalForgeCompany(compileOperatingBoard(
  snapshot({moderation:{open:3}}),when));
 expect(next.source_workpackets.map(x=>x.id)).toContain("SF-P0-OPEN-REPORTS");
 expect(next.department_workstreams.find(d=>d.id==="growth")!.prompt).toContain("crypto market");
});
test("reject cross-company, stale and rewritten privileged workpackets",()=>{
 const board=compileOperatingBoard(snapshot(),when);
 expect(()=>compileSignalForgeCompany({...board,tenant:"earnloop"})).toThrow();
 expect(()=>compileSignalForgeCompany({...board,source_generated_at:"2026-01-01T00:00:00Z"})).toThrow();
 expect(()=>compileSignalForgeCompany({...board,workpackets:[{
  ...board.workpackets[0],authority:"IMMEDIATE_PRODUCTION_ACCESS"
 }]})).toThrow();
 expect(()=>compileSignalForgeCompany({...board,workpackets:[{
  ...board.workpackets[0],project_id:"other-company"
 }]})).toThrow();
});
test("only manager prompts are sent as 11 department starting proposals, all 100 roles remain available",()=>{
 const x=compileSignalForgeCompany(compileOperatingBoard(snapshot(),when));
 const heads=x.department_workstreams.map(x=>x.head_role_id);
 expect(new Set(heads).size).toBe(11);
 expect(heads).toContain("managing_director");
 expect(heads).toContain("independent_verifier");
 expect(x.orchestration.scheduler).toBe("EXISTING_SINA_HEARTBEAT");
 expect(x.next_required_real_action).toContain("EXISTING_COMPANY_OS");
 expect(x.candidate_delivery_workcells.every(x=>x.state==="PROPOSED_NOT_DISPATCHED")).toBe(true);
});
