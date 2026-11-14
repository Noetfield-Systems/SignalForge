import {expect, test} from "bun:test";
import v4 from "../strategy/PRODUCT-IDENTITY-SSOT-v4.json";
import manifest from "../strategy/SIGNALFORGE_2027_AMENDMENT_MANIFEST_v1.json";
import {compileOperatingBoard} from "../company-os/operating-engine.ts";
import {compileSignalForgeCompany, verifySignalForgeOnly} from "../company-os/signalforge-autonomy.ts";

test("Founder v4 extends SignalForge strategy without importing ARQANT or pretending launch",()=>{
 expect(v4.venture_id).toBe("signalforge-market-intelligence");
 expect(v4.mission_id).toBe("M20-SIGNALFORGE-COMMUNITY");
 expect(v4.current_production_baseline.not_yet_verified).toContain("onchain SignalForge token mint");
 expect(v4.token.status).toBe("DESIGN_ONLY_NOT_MINTED");
 expect(v4.token.independence).toContain("Not ARQANT AGC");
 expect(v4.runtime_split.internal).toContain("existing Sina Founder OS");
 expect(v4.runtime_split.customer).toContain("per-user");
 expect(manifest.actual_token_issued).toBe(false);
 expect(manifest.actual_live_trading).toBe(false);
 expect(manifest.verified_new_revenue).toBe(false);
 expect(manifest.workstreams).toHaveLength(12);
 expect(manifest.workstreams.every(x=>x.status==="PLANNED_UNDISPATCHED")).toBe(true);
});
test("Existing Company OS prompt compiler consumes and labels prospective v4 without dispatching",()=>{
 const when=new Date("2026-11-14T12:00:00Z");
 const observation:any={
   schemaVersion:"1.0.0",tenant:"signalforge",environment:"production",
   generatedAt:when.toISOString(),readOnly:true,source:"SignalForge PostgreSQL aggregate observations",
   privacy:{identifiersIncluded:false,freeTextIncluded:false,syntheticUsersExcluded:true},
   users:{total:0,signups7d:0,active7d:0,trials:0,paying:0},
   community:{posts:0,posts7d:0,authors:0},moderation:{open:0},
   product:{events7d:0},signals:{recorded:0,resolved:0}
 };
 expect(verifySignalForgeOnly().existing_scheduler_only).toBe(true);
 const result=compileSignalForgeCompany(compileOperatingBoard(observation,when));
 expect(result.founder_amendment.identity_contract).toBe("strategy/PRODUCT-IDENTITY-SSOT-v4.json");
 expect(result.founder_amendment.dispatch_performed).toBe(false);
 expect(result.founder_amendment.native_token_issued).toBe(false);
 expect(result.founder_amendment.workstreams).toHaveLength(12);
 expect(result.orchestration.no_new_scheduler).toBe(true);
 for (const r of result.role_assignments){
   expect(r.prompt).toContain("FOUNDER 2027 V4 CANONICAL");
   expect(r.prompt).toContain("NOT ARQANT AGC");
   expect(r.prompt).toContain("WorkPacket");
   expect(r.actual_provider_invocations).toBe(0);
 }
});
test("Tokenomics whitepaper remains unratified and sum of allocation buckets is 100",async()=>{
 const doc=await Bun.file(new URL("../docs/SIGNALFORGE_2027_TOKEN_GENESIS_SALE_AIRDROP_v1.md",import.meta.url)).text();
 expect(doc).toContain("NON-RATIFIED");
 expect(doc).toContain("Stage A");
 expect(doc).toContain("Stage B");
 const table=doc.split("Illustrative token allocation")[1].split("## 3.")[0];
 const perc=[...table.matchAll(/^\|\s*[^|\n]+\s*\|\s*(\d+)%\s*\|/gm)].map(x=>Number(x[1]));
 expect(perc).toEqual([26,18,18,12,12,10,4]);
 expect(perc.reduce((a,b)=>a+b,0)).toBe(100);
});
