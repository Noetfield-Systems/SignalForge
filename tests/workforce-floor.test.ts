import {expect,test} from "bun:test";
import organization from "../company-os/organization.v2.json";
import {compileOperatingBoard} from "../company-os/operating-engine.ts";
import {compileWorkforceFloor,verifyWorkforceContracts} from "../company-os/workforce-floor.ts";

const now=new Date("2026-11-13T11:00:00Z");
function snapshot(overrides:Record<string,unknown>={}):any{
 return {
 schemaVersion:"1.0.0",tenant:"signalforge",environment:"production",
 generatedAt:now.toISOString(),readOnly:true,source:"SignalForge PostgreSQL aggregate observations",
 privacy:{identifiersIncluded:false,freeTextIncluded:false,syntheticUsersExcluded:true},
 users:{total:85,signups7d:6,active7d:20,trials:3,paying:0},
 community:{posts:7,posts7d:0,authors:4},moderation:{open:2},
 product:{events7d:12},signals:{recorded:10,resolved:4},...overrides
 };
}
test("exactly 100 unique accountable role contracts across 11 fully reconciled departments",()=>{
 const x=verifyWorkforceContracts();
 expect(x.roles).toBe(100);
 expect(x.departments).toBe(11);
 expect(x.independent_review_roles).toBe(2);
 expect(new Set(organization.agents.map(a=>a.id)).size).toBe(100);
 expect(organization.agents.filter(a=>a.department==="engineering")).toHaveLength(20);
 expect(organization.agents.filter(a=>a.department==="product")).toHaveLength(10);
 expect(organization.agents.every(a=>a.operating_contract.atomic_task.length>12)).toBe(true);
 expect(organization.agents.every(a=>a.operating_contract.acceptance_criteria.length>=2)).toBe(true);
 expect(organization.agents.every(a=>a.operating_contract.current_binding==="NOT_VERIFIED")).toBe(true);
 expect(organization.operating_continuity.local_scheduler_creation).toBe(false);
});
test("source-observed goals expand to dependent microtasks with independent verifier",()=>{
 const board=compileOperatingBoard(snapshot(),now);
 const floor=compileWorkforceFloor(board);
 expect(floor.org.defined_roles).toBe(100);
 expect(floor.org.verified_live_agents).toBeNull();
 expect(floor.org.claimed_human_employees).toBe(0);
 expect(floor.capacity.admitted_workpackets).toBeNull();
 expect(floor.workstreams.length).toBeGreaterThan(0);
 expect(floor.microtasks.length).toBe(floor.workstreams.length*4);
 for(const stream of floor.workstreams){
  const tasks=floor.microtasks.filter(t=>t.parent_workpacket===stream.id);
  expect(tasks.map(t=>t.stage)).toEqual(["DISCOVER","DELIVER","REVIEW","VERIFY"]);
  expect(tasks[0].depends_on).toEqual([]);
  expect(tasks[1].depends_on).toEqual([tasks[0].id]);
  expect(tasks[2].depends_on).toEqual([tasks[1].id]);
  expect(tasks[3].depends_on).toEqual([tasks[2].id]);
  expect(tasks[3].role_id).toBe("independent_verifier");
  expect(tasks.every(t=>t.state==="PROPOSED_NOT_DISPATCHED")).toBe(true);
  expect(tasks.every(t=>t.external_effects_authorized===false)).toBe(true);
 }
 expect(floor.department_workcells.reduce((sum,d)=>sum+d.defined_seats,0)).toBe(100);
 expect(floor.department_workcells.flatMap(d=>d.role_contracts)).toHaveLength(100);
 expect(JSON.stringify(floor)).not.toContain("settledCashCadMinor\":1000");
});
test("different real observations yield different bounded plans without inventing work completion",()=>{
 const withReports=compileWorkforceFloor(compileOperatingBoard(snapshot(),now));
 const withoutReports=compileWorkforceFloor(compileOperatingBoard(snapshot({moderation:{open:0},community:{posts:7,posts7d:3,authors:4}}),now));
 expect(withReports.workstreams.some(w=>w.id==="SF-P0-OPEN-REPORTS")).toBe(true);
 expect(withoutReports.workstreams.some(w=>w.id==="SF-P0-OPEN-REPORTS")).toBe(false);
 expect(withReports.microtasks.every(t=>t.evidence_state==="SOURCE_REPORTED_UNVERIFIED")).toBe(true);
 expect(withReports.org.verified_completed_tasks).toBeNull();
});
test("reject cross tenant, unapproved and fabricated work packets",()=>{
 const board=compileOperatingBoard(snapshot(),now);
 expect(()=>compileWorkforceFloor({...board,tenant:"untrusted-company"})).toThrow();
 expect(()=>compileWorkforceFloor({...board,workpackets:[{...board.workpackets[0],authority:"PERMITTED"}]})).toThrow();
 expect(()=>compileWorkforceFloor({...board,workpackets:[{...board.workpackets[0],owner_role_id:"unknown-worker"}]})).toThrow();
 expect(()=>compileWorkforceFloor({...board,workpackets:Array(31).fill(board.workpackets[0])})).toThrow();
});
