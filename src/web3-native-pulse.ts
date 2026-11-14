/**
 * SignalForge / first REAL Web3 market community wedge.
 * Prediction-market events from Polymarket public Gamma;
 * perp open interest/funding/volume from Hyperliquid public Info.
 * Strictly read-only, source-observed and not independently verified.
 * No invented Kalshi/Lighter/Aster/Variational feeds or trading.
 */
export const MARKET_PULSE_SOURCES=Object.freeze({
 prediction:"https://gamma-api.polymarket.com/events?active=true&closed=false&limit=20&order=volume24hr&ascending=false",
 perps:"https://api.hyperliquid.xyz/info"
});
function finite(value:unknown){
 if(value==null||value==="")return null;
 const n=Number(value);
 return Number.isFinite(n)&&n>=0&&n<1e18?n:null;
}
function signedFinite(value:unknown){
 if(value==null||value==="")return null;
 const n=Number(value);
 return Number.isFinite(n)&&Math.abs(n)<1e9?n:null;
}
function safeSlug(value:unknown){
 return typeof value==="string"&&/^[a-z0-9][a-z0-9-]{0,160}$/.test(value)?value:null;
}
function safeTitle(value:unknown){
 return typeof value==="string"?value.replace(/[\u0000-\u001f]/g," ").slice(0,180):"";
}
export function normalizePolymarketEvents(data:any,observedAt:string){
 if(!Array.isArray(data))throw Error("POLYMARKET_SOURCE_SHAPE_INVALID");
 return data.filter(x=>x&&typeof x==="object"&&x.closed!==true).map(x=>{
  const slug=safeSlug(x.slug),title=safeTitle(x.title||x.question);
  if(!slug||title.length<6)return null;
  const volume24h=finite(x.volume24hr??x.volume24h);
  const liquidityUsd=finite(x.liquidity);
  return {venue:"Polymarket",market:"PREDICTION_MARKETS",title,slug,
   publicUrl:"https://polymarket.com/event/"+slug,
   volume24h,liquidityUsd,
   endDate:typeof x.endDate==="string"&&/^\d{4}-\d{2}-\d{2}/.test(x.endDate)?x.endDate.slice(0,10):null,
   observedAt,source:"Polymarket Gamma public API",independentlyVerified:false,
   note:"Event-market activity observation, not probability of profit or outcome prediction"};
 }).filter(Boolean).sort((a:any,b:any)=>(b.volume24h??0)-(a.volume24h??0)).slice(0,12);
}
export function normalizeHyperliquidPerps(data:any,observedAt:string){
 if(!Array.isArray(data)||data.length!==2||!Array.isArray(data[0]?.universe)||!Array.isArray(data[1]))throw Error("HYPERLIQUID_SOURCE_SHAPE_INVALID");
 const universe=data[0].universe,contexts=data[1],rows:any[]=[];
 for(let i=0;i<Math.min(universe.length,contexts.length,500);i++){
  const asset=universe[i],ctx=contexts[i];
  const symbol=asset?.name;
  if(typeof symbol!=="string"||!/^[A-Za-z0-9][A-Za-z0-9:_-]{0,29}$/.test(symbol)||asset?.isDelisted===true||!ctx)continue;
  const markPx=finite(ctx.markPx),oiBase=finite(ctx.openInterest),volume24hUsd=finite(ctx.dayNtlVlm);
  const oiUsdApprox=markPx!==null&&oiBase!==null&&markPx*oiBase<1e18?Math.round(markPx*oiBase*100)/100:null;
  rows.push({venue:"Hyperliquid",market:"PERPETUAL_DEX",symbol,
   publicUrl:"https://app.hyperliquid.xyz/trade/"+encodeURIComponent(symbol),
   markPx,volume24hUsd,openInterestBase:oiBase,openInterestUsdApprox:oiUsdApprox,
   fundingRateRaw:signedFinite(ctx.funding),observedAt,source:"Hyperliquid public Info API",
   independentlyVerified:false,
   note:"OI USD is a mark-price approximation. Funding is raw provider field; no annualized return implied"});
 }
 return rows.sort((a,b)=>(b.volume24hUsd??0)-(a.volume24hUsd??0)).slice(0,12);
}
async function requestJson(fetcher:typeof fetch,url:string,options:any={}){
 const r=await fetcher(url,{...options,signal:AbortSignal.timeout(9500)});
 if(!r.ok)throw Error("SOURCE_HTTP_"+r.status);
 return r.json();
}
export async function getWeb3NativePulse(fetcher:typeof fetch=fetch,now=()=>new Date()){
 const observedAt=now().toISOString();
 const out=await Promise.allSettled([
  requestJson(fetcher,MARKET_PULSE_SOURCES.prediction,{method:"GET",headers:{accept:"application/json"}}),
  requestJson(fetcher,MARKET_PULSE_SOURCES.perps,{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({type:"metaAndAssetCtxs"})})
 ]);
 const pred=out[0].status==="fulfilled"?(()=>{try{return normalizePolymarketEvents(out[0].value,observedAt)}catch{return null}})():null;
 const perps=out[1].status==="fulfilled"?(()=>{try{return normalizeHyperliquidPerps(out[1].value,observedAt)}catch{return null}})():null;
 return {
  schema:"signalforge.web3-native-pulse.v1",project_id:"signalforge-market-intelligence",
  observedAt,independentlyVerified:false,executionAuthorized:false,
  scope:"OBSERVE_ONLY_REAL_WEB3_MARKETS",
  prediction:{venue:"Polymarket",state:pred===null?"SOURCE_UNAVAILABLE":"SOURCE_OBSERVED",sourceUrl:MARKET_PULSE_SOURCES.prediction,items:pred??[]},
  perps:{venue:"Hyperliquid",state:perps===null?"SOURCE_UNAVAILABLE":"SOURCE_OBSERVED",sourceUrl:"https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals",items:perps??[]},
  trenches:{state:"EXISTING_SOLANA_TOKEN_RADAR",path:"/radar",note:"Token Radar offers address-based source evidence. No native meme-trending provider claimed."},
  otherVenues:{state:"RESEARCH_NOT_LIVE",names:["Kalshi","Lighter","Aster","Variational"]},
  limitations:["Venue data is source-reported, not independently verified","No probability predictions, leverage trading or financial execution","Unavailable source is shown explicitly; no simulated venue observations"]
 };
}
