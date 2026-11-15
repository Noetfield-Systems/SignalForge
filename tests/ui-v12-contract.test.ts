import {expect,test} from "bun:test";
const file=(path:string)=>Bun.file(new URL("../"+path,import.meta.url)).text();

test("all source-first v12 modules use the same instrument-grade design, without alternate runtime",async()=>{
 const css=await file("public/sf-ui.css");
 expect(css).toContain("INSTRUMENT GRADE VISUAL LANGUAGE");
 for(const page of ["workspace","terminal","agent","radar","pulse","developers","marketing","research-card","internal"])
  expect(css).toContain('data-sf-surface="'+page+'"');
 for(const f of ["Manrope","Space Grotesk","IBM Plex Mono"])expect(css).toContain(f);
 for(const component of [".sf-synapse",".sf-legacy-native",".sf-agent-secondary",
  ".sf-source-venue",".sf-mcp-live-readback",".sf-research-receipt",".sf-view-navigation",
  ".sf-mobile-dock",".sf-command"])expect(css).toContain(component);
});
test("public pages share only the real Kraken observation rail and honest source labels",async()=>{
 const js=await file("public/sf-ui.js");
 for(const x of ['fetch("/api/market?symbol=BTCUSD&interval=60"','data?.mode==="LIVE_PUBLIC_DATA"',
    'data?.summary?.price','SOURCE UNAVAILABLE','SOURCE OFFLINE · NO LIVE QUOTE',
    '"agent","radar","pulse","developers","marketing","research-card"'])
   expect(js).toContain(x);
 expect(js).not.toContain("Math.random()");
});
test("legacy application now shares TradingView charts without discarding existing market fallback",async()=>{
 const app=await file("public/index.html");
 expect(app).toContain('id="sfLegacyNativeChart"');
 expect(app).toContain('/assets/lightweight-charts.js');
 expect(app).toContain('/assets/sf-market-chart.js');
 expect(app).toContain('window.SFMarketChart.mount(target)');
 expect(app).toContain('mode==="LIVE_PUBLIC_DATA"');
 expect(app).toContain('canvas.hidden=false');
 expect(app).toContain('id="priceChart"');
 for(const v of ["scanner","strategies","backtest","trackrecord","community","models","api","pricing"]){
  expect(app).toContain('id="view-'+v+'"');
  expect(app).toContain('aria-label="'+v+' workflow shortcuts"');
 }
});
test("agent first-use prioritizes real composer above secondary content, preserving jobs and saved work",async()=>{
 const html=await file("public/agent.html");
 expect(html.indexOf('id="researchForm"')).toBeLessThan(html.indexOf('class="sf-agent-secondary"'));
 for(const id of ["prompt","engineChoice","run","feedback","customerTasks","forgeForm","genesisScore","v6Workspace","verifyReceipt"])
  expect(html).toContain('id="'+id+'"');
});
test("Web3 venue coverage never implies research-target venues are already connected",async()=>{
 const p=await file("public/web3-market-pulse.html");
 for(const venue of ["Polymarket","Hyperliquid","Solana"])expect(p).toContain(venue);
 expect(p).toContain("Research targets only:");
 expect(p).toContain('class="note sf-venue-connectivity"');
});
test("MCP manifest status and public receipt use real backends and truthful empty states",async()=>{
 const [d,r]=await Promise.all([file("public/developers.html"),file("public/research-card.html")]);
 expect(d).toContain('id="sfMcpLiveReadback"');
 expect(d).toContain('fetch("/server.json"');
 expect(r).toContain('id="sfResearchSourceCount"');
 expect(r).toContain('Array.isArray(d.evidence)');
 expect(r).toContain("No public observations remain attached");
 expect(r).toContain("/api/agent/public/");
});
