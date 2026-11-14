import {expect,test} from "bun:test";

const html = await Bun.file(new URL("../public/index.html", import.meta.url)).text();
const server = await Bun.file(new URL("../src/server.ts", import.meta.url)).text();

test("market discovery UI exposes working search, data source integrity, score and direction controls",()=>{
  for(const id of ["view-scanner","scannerRows","scanSearch","scanSource","scanDirection","scanSort",
    "scanScore","scanFeedStatus","scanLiveCount","scanDemoCount","scanSignalsCount",
    "scanInspector","scanInspectChart","scanInspectBacktest"]){
    expect(html).toContain('id="'+id+'"');
  }
  expect(html).toContain("function renderScanner()");
  expect(html).toContain('addEventListener("change",runScanner)');
  expect(html).toContain("function openScanChart(");
  expect(html).toContain("function openScanBacktest(");
  expect(html).toContain("function scanPacificTime");
});
test("original app script remains valid JavaScript with interactive screener",()=>{
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1])
   .filter(x=>x.includes("function runScanner()"));
 expect(scripts).toHaveLength(1);
 expect(()=>new Function(scripts[0])).not.toThrow();
});
test("backend source-mode contract never silently conflates demo/stale Kraken data with real live",()=>{
 expect(server).toContain('if(path==="/api/scanner"){');
 expect(server).toContain("const integrity=assessMarketSourceIntegrity(p)");
 expect(server).toContain("sourceTimestamp:integrity.sourceTimestamp");
 expect(server).toContain("researchEligible:integrity.researchEligible");
 expect(server).toContain('liveSources,unavailableSources,interval');
 expect(server).toContain('sourceIndependentVerification:false');
 expect(html).toContain('source==="current"&&!real');
 expect(html).toContain("DEMO FALLBACK");
 expect(html).toContain("STALE / UNVERIFIED");
 expect(html).toContain("Confluence is not probability");
});
test("scanner stays in current product routing, without fake chain/liquidity",()=>{
 expect(html).toContain('data-view="scanner"');
 expect(html).toContain('id="btPair"');
 expect(html).toContain('id="btInterval"');
 expect(html).toContain('id="btStrategy"');
 expect(html).toContain('href="/radar"');
 expect(html).not.toContain("NANSEN REAL-TIME SMART MONEY");
});
