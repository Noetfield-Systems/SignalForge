import {test,expect} from "bun:test";
import atlas from "../strategy/WEB3_NATIVE_MARKET_ATLAS_v1.json";
import identity from "../strategy/PRODUCT-IDENTITY-SSOT-v3.json";
import team from "../company-os/team10-continuation.v1.json";
test("the real Founder Web3 market excerpt, not later chart software, owns SignalForge research direction",()=>{
 expect(atlas.project_id).toBe("signalforge-market-intelligence");
 expect(atlas.mission_id).toBe("M20-SIGNALFORGE-COMMUNITY");
 expect(atlas.markets.map(x=>x.id)).toEqual(["PREDICTION_MARKETS","PERPETUAL_DEX","MEME_COIN_TRENCHES"]);
 expect(atlas.source_classification.explicit_user_names).toEqual(["Polymarket","Kalshi","Hyperliquid","Lighter","Aster","Variational"]);
 expect(identity.reference_benchmarks.filter(x=>x.user_reference).map(x=>x.name)).toEqual(atlas.source_classification.explicit_user_names);
 expect(atlas.source_classification.historical_original_full_report_location).toMatch(/NOT_VERIFIED/);
 expect(atlas.source_classification.research_added_trenches).toContain("pump.fun");
 expect(atlas.source_classification.research_added_trenches.some(x=>atlas.source_classification.explicit_user_names.includes(x))).toBe(false);
 expect(team.team_size).toBe(10);
 expect(team.market_atlas).toBe(identity.web3_market_atlas);
 expect(team.benchmarks.join(" ")).toContain("Hyperliquid");
 expect(team.benchmarks.join(" ")).toContain("Polymarket");
});
test("each primary Web3 venue has a named source and clear nontrading research objective",()=>{
 for(const p of atlas.platforms){
  expect(atlas.markets.some(m=>m.id===p.market)).toBe(true);
  expect(p.signalforge_goal.length).toBeGreaterThan(24);
  if(p.user_reference)expect(p.reference).toMatch(/^https:\/\//);
 }
 expect(atlas.operating_loop.dispatch).toContain("Agent Fabric");
 expect(atlas.operating_loop.outreach_truth).toContain("No fake");
 expect(identity.technical_tool_references).toContain("Nansen");
});
