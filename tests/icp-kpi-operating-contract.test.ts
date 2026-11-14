import {test,expect} from "bun:test";
import contract from "../strategy/ICP_KPI_OPERATING_CONTRACT_v1.json";
import identity from "../strategy/PRODUCT-IDENTITY-SSOT-v3.json";
import atlas from "../strategy/WEB3_NATIVE_MARKET_ATLAS_v1.json";
import {compileOperatingBoard} from "../company-os/operating-engine.ts";
import {compileSignalForgeCompany} from "../company-os/signalforge-autonomy.ts";
test("SignalForge Web3 three ICPs, source truth and measured targets do not drift",()=>{
 expect(contract.project_id).toBe(identity.project_id);
 expect(contract.mission_id).toBe(atlas.mission_id);
 expect(contract.icps.slice(0,3).map(x=>x.id)).toEqual(["event_researcher","perp_researcher","solana_token_researcher"]);
 expect(contract.icps.slice(0,3).map(x=>x.entry)).toEqual(["/web3#prediction","/web3#perps","/radar"]);
 expect(identity.icp_kpi_contract).toBe("strategy/ICP_KPI_OPERATING_CONTRACT_v1.json");
 expect(contract.north_star.status).toBe("NOT_MEASURED_AS_DEFINED");
 expect(contract.experiments.targets_are_proposals_not_results).toBe(true);
 expect(contract.providers.filter(x=>x.state==="PUBLIC_READ_ONLY_CONNECTED").map(x=>x.name)).toEqual(["Polymarket Gamma","Hyperliquid Info"]);
 expect(contract.providers.filter(x=>x.state==="REFERENCE_ONLY")).toHaveLength(2);
});
test("existing Company OS prompt compiler consumes ICP/KPI contract",()=>{
 const when=new Date("2026-11-13T12:00:00Z");
 const s:any={schemaVersion:"1.0.0",tenant:"signalforge",environment:"production",generatedAt:when.toISOString(),source:"SignalForge PostgreSQL aggregate observations",readOnly:true,privacy:{identifiersIncluded:false,freeTextIncluded:false,syntheticUsersExcluded:true},users:{total:0,signups7d:0,active7d:0,trials:0,paying:0},community:{posts:0,posts7d:0,authors:0},moderation:{open:0},product:{events7d:0},signals:{recorded:0,resolved:0}};
 const c=compileSignalForgeCompany(compileOperatingBoard(s,when));
 expect(c.strategy_contract.north_star).toBe("WQRR");
 for(const d of c.department_workstreams){expect(d.prompt).toContain("event_researcher");expect(d.prompt).toContain("perp_researcher");expect(d.prompt).toContain("solana_token_researcher");expect(d.prompt).toContain("WQRR");}
});
test("promised Web3 lane CTAs lead to actual anchors",async()=>{
 const a=await Bun.file(new URL("../public/welcome.html",import.meta.url)).text();
 const b=await Bun.file(new URL("../public/web3-market-pulse.html",import.meta.url)).text();
 for(const route of ["/web3#prediction","/web3#perps","/radar"])expect(a).toContain('href="'+route+'"');
 for(const id of ["prediction","perps","trenches"])expect(b).toContain('id="'+id+'"');
});
