import {expect,test} from "bun:test";
import roadmap from "../company-os/venture-roadmap.v1.json";
import org from "../company-os/organization.v2.json";
import {compileOperatingBoard} from "../company-os/operating-engine.ts";
import {compileSignalForgeCompany,verifySignalForgeOnly} from "../company-os/signalforge-autonomy.ts";

test("founder roadmap remains scoped, multi-phase, parallel and never a dispatcher",()=>{
 expect(verifySignalForgeOnly().defined_roles).toBe(100);
 expect(roadmap.company.project_id).toBe("signalforge-market-intelligence");
 expect(roadmap.phases).toHaveLength(8);
 expect(roadmap.workstreams).toHaveLength(14);
 expect(roadmap.company.missions).toHaveLength(12);
 expect(roadmap.company.missions.every(m=>m.delivery_status==="PLANNED_UNDISPATCHED")).toBe(true);
 expect(roadmap.workstreams.some(x=>x.id==="W09")).toBe(false);
 expect(roadmap.workstreams.some(x=>x.id==="W10")).toBe(false);
 const owners=new Set(org.agents.map(x=>x.id));
 for(const mission of roadmap.company.missions){
  expect(owners.has(mission.owner_role_id)).toBe(true);
  expect(roadmap.workstreams.some(x=>x.id===mission.workstream_id)).toBe(true);
  expect(roadmap.phases.some(x=>x.id===mission.phase_id)).toBe(true);
  expect(mission.external_effects_authorized).toBe(false);
 }
});
test("roadmap is delivered through existing source-bound Company OS projection",()=>{
 const when=new Date("2026-11-13T12:00:00.000Z");
 const sample:any={
  schemaVersion:"1.0.0",tenant:"signalforge",environment:"production",
  generatedAt:when.toISOString(),readOnly:true,
  source:"SignalForge PostgreSQL aggregate observations",
  privacy:{identifiersIncluded:false,freeTextIncluded:false,syntheticUsersExcluded:true},
  users:{total:0,signups7d:0,active7d:0,trials:0,paying:0},
  community:{posts:0,posts7d:0,authors:0},moderation:{open:0},
  product:{events7d:0},signals:{recorded:0,resolved:0},
 };
 const board=compileOperatingBoard(sample,when);
 const compiled=compileSignalForgeCompany(board);
 expect(compiled.venture_roadmap.mission_candidates).toHaveLength(12);
 expect(compiled.venture_roadmap.initial_parallelism).toHaveLength(5);
 expect(compiled.venture_roadmap.owns_scheduler).toBe(false);
 expect(compiled.venture_roadmap.external_effects_authorized).toBe(false);
 expect(compiled.next_required_real_action).toContain("EXISTING_COMPANY_OS");
});
