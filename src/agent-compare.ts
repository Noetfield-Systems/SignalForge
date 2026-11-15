/** Compare independently sourced snapshots without treating absent coverage as market events. */
export function compareMarketObservations(previous:any,current:any){
 const base={schema:"signalforge.research-comparison.v1",basedOnRunId:previous?.runId||null,newRunId:current?.runId||null,financialExecution:false,independentlyVerified:false};
 if(previous?.lane!==current?.lane)return {...base,status:"DIFFERENT_RESEARCH_LANES",changes:[],matchingMarkets:0};
 if(previous?.status!=="SOURCE_OBSERVED")return {...base,status:"BASELINE_UNAVAILABLE",changes:[],matchingMarkets:0};
 if(current?.status!=="SOURCE_OBSERVED")return {...base,status:"CURRENT_SOURCE_UNAVAILABLE",changes:[],matchingMarkets:0};
 const key=(o:any)=>String(o?.venue||"")+"::"+String(o?.sourceUrl||"")+"::"+String(o?.label||"");
 const before=new Map((Array.isArray(previous.evidence)?previous.evidence:[]).map((v:any)=>[key(v),v]));
 const matching:any[]=[];
 for(const item of (Array.isArray(current.evidence)?current.evidence:[])){
  const older:any=before.get(key(item));if(!older)continue;
  const fields:any[]=[];
  for(const [field,after] of Object.entries(item.values||{})){
   const prior=older.values?.[field];
   if(typeof prior!=="number"||typeof after!=="number"||!Number.isFinite(prior)||!Number.isFinite(after)||Math.abs(prior)>1e18||Math.abs(after)>1e18)continue;
   const delta=Number((after-prior).toPrecision(10));
   const percentChange=prior!==0?Number(((after-prior)/Math.abs(prior)*100).toFixed(4)):null;
   fields.push({field,before:prior,after,delta,percentChange});
  }
  matching.push({venue:item.venue,label:item.label,sourceUrl:item.sourceUrl,previousObservedAt:older.observedAt||null,currentObservedAt:item.observedAt||null,metrics:fields});
 }
 const compared=matching.reduce((n,v)=>n+v.metrics.length,0);
 return {...base,status:matching.length?(compared?"COMPARISON_AVAILABLE":"NO_COMPARABLE_NUMERIC_FIELDS"):"NO_MATCHING_MARKETS",
  matchingMarkets:matching.length,metricsCompared:compared,changes:matching,
  note:"Comparison of provider-reported snapshots, not evidence of causation, a verified forecast, or a trading signal. Missing or unranked markets are not inferred to be delisted or resolved."};
}
