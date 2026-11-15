import {test,expect} from "bun:test";
import {Client,StreamableHTTPClientTransport} from "@modelcontextprotocol/client";
import {makeSignalForgeMcpHandler} from "../src/signalforge-mcp.ts";

const BASE="https://signalforge-web-production.up.railway.app";
const tools=["market_snapshot","analyze_perps","research_prediction_market","inspect_solana_token"];
function fixture(){
 return {status:"SOURCE_OBSERVED",mode:"SOURCE_REPORTED",tool:"market.perps.research",
 executedAt:new Date().toISOString(),summary:"Fixture only. Not evidence of a live market.",
 evidence:[{sourceUrl:"https://app.hyperliquid.xyz/trade/BTC",observedAt:new Date().toISOString(),
 venue:"Hyperliquid",label:"BTC",values:{fundingRateRaw:0.001},independentlyVerified:false}]};
}
test("Official MCP registry manifest describes the existing public remote, not a fabricated npm package",async()=>{
 const j=await Bun.file(new URL("../server.json",import.meta.url)).json();
 expect(j.name).toBe("io.github.noetfield-systems/signalforge");
 expect(j.remotes).toEqual([{type:"streamable-http",url:BASE+"/mcp"}]);
 expect(j.packages).toBeUndefined();
 expect(j.version).toBe("1.0.0");
 expect(j.description.length).toBeLessThanOrEqual(100);
});
test("Premium developer page has a real install URL, account key flow and honest limits",async()=>{
 const html=await Bun.file(new URL("../public/developers.html",import.meta.url)).text();
 expect(html).toContain(BASE+"/mcp");
 expect(html).toContain('id="createKey"');
 expect(html).toContain('"/api/api-keys"');
 expect(html).toContain('id="copyConfig"');
 expect(html).toContain("No synthetic live data");
 expect(html).toContain('href="/agent"');
 expect(html).not.toContain("token sale is live");
});
test("MCP metric callback counts real tool calls but not connection or discovery",async()=>{
 const events:any[]=[];
 const handler=makeSignalForgeMcpHandler({
  principal:null,db:null,dbReady:false,research:async()=>fixture(),
  quota:async()=>({eligible:false,limit:0,consumed:0,entitlements:{}}),
  newTask:async()=>({error:"UNAVAILABLE"}),getTask:async()=>null,cancelTask:async()=>false,modelConfigured:()=>false,
  recordToolEvent:async e=>{events.push(e)}
 } as any);
 const client=new Client({name:"mcp-distribution-test-client",version:"1.0.0"},{versionNegotiation:{mode:"auto"}});
 await client.connect(new StreamableHTTPClientTransport(new URL("http://example.test/mcp"),{
  fetch:(url:any,init:any)=>handler.fetch(new Request(url,init))
 }));
 try{
  const listed=await client.listTools();
  expect(tools.every(t=>listed.tools.some(x=>x.name===t))).toBe(true);
  expect(events).toHaveLength(0);
  const publicResult:any=await client.callTool({name:"analyze_perps",arguments:{symbol:"BTC"}});
  expect(publicResult.isError).not.toBe(true);
  const blocked:any=await client.callTool({name:"create_research_task",arguments:{prompt:"Inspect Hyperliquid funding"}});
  expect(blocked.isError).toBe(true);
  expect(events).toHaveLength(2);
  expect(events[0]).toMatchObject({tool:"analyze_perps",status:"SUCCEEDED"});
  expect(events[1]).toMatchObject({tool:"create_research_task",status:"FAILED"});
  expect(events.every(e=>Number.isInteger(e.durationMs)&&e.durationMs>=0)).toBe(true);
 }finally{await client.close()}
},20000);
test("MCP usage metric failures never alter live research outcome",async()=>{
 const handler=makeSignalForgeMcpHandler({
  principal:null,db:null,dbReady:false,research:async()=>fixture(),
  quota:async()=>({eligible:false}),newTask:async()=>null,getTask:async()=>null,cancelTask:async()=>false,modelConfigured:()=>false,
  recordToolEvent:async()=>{throw Error("db offline")}
 } as any);
 const client=new Client({name:"mcp-telemetry-failure-test",version:"1.0.0"},{versionNegotiation:{mode:"auto"}});
 await client.connect(new StreamableHTTPClientTransport(new URL("http://example.test/mcp"),{
  fetch:(url:any,init:any)=>handler.fetch(new Request(url,init))
 }));
 try{
  const r:any=await client.callTool({name:"analyze_perps",arguments:{symbol:"BTC"}});
  expect(r.isError).not.toBe(true);
  const body=r.structuredContent;
  expect(body.status).toBe("SOURCE_OBSERVED");
 }finally{await client.close()}
},20000);
