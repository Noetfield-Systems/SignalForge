import {test,expect} from "bun:test";
import {Client,StreamableHTTPClientTransport} from "@modelcontextprotocol/client";
import {makeSignalForgeMcpHandler} from "../src/signalforge-mcp.ts";
import {modelGatewayStatus,selectMarketTools} from "../src/model-gateway.ts";

function source(prompt:string){
 const lane=prompt.includes("Hyperliquid")?"perps":prompt.includes("Polymarket")?"prediction":prompt.includes("Solana")?"solana":"kraken";
 const venue={perps:"Hyperliquid",prediction:"Polymarket",solana:"Solana",kraken:"Kraken"}[lane];
 const host={perps:"https://app.hyperliquid.xyz/trade/BTC",prediction:"https://polymarket.com",solana:"https://dexscreener.com/solana/So11111111111111111111111111111111111111112",kraken:"https://www.kraken.com/prices/bitcoin"}[lane];
 return {status:"SOURCE_OBSERVED",mode:"SOURCE_REPORTED",tool:"market."+lane+".research",executedAt:new Date().toISOString(),
 summary:"Source-reported fixture, not production evidence.",limitations:["Fixture data"],evidence:[{venue,label:"BTC",source:venue+" public",sourceUrl:host,observedAt:new Date().toISOString(),values:{markPrice:"5"},independentlyVerified:false}]};
}
function createFakeHandler(principal:any=null){
 const calls:string[]=[];
 const deps:any={principal,dbReady:true,db:{unsafe:async()=>[]},
 research:async(prompt:string)=>{calls.push(prompt);return source(prompt)},
 quota:async()=>({eligible:true,limit:120,consumed:0,entitlements:{}}),
 newTask:async()=>({taskId:"bfc95c7c-049a-4bef-bac0-4ca02b8c6379",status:"QUEUED"}),
 getTask:async()=>null,cancelTask:async()=>false,modelConfigured:()=>false};
 return {handler:makeSignalForgeMcpHandler(deps),calls};
}
async function connect(handler:any){
 const client=new Client({name:"signalforge-test-client",version:"1.0.0"},{versionNegotiation:{mode:"auto"}});
 const transport=new StreamableHTTPClientTransport(new URL("http://example.test/mcp"),{fetch:(url:any,init:any)=>handler.fetch(new Request(url,init))});
 await client.connect(transport);
 return client;
}
function contentValue(result:any){
 if(result?.structuredContent)return result.structuredContent;
 return JSON.parse(result.content?.find((x:any)=>x.type==="text")?.text||"{}");
}
test("official SDK v2 negotiates modern MCP and discovers source tools",async()=>{
 const {handler,calls}=createFakeHandler();
 const client=await connect(handler);
 try{
  const tools=await client.listTools();
  const names=tools.tools.map(x=>x.name);
  for(const name of ["market_snapshot","analyze_perps","research_prediction_market","inspect_solana_token","create_research_task","get_task_result","verify_research_receipt","cancel_research_task"])
   expect(names).toContain(name);
  const p=contentValue(await client.callTool({name:"analyze_perps",arguments:{symbol:"ETH"}}));
  expect(p.status).toBe("SOURCE_OBSERVED");expect(p.observations[0].sourceUrl).toContain("hyperliquid");
  expect(calls.at(-1)).toContain("ETH");
  const privateCall=await client.callTool({name:"create_research_task",arguments:{prompt:"Inspect Hyperliquid BTC funding",engine:"source"}});
  expect(contentValue(privateCall).error).toBe("SIGNALFORGE_BEARER_API_KEY_REQUIRED");
 }finally{await client.close()}
},18000);
test("MCP private tools inherit existing SignalForge API key principal and queue",async()=>{
 const {handler}=createFakeHandler({id:"123",user_id:"00000000-0000-4000-8000-000000000003",plan:"pro"});
 const client=await connect(handler);
 try{
  const item=contentValue(await client.callTool({name:"create_research_task",arguments:{prompt:"Inspect Hyperliquid BTC funding",engine:"source"}}));
  expect(item.status).toBe("QUEUED");expect(item.customerOwned).toBe(true);expect(item.engine).toBe("SOURCE_ONLY");
  const notOwned=contentValue(await client.callTool({name:"get_task_result",arguments:{taskId:item.taskId}}));
  expect(notOwned.error).toBe("TASK_NOT_FOUND");
 }finally{await client.close()}
},18000);
test("read-only defaults and DeepSeek preference need explicit credential",()=>{
 expect(modelGatewayStatus({}).configured).toBe(false);
 expect(modelGatewayStatus({DEEPSEEK_API_KEY:"fixture"}).providers[0]).toEqual({provider:"deepseek",model:"deepseek-flash"});
 expect(modelGatewayStatus({DEEPSEEK_API_KEY:"fixture",OPENAI_API_KEY:"test"}).providers.map(p=>p.provider)).toEqual(["deepseek","openai"]);
});
test("DeepSeek structured planning uses actual adapter dispatch contracts, no model claim from fixtures",async()=>{
 const cfgs:any[]=[];
 const mocked=async(cfg:any)=>{
  cfgs.push(cfg.provider);
  return {text:"",toolInput:{lanes:["perps","prediction","trade"]},usage:{inputTokens:40,outputTokens:10,totalTokens:50,estimatedUsd:null},responseId:"test-only",streamed:false}
 };
 const result=await selectMarketTools("Compare funding and event markets","perps",mocked as any,{DEEPSEEK_API_KEY:"fixture"});
 expect(result.lanes).toEqual(["perps","prediction"]);
 expect(cfgs).toEqual(["deepseek"]);
});
