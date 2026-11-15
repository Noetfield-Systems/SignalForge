import {expect,test} from "bun:test";

const read=(path:string)=>Bun.file(new URL("../"+path,import.meta.url)).text();
const surfaces:[string,string][]=[
 ["public/index.html","terminal"],
 ["public/agent.html","agent"],
 ["public/token-radar.html","radar"],
 ["public/web3-market-pulse.html","pulse"],
 ["public/developers.html","developers"],
 ["public/welcome.html","marketing"],
 ["public/terminal-next.html","workspace"],
 ["public/research-card.html","research-card"],
 ["public/company-floor.html","internal"],
 ["public/revenue-control.html","internal"]
];
test("every real customer and internal route consumes exactly one common premium design foundation",async()=>{
 for(const [file,surface] of surfaces){
  const html=await read(file);
  expect(html).toContain('data-sf-surface="'+surface+'"');
  expect(html).toContain('/assets/sf-ui.css');
  expect(html).toContain('/assets/sf-ui.js');
  expect(html.split('/assets/sf-ui.js').length-1).toBe(1);
 }
});
test("shared command palette routes only to shipped customer functions, with keyboard and focus management",async()=>{
 const nav=await read("public/sf-ui.js");
 for(const route of ["/","/agent","/radar","/web3#prediction","/web3#perps",
  "/app?view=scanner","/app?view=strategies","/app?view=backtest","/app?view=trackrecord",
  "/app?view=community","/app?view=models","/app?view=api","/app?view=pricing",
  "/agent#forgeForm","/agent#customerTasks","/agent#v6Workspace","/agent#genesisScore","/developers","/welcome"]){
  expect(nav).toContain('url:"'+route+'"');
 }
 expect(nav).toContain('aria-modal');
 expect(nav).toContain('aria-current');
 expect(nav).toContain("e.metaKey||e.ctrlKey");
 expect(nav).toContain("if(e.key===\"Escape\"");
 expect(nav).toContain("document.querySelectorAll(\"[data-sf-open]\")");
 expect(nav).toContain("sf-mobile-dock");
 expect(nav).toContain("if(!surface||surface===\"internal\")return");
});
test("premium design is scoped to product surfaces, contains functional states and mobile accessibility",async()=>{
 const css=await read("public/sf-ui.css");
 for(const token of ["data-sf-surface=\"terminal\"","data-sf-surface=\"agent\"",
  "data-sf-surface=\"radar\"","data-sf-surface=\"pulse\"",
  "data-sf-surface=\"developers\"","data-sf-surface=\"marketing\"",
  "data-sf-surface=\"workspace\"","data-sf-surface=\"research-card\"",
  "data-sf-surface=\"internal\"",
  ".sf-command-backdrop",".sf-mobile-dock",".sf-global-launcher","sf-v11-agent-workflow","sf-v11-desk-strip",
  "prefers-reduced-motion","focus-visible","min-height:48px"]){
  expect(css).toContain(token);
 }
 expect(css).not.toContain("1000000% returns");
});
test("all real first-action paths are accessible without a new marketing shell or fake market execution",async()=>{
 const [app,agent,radar,pulse,dev,card,server]=await Promise.all([
  read("public/index.html"),read("public/agent.html"),read("public/token-radar.html"),
  read("public/web3-market-pulse.html"),read("public/developers.html"),
  read("public/research-card.html"),read("src/server.ts")
 ]);
 expect(app).toContain("Live market terminal.");
 expect(app).toContain('data-sf-open');
 expect(app).toContain('href="/agent"');
 expect(agent).toContain("Ask the market.");
 expect(agent).toContain('id="forgeForm"');
 expect(agent).toContain('id="customerTasks"');
 expect(radar).toContain("Trace the token.");
 expect(radar).toContain('id="search"');
 expect(pulse).toContain("Market pulse.");
 expect(pulse).toContain('id="predList"');
 expect(dev).toContain("Markets meet");
 expect(dev).toContain('id="copyConfig"');
 expect(card).toContain('id="sfCopyResearchLink"');
 expect(card).toContain("/api/agent/public/");
 expect(server).toContain('if(path==="/terminal-next"||path==="/")');
 expect(server).toContain('if(path==="/app"||path==="/index.html")');
});
