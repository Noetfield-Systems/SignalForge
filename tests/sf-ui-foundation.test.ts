import {expect,test} from "bun:test";
const BASE=new URL("../",import.meta.url);
const read=(file:string)=>Bun.file(new URL(file,BASE)).text();
test("shared SFUI navigation is one contract used across main customer surfaces",async()=>{
 const js=await read("public/sf-ui.js");
 const expected=["/terminal-next","/agent","/radar","/web3","/developers","/app?view=community"];
 for(const path of expected)expect(js).toContain(path);
 for(const file of ["public/terminal-next.html","public/agent.html","public/token-radar.html","public/web3-market-pulse.html","public/index.html","public/developers.html","public/welcome.html"]){
  const html=await read(file);
  expect(html).toContain("/assets/sf-ui.css");
  expect(html).toContain("/assets/sf-ui.js");
  expect(html).toContain("data-sf-nav");
 }
});
test("real chart library hosted by existing server not an external fake demo",async()=>{
 const server=await read("src/server.ts"),html=await read("public/terminal-next.html"),pkg=JSON.parse(await read("package.json"));
 expect(pkg.dependencies["lightweight-charts"]).toBe("5.2.1");
 for(const asset of ["/assets/lightweight-charts.js","/assets/sf-market-chart.js","/assets/sf-ui.js","/assets/sf-ui.css"])expect(server).toContain(asset);
 expect(html).toContain("/assets/lightweight-charts.js");
 expect(html).toContain("https://www.tradingview.com/");
 expect(html).toContain('id="sfNativeCandleChart"');
 expect(html).toContain('mode!=="LIVE_PUBLIC_DATA"');
 expect(html).toContain("sfChart.setData(state.candles,mode)");
 expect(html).toContain('"/api/agent/research"');
 expect(html).not.toContain("function chart(){const svg=");
});
test("chart normalizes and rejects malformed or fabricated price/time values",async()=>{
 const code=await read("public/sf-market-chart.js");
 const w:any={};
 new Function("window",code)(w);
 const ts=1763154000;
 const sample=[
  {time:ts,open:100,high:120,low:95,close:116,volume:250},
  {time:ts+60,open:116,high:119,low:111,close:113,volume:175},
  {time:ts,open:100,high:120,low:95,close:116,volume:250}, // duplicate
  {time:ts+120,open:113,high:80,low:101,close:110}, // invalid high
  {time:ts+180,open:-1,high:1,low:-2,close:0},
  {time:ts+240,open:105,high:110,low:95,close:Infinity},
  {time:"invalid",open:105,high:111,low:99,close:110}
 ];
 expect(w.SFMarketChart.normalize(sample)).toEqual(sample.slice(0,2));
 expect(w.SFMarketChart.mount(null)).toBeNull();
});
test("terminal runs genuine existing bounded customer research, not a fake agent answer",async()=>{
 const html=await read("public/terminal-next.html");
 expect(html).toContain('id="inlineAgentResult"');
 expect(html).toContain("Run source research");
 expect(html).toContain('fetch("/api/agent/research"');
 expect(html).toContain("sourceUrl");
 expect(html).toContain("No live observations were substituted with demo data.");
 expect(html).not.toContain("Copy prompt and open Agent");
});
