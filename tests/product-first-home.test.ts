import {expect,test} from "bun:test";

const read=(path:string)=>Bun.file(new URL("../"+path,import.meta.url)).text();

test("canonical front door is product, not marketing HTML or second runtime",async()=>{
 const [server,workstation,marketing]=await Promise.all([
  read("src/server.ts"),read("public/terminal-next.html"),read("public/welcome.html")
 ]);
 expect(server).toContain('if(path==="/terminal-next"||path==="/")return new Response(TERMINAL_NEXT_HTML');
 expect(server).toContain('(path==="/welcome"||path==="/start")');
 expect(server).toContain('if(path==="/app"||path==="/index.html")');
 expect(workstation).toContain('/assets/lightweight-charts.js');
 expect(workstation).toContain('id="agentPrompt"');
 expect(workstation).toContain('fetch("/api/agent/research"');
 expect(workstation).toContain('id="inlineAgentResult"');
 expect(marketing).toContain("The market is alive.");
 expect(marketing).toContain("Forge what moves it.");
});

test("root exposes actual Bankr-level first action without claiming unavailable model/trading",async()=>{
 const workstation=await read("public/terminal-next.html");
 expect(workstation).toContain('if(location.pathname==="/")viewPane("agent")');
 expect(workstation).toContain("Ask SignalForge.");
 expect(workstation).toContain("SOURCE-ONLY RESEARCH");
 expect(workstation).toContain("No live observations were substituted with demo data.");
 expect(workstation).toContain("NO LIVE ORDER EXECUTION");
 expect(workstation).toContain('href="/app?view=community"');
 expect(workstation).toContain('href="/developers"');
 expect(workstation).toContain('href="/welcome"');
 expect(workstation).not.toContain("LIVE_TRADING_ENABLED");
});

test("mobile homepage prioritizes prompt before long chart; canonical nav includes root",async()=>{
 const [terminal,nav,visual]=await Promise.all([
  read("public/terminal-next.html"),read("public/sf-ui.js"),
  read("scripts/premium_visual_acceptance.py")
 ]);
 expect(terminal).toContain(".workgrid>.rightpane{order:-1");
 expect(terminal).toContain(".workgrid>.center{order:1");
 expect(nav).toContain('url:"/",matches:["/","/terminal-next","/app","/index.html"]');
 expect(visual).toContain("PRODUCT_FIRST_FUNCTIONAL_HOME_PASS");
 expect(visual).toContain('page.wait_for_selector("#sfNativeCandleChart canvas"');
});
