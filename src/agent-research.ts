/** SignalForge customer research Agent beta: a bounded, deterministic tool runner.
 * No model inference, financial execution, wallet authority or simulated observations.
 * Real market providers are injected so tests can exercise provenance and outage states.
 */
export type ResearchLane = "pulse" | "prediction" | "perps" | "solana" | "kraken";
type MarketDeps = {
  pulse: () => Promise<any>;
  solana: (address: string) => Promise<any>;
  kraken: (symbol: string) => Promise<any>;
  validateSolana: (address: string) => boolean;
};
const SYMBOLS = ["BTC","ETH","SOL","XRP","ADA","DOGE","LINK","AVAX","LTC","DOT"];
const CONTROL = /[\u0000-\u001f\u007f]/g;
export function parseResearchIntent(input: unknown): {prompt:string; lane:ResearchLane; address:string|null; symbol:string|null} | {error:string} {
 if(typeof input!=="string")return {error:"PROMPT_REQUIRED"};
 const prompt=input.replace(CONTROL," ").trim();
 if(prompt.length<5||prompt.length>900)return {error:"PROMPT_LENGTH_INVALID"};
 const p=prompt.toLowerCase();
 const lane:ResearchLane=/solana|mint address|dex ?screener|token radar|token liquidity/.test(p)?"solana":
 /polymarket|prediction|event market|event odds/.test(p)?"prediction":
 /hyperliquid|perpetual|funding|open interest|\boi\b|perps/.test(p)?"perps":
 /kraken|candle|ohlc|technical|bitcoin|ethereum|\b(?:btc|eth|sol|xrp|ada|doge|link|avax|ltc|dot)\b/.test(p)?"kraken":"pulse";
 const address=prompt.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/)?.[0]||null;
 const symbol=SYMBOLS.find(s=>new RegExp("\\b"+s+"\\b","i").test(prompt))||(p.includes("bitcoin")?"BTC":p.includes("ethereum")?"ETH":null);
 return {prompt,lane,address,symbol};
}
const observed=(value:unknown)=>typeof value==="string"&&!Number.isNaN(Date.parse(value))?value:null;
function point(item:any,venue:string){
 const label=venue==="Polymarket"?String(item.title||"Event"):String(item.symbol||"Perpetual");
 return {
  label:label.slice(0,180),venue,
  source:String(item.source||venue+" public API"),
  sourceUrl:String(item.publicUrl||""),
  observedAt:observed(item.observedAt),
  values:venue==="Polymarket" ? {volume24hUsd:item.volume24h??null,liquidityUsd:item.liquidityUsd??null,endDate:item.endDate??null}
   : {markPrice:item.markPx??null,volume24hUsd:item.volume24hUsd??null,openInterestUsdApprox:item.openInterestUsdApprox??null,fundingRateRaw:item.fundingRateRaw??null},
  independentlyVerified:false
 };
}
export async function runMarketResearch(input:unknown,deps:MarketDeps,clock=()=>new Date().toISOString()){
 const intent=parseResearchIntent(input);
 if("error" in intent)return {status:"INVALID_REQUEST",error:intent.error};
 const {prompt,lane,address,symbol}=intent;
 const base={schema:"signalforge.agent-research.v1",tool:"market."+lane+".research",
  lane,prompt,runId:crypto.randomUUID(),executedAt:clock(),readOnly:true,model:"DETERMINISTIC_SOURCE_ROUTER",
  financialExecution:false,independentlyVerified:false};
 if(lane==="solana"){
  if(!address||!deps.validateSolana(address))return {...base,status:"NEEDS_TOKEN_ADDRESS",mode:"NO_SOURCE_CALL",summary:"Enter a valid Solana mint address to inspect its liquidity and public market observations.",evidence:[],limitations:["No market observation was queried."],deepLink:"/radar"};
  try{
   const r=await deps.solana(address),good=r?.status==="OBSERVED";
   return {...base,status:good?"SOURCE_OBSERVED":"SOURCE_UNAVAILABLE",mode:good?"SOURCE_REPORTED":"SOURCE_UNAVAILABLE",
    summary:good?"Solana token source report retrieved. Review the underlying source and the token's liquidity before drawing conclusions.":"Solana source report is unavailable; no token assessment was inferred.",
    evidence:good?[{venue:"Solana",label:address,source:String(r.source?.name||"DEX Screener public source"),sourceUrl:typeof r.source?.url==="string"?r.source.url:"https://dexscreener.com/solana/"+address,observedAt:observed(r.observedAt||r.source?.observedAt),values:{status:r.status,primary:r.primary??null},independentlyVerified:false}]:[],
    limitations:["Source-reported observations are not proof of token safety or liquidity availability."],deepLink:"/tokens/solana/"+address};
  }catch{return {...base,status:"SOURCE_UNAVAILABLE",mode:"SOURCE_UNAVAILABLE",summary:"Solana provider request failed.",evidence:[],limitations:["No fallback data were generated."],deepLink:"/radar"}}
 }
 if(lane==="kraken"){
  const chosen=(symbol||"BTC")+"USD";
  try{
   const d=await deps.kraken(chosen),good=d?.mode==="LIVE_PUBLIC_DATA"&&d?.summary&&d?.candles?.length>0;
   return {...base,status:good?"SOURCE_OBSERVED":"SOURCE_UNAVAILABLE",mode:good?"SOURCE_REPORTED":String(d?.mode||"SOURCE_UNAVAILABLE"),
    summary:good?chosen+": latest completed public OHLC observation. Prices and indicators describe past markets, not future returns.":"Kraken live market observations unavailable; deterministic fallback is excluded from Agent research.",
    evidence:good?[{venue:"Kraken",label:chosen,source:String(d.source||"Kraken public OHLC"),sourceUrl:"https://www.kraken.com/prices",observedAt:observed(d.fetchedAt),values:{price:d.summary.price,change24hPct:d.summary.change24h,rsi:d.summary.rsi,regime:d.summary.regime,lastCandleTime:d.summary.lastTime},independentlyVerified:false}]:[],
    limitations:["Candle timestamps, retrieval timestamps and source verification are distinct.","No trade has been prepared or placed."],deepLink:"/app"};
  }catch{return {...base,status:"SOURCE_UNAVAILABLE",mode:"SOURCE_UNAVAILABLE",summary:"Kraken market source request failed.",evidence:[],limitations:["No fallback data were presented as live."],deepLink:"/app"}}
 }
 try{
  const p=await deps.pulse(),keys=lane==="pulse"?["prediction","perps"]:[lane];
  const evidence:any[]=[],unavailable:string[]=[];
  for(const key of keys){
   const group=p?.[key];
   if(group?.state!=="SOURCE_OBSERVED"){unavailable.push(key);continue}
   let items=Array.isArray(group.items)?group.items:[];
   if(key==="perps"&&symbol){const filtered=items.filter((x:any)=>x.symbol?.toUpperCase()===symbol);if(filtered.length)items=filtered}
   const venue=key==="prediction"?"Polymarket":"Hyperliquid";
   evidence.push(...items.slice(0,lane==="pulse"?3:5).map((x:any)=>point(x,venue)));
  }
  const good=evidence.length>0;
  return {...base,status:good?"SOURCE_OBSERVED":"SOURCE_UNAVAILABLE",mode:good?"SOURCE_REPORTED":"SOURCE_UNAVAILABLE",
   summary:good?"Retrieved "+evidence.length+" source-reported "+(lane==="pulse"?"cross-venue":lane)+" observations. These are current ranked snapshots, not predictions or an independent validation of an event.":"No usable public source observations are available.",
   evidence,observedAt:observed(p?.observedAt),unavailableSources:unavailable,
   limitations:["Market data are provider-reported and may be delayed.","Top-ranked events are not necessarily a semantic answer to every research question.","No market transaction was executed."],
   deepLink:lane==="perps"?"/web3#perps":"/web3#prediction"};
 }catch{return {...base,status:"SOURCE_UNAVAILABLE",mode:"SOURCE_UNAVAILABLE",summary:"Public market pulse request failed.",evidence:[],limitations:["No synthetic source observations were generated."],deepLink:"/web3"}}
}
