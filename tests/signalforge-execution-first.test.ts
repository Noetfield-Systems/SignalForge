import {expect,test} from "bun:test";
import org from "../company-os/organization.v2.json";
import doctrine from "../strategy/SIGNALFORGE_EXECUTION_FIRST_NETWORK_DOCTRINE_v1.json";
import identity from "../strategy/PRODUCT-IDENTITY-SSOT-v4.json";
import {compileOperatingBoard} from "../company-os/operating-engine.ts";
import {compileSignalForgeCompany} from "../company-os/signalforge-autonomy.ts";

test("execution-first is the Founder default, not discretionary approval theater",()=>{
 expect(doctrine.work.default).toBe("EXECUTE_BY_DEFAULT");
 expect(identity.execution_defaults.reversible_code_and_research).toBe("EXECUTE_NOW");
 expect(identity.execution_defaults.community_or_investor_validation).toBe("NOT_A_LAUNCH_GATE");
 expect(doctrine.work.exception_only.some(x=>x.includes("real token sale"))).toBe(true);
 expect(doctrine.work.exception_only.some(x=>x.includes("destructive"))).toBe(true);
 expect(doctrine.venture).toBe("signalforge-market-intelligence");
 expect(doctrine.mission).toBe("M20-SIGNALFORGE-COMMUNITY");
});
test("ten scoped draft slots, compatible migrations no manual approval",()=>{
 expect(org.operating_continuity.max_parallel_internal_drafts).toBe(10);
 expect(org.operating_continuity.max_unverified_strategic_workpackets_per_company).toBe(10);
 const backend=org.agents.find(x=>x.id==="backend_engineer");
 expect(backend?.scope).toContain("backward_compatible_schema_migrations_with_ci");
 expect(backend?.scope).not.toContain("schema_migrations_with_approval");
 expect(org.operating_continuity.local_scheduler_creation).toBe(false);
});
test("Company OS compiler injects bold thesis and automatic owned work but never fabricates runners",()=>{
 const t=new Date("2026-11-14T12:00:00.000Z");
 const s:any={schemaVersion:"1.0.0",tenant:"signalforge",environment:"production",
  generatedAt:t.toISOString(),readOnly:true,source:"SignalForge PostgreSQL aggregate observations",
  privacy:{identifiersIncluded:false,freeTextIncluded:false,syntheticUsersExcluded:true},
  users:{total:0,signups7d:0,active7d:0,trials:0,paying:0},
  community:{posts:0,posts7d:0,authors:0},moderation:{open:0},
  product:{events7d:0},signals:{recorded:0,resolved:0}};
 const compiled=compileSignalForgeCompany(compileOperatingBoard(s,t));
 expect(compiled.execution_first.default_action).toBe("EXECUTE_BY_DEFAULT");
 expect(compiled.execution_first.ordinary_founder_reapproval_required).toBe(false);
 expect(compiled.execution_first.provider_approval_is_terminal).toBe(false);
 expect(compiled.execution_first.external_dispatch_performed).toBe(false);
 expect(compiled.orchestration.no_new_scheduler).toBe(true);
 expect(compiled.orchestration.maximum_internal_parallel_drafts).toBe(10);
 for(const r of compiled.role_assignments){
  expect(r.prompt).toContain("EXECUTE BY DEFAULT");
  expect(r.prompt).toContain("FOUNDER EXECUTION FIRST");
  expect(r.prompt).toContain("ATTRACTION & MOAT");
  expect(r.actual_provider_invocations).toBe(0);
 }
});
test("published homepage markets real research with radically distinctive thesis and working routes",async()=>{
 const html=await Bun.file(new URL("../public/welcome.html",import.meta.url)).text();
 expect(html).toContain("The market is alive.");
 expect(html).toContain("Forge what moves it.");
 expect(html).toContain("building a living network");
 for(const p of ['/web3','/radar'])expect(html).toContain('href="'+p+'"');
 expect(html).toContain("Checking public source");
});
