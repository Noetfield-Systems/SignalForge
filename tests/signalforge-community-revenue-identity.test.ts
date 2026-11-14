import {test,expect} from "bun:test";
import {compileSignalForgeCompany} from "../company-os/signalforge-autonomy.ts";
import {compileOperatingBoard} from "../company-os/operating-engine.ts";
test("M20 real Company OS receives independent research-community path and never ARQANT token economy",()=>{
 const at=new Date("2026-11-14T09:00:00.000Z");
 const s:any={schemaVersion:"1.0.0",tenant:"signalforge",environment:"production",generatedAt:at.toISOString(),readOnly:true,
  source:"SignalForge PostgreSQL aggregate observations",privacy:{identifiersIncluded:false,freeTextIncluded:false,syntheticUsersExcluded:true},
  users:{total:0,signups7d:0,active7d:0,trials:0,paying:0},
  community:{posts:0,posts7d:0,authors:0},moderation:{open:0},product:{events7d:0},signals:{recorded:0,resolved:0}};
 const out=compileSignalForgeCompany(compileOperatingBoard(s,at));
 expect(out.strategy_contract.community_execution_source).toBe("docs/SIGNALFORGE_COMMUNITY_REACHOUT_REVENUE_MASTER_v1.md");
 for(const dept of out.department_workstreams) {
  expect(dept.prompt).toContain("SIGNALFORGE_COMMUNITY_REACHOUT_REVENUE_MASTER");
  expect(dept.prompt).toContain("WQRR");
 }
 expect(out.counts.settled_cash_verified_from_this_projection).toBeNull();
});
test("independent SignalForge culture and monetization are not token/LP plans",async()=>{
 const doc=await Bun.file(new URL("../docs/SIGNALFORGE_COMMUNITY_REACHOUT_REVENUE_MASTER_v1.md",import.meta.url)).text();
 for(const lane of ["event researchers","perp analysts","Solana token investigators"])expect(doc).toContain(lane);
 expect(doc).toContain("not SignalForge's token");
 expect(doc).toContain("independent processor settlement");
});
