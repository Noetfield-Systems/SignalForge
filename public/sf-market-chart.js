/* SignalForge verified-source chart adapter / TradingView Lightweight Charts 5.x
   No simulated ticks, chart dates or market prices. Shared component API.
   Candles must originate from the existing SignalForge /api/market backend. */
(()=>{"use strict";
function asTime(value){
 if(typeof value==="string"&&!/^\d+$/.test(value)){const ms=Date.parse(value);return Number.isFinite(ms)?Math.floor(ms/1000):NaN}
 const v=Number(value);return Number.isFinite(v)?Math.floor(v>1e11?v/1000:v):NaN
}
function normalize(raw){
 const bars=new Map();const now=Math.floor(Date.now()/1000)+86400;
 for(const x of Array.isArray(raw)?raw:[]){
  const time=asTime(x.time),open=Number(x.open),high=Number(x.high),low=Number(x.low),close=Number(x.close),volume=Number(x.volume);
  if(!Number.isSafeInteger(time)||time<946684800||time>now)continue;
  if(![open,high,low,close].every(Number.isFinite)||Math.min(open,high,low,close)<=0)continue;
  if(high<Math.max(open,close)||low>Math.min(open,close)||high<low)continue;
  bars.set(time,{time,open,high,low,close,volume:Number.isFinite(volume)&&volume>=0?volume:0});
 }
 return [...bars.values()].sort((a,b)=>a.time-b.time).slice(-720)
}
function mount(node,opts={}){
 if(!node||typeof window.LightweightCharts?.createChart!=="function")return null;
 const L=window.LightweightCharts;
 const widget=L.createChart(node,{
  autoSize:true,attributionLogo:true,
  layout:{background:{type:"solid",color:"#0a1117"},textColor:"#a5b3c2",fontFamily:"IBM Plex Mono,monospace",fontSize:11},
  grid:{vertLines:{color:"#1b2932"},horzLines:{color:"#213039"}},
  crosshair:{mode:L.CrosshairMode?.Normal??0,vertLine:{color:"#80919c",width:1,style:3,labelBackgroundColor:"#263a45"},horzLine:{color:"#80919c",width:1,style:3,labelBackgroundColor:"#263a45"}},
  rightPriceScale:{borderColor:"#2b3a45",scaleMargins:{top:.07,bottom:.24}},
  timeScale:{borderColor:"#2b3a45",timeVisible:true,secondsVisible:false,barSpacing:8,minBarSpacing:3,rightOffset:6},
  handleScale:true,handleScroll:true,kineticScroll:{touch:true,mouse:true}
 });
 const candle=widget.addSeries(L.CandlestickSeries,{upColor:"#6bd6aa",downColor:"#e47b89",wickUpColor:"#6bd6aa",wickDownColor:"#e47b89",borderVisible:false,priceLineVisible:true});
 const volume=widget.addSeries(L.HistogramSeries,{priceScaleId:"",priceFormat:{type:"volume"},lastValueVisible:false,priceLineVisible:false});
 volume.priceScale().applyOptions({scaleMargins:{top:.8,bottom:0}});
 const ma20=widget.addSeries(L.LineSeries,{color:"#b0a2e9",lineWidth:1,lastValueVisible:false,priceLineVisible:false,crosshairMarkerVisible:false});
 const ma50=widget.addSeries(L.LineSeries,{color:"#e9c78f",lineWidth:1,lastValueVisible:false,priceLineVisible:false,crosshairMarkerVisible:false});
 const calculateMA=(data,n)=>data.length<n?[]:data.slice(n-1).map((b,i)=>({time:b.time,value:data.slice(i,i+n).reduce((sum,v)=>sum+v.close,0)/n}));
 if(opts.onCrosshair)widget.subscribeCrosshairMove(param=>{const o=param?.seriesData?.get(candle);if(o)opts.onCrosshair(o)});
 function setData(source,sourceMode){
  if(sourceMode!=="LIVE_PUBLIC_DATA")return {rendered:false,reason:"SOURCE_NOT_LIVE",count:0};
  const data=normalize(source);
  if(data.length<2)return {rendered:false,reason:"INSUFFICIENT_VALID_BARS",count:data.length};
  candle.setData(data.map(({time,open,high,low,close})=>({time,open,high,low,close})));
  volume.setData(data.map(x=>({time:x.time,value:x.volume,color:x.close>=x.open?"#64c69c6b":"#d974836b"})));
  ma20.setData(calculateMA(data,20));ma50.setData(calculateMA(data,50));
  widget.timeScale().fitContent();
  return {rendered:true,count:data.length,firstTime:data[0].time,lastTime:data[data.length-1].time}
 }
 return {setData,clear(){candle.setData([]);volume.setData([]);ma20.setData([]);ma50.setData([])},destroy(){widget.remove()},instance:widget}
}
window.SFMarketChart=Object.freeze({mount,normalize,version:"sf.market-chart.v1"});
})();