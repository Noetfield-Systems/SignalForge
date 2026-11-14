/**
 * SignalForge source-ranked scanner: TradingView-style actionable discovery
 * with DEX Screener-style explicit provenance, not invented Nansen coverage.
 * Only current source-reported Kraken OHLC participates in a LIVE rank.
 * DEMO / STALE / unrecognized data remains visible strictly as unranked
 * diagnostic research so a simulated candle never becomes a trading signal.
 */
export const VALID_SCAN_INTERVALS=Object.freeze([15,60,240]);
const ALLOWED_SYMBOLS=new Set(["BTCUSD","ETHUSD","SOLUSD","XRPUSD","ADAUSD","DOGEUSD","LINKUSD","AVAXUSD","LTCUSD","DOTUSD"]);
const ALLOWED_STRATEGIES=new Set(["trend-pullback","breakout","mean-reversion","vwap-reclaim","squeeze-expansion"]);

export function scannerSourceStatus(mode:string,integrity:any){
 if(mode!=="LIVE_PUBLIC_DATA")return "DEMO_UNRANKED";
 if(integrity?.state!=="SOURCE_OBSERVED_CURRENT"||integrity?.researchEligible!==true)return "STALE_OR_UNVERIFIED_UNRANKED";
 return "KRAKEN_SOURCE_CURRENT";
}
export function scannerDeepLinks(symbol:string,interval:number,strategy:string){
 if(!ALLOWED_SYMBOLS.has(symbol)||!VALID_SCAN_INTERVALS.includes(interval))return null;
 const q=new URLSearchParams({symbol,interval:String(interval)});
 const chart="/app?view=dashboard&"+q.toString();
 const backtest=ALLOWED_STRATEGIES.has(strategy)
  ?"/app?view=backtest&"+q.toString()+"&strategy="+encodeURIComponent(strategy):null;
 return {chart,backtest};
}
export function compileSourceRankedScanner(
 markets:Array<{symbol:string;mode:string;integrity:any;signals:any[];source:string;fetchedAt:string}>,
 interval:number,
 scannedAt:string
){
 if(!VALID_SCAN_INTERVALS.includes(interval))throw Error("SCANNER_INTERVAL_NOT_SUPPORTED");
 const items:any[]=[],marketStates:any[]=[];
 for(const p of markets){
  if(!ALLOWED_SYMBOLS.has(p.symbol)||!Array.isArray(p.signals))throw Error("SCANNER_SYMBOL_OR_SIGNALS_INVALID");
  const sourceStatus=scannerSourceStatus(p.mode,p.integrity);
  const eligible=sourceStatus==="KRAKEN_SOURCE_CURRENT";
  marketStates.push({symbol:p.symbol,sourceStatus,eligible});
  for(const s of p.signals){
   const links=scannerDeepLinks(p.symbol,interval,s.id);
   const score=Number(s.score);
   items.push({...s,symbol:p.symbol,mode:p.mode,interval,
    score:Number.isFinite(score)?score:0,
    researchEligible:eligible,rankEligible:eligible,sourceStatus,
    evidence:{
      source:p.source,
      sourceStatus,sourceObservedAt:p.integrity?.sourceTimestamp?
        new Date(p.integrity.sourceTimestamp*1000).toISOString():null,
      ageSeconds:Number.isFinite(p.integrity?.ageSeconds)?p.integrity.ageSeconds:null,
      fetchedAt:p.fetchedAt,
      independentlyVerified:false,
      tradingAuthorized:false,
      performanceProof:false,
    },
    researchLinks:links,liveRank:null});
  }
 }
 items.sort((a,b)=>(Number(b.rankEligible)-Number(a.rankEligible))||
   (Number(b.state==="ACTIVE")-Number(a.state==="ACTIVE"))||
   b.score-a.score||a.symbol.localeCompare(b.symbol)||a.id.localeCompare(b.id));
 let liveRank=0;
 for(const i of items)if(i.rankEligible)i.liveRank=++liveRank;
 const currentMarkets=marketStates.filter(m=>m.eligible).length;
 const liveSignals=items.filter(i=>i.rankEligible).length;
 return {schema:"signalforge.source-ranked-scanner.v1",interval,scannedAt,
   mode:currentMarkets===markets.length?"LIVE_PUBLIC_DATA":"MIXED_OR_DEMO",
   count:items.length,liveRankedCount:liveSignals,unrankedCount:items.length-liveSignals,
   coverage:{markets:markets.length,currentMarkets,
     excludedMarkets:markets.length-currentMarkets,source:"Kraken public OHLC",
     independentVerification:false},
   sourcePolicy:"ONLY_CURRENT_PUBLIC_KRAKEN_RANKED; DEMO_AND_STALE_UNRANKED",
   disclaimer:"Source-reported observations, not independently verified or trading instructions. Confluence score is not a win probability.",
   items};
}
