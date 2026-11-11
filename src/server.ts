import postgres from "postgres";
import { researchSolanaToken, TokenRadarError, validSolanaAddress } from "./token-radar.mjs";
import { persistTokenObservation, getTokenHistory, getSavedTokenList, saveToken, removeSavedToken, getTokenNotifications } from "./token-radar-storage.mjs";
import {assessCompanyOutcome} from "../company-os/shared-evidence-gate.mjs";
import { compileOperatingBoard } from "../company-os/operating-engine.ts";
import { evaluateCompanyPolicy } from "./company-os-policy";
import { stripeCheckoutUrlKey } from "./billing-keys";
import { getRevenueSnapshot } from "./revenue-metrics.mjs";
import { validateResearchNote, validResearchNoteId } from "./research-notes.mjs";
import { loadResearchJournalWithEvidence } from "./research-evidence.mjs";
const SIGNALFORGE_MARKETING_HTML = await Bun.file(new URL("../public/welcome.html", import.meta.url)).text();
const HTML = await Bun.file(new URL("../public/index.html", import.meta.url)).text();
const TOKEN_RADAR_HTML = await Bun.file(new URL("../public/token-radar.html", import.meta.url)).text();
const REVENUE_CONTROL_HTML = await Bun.file(new URL("../public/revenue-control.html", import.meta.url)).text();
const PORT = Number(Bun.env.PORT || 8080);
const BASE_URL = Bun.env.BASE_URL || "https://signalforge-web-production.up.railway.app";
const DB_URL = Bun.env.DATABASE_URL || "";
const db = DB_URL ? postgres(DB_URL, { max: 8, idle_timeout: 30, connect_timeout: 12, ssl: (Bun.env.NODE_ENV === "test" && Bun.env.DATABASE_SSL === "disable") ? false : "require" }) : null;
let dbReady = false;
const cache = new Map<string, { at: number; data: any }>();
const rate = new Map<string, { n: number; at: number }>();
const MARKETS: Record<string, any> = {
 BTCUSD:{label:"BTC / USD",pair:"XBTUSD"}, ETHUSD:{label:"ETH / USD",pair:"ETHUSD"}, SOLUSD:{label:"SOL / USD",pair:"SOLUSD"},
 XRPUSD:{label:"XRP / USD",pair:"XRPUSD"}, ADAUSD:{label:"ADA / USD",pair:"ADAUSD"}, DOGEUSD:{label:"DOGE / USD",pair:"DOGEUSD"},
 LINKUSD:{label:"LINK / USD",pair:"LINKUSD"}, AVAXUSD:{label:"AVAX / USD",pair:"AVAXUSD"}, LTCUSD:{label:"LTC / USD",pair:"LTCUSD"},
 DOTUSD:{label:"DOT / USD",pair:"DOTUSD"}
};
const STRATEGIES: any[] = [
 {id:"trend-pullback",name:"Trend Pullback",category:"Trend following",horizon:"4–18 bars",thesis:"Join an established directional trend after a controlled retracement into dynamic support or resistance.",trigger:74},
 {id:"breakout",name:"Volume Breakout",category:"Momentum",horizon:"2–12 bars",thesis:"Require a confirmed range break, expanding participation and aligned momentum.",trigger:76},
 {id:"mean-reversion",name:"Mean Reversion",category:"Counter-trend",horizon:"3–16 bars",thesis:"Detect statistical extension from the rolling mean and wait for reversal confirmation.",trigger:74},
 {id:"vwap-reclaim",name:"VWAP Reclaim",category:"Institutional levels",horizon:"2–10 bars",thesis:"Detect a reclaim or loss of rolling volume-weighted value with momentum confirmation.",trigger:74},
 {id:"squeeze-expansion",name:"Squeeze Expansion",category:"Volatility regime",horizon:"3–14 bars",thesis:"Identify volatility compression followed by range and volume expansion in either direction.",trigger:74}
];
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const avg=(a:number[])=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const std=(a:number[])=>{const m=avg(a);return Math.sqrt(avg(a.map(v=>(v-m)*(v-m))))};
const ema=(a:number[],p:number)=>{const o:number[]=[];const k=2/(p+1);let v=a[0]||0;for(let i=0;i<a.length;i++){v=i?a[i]*k+v*(1-k):a[i];o.push(v)}return o};
function rsi(a:number[],p=14){const o=Array(a.length).fill(50);let g=0,l=0;for(let i=1;i<=Math.min(p,a.length-1);i++){const d=a[i]-a[i-1];g+=Math.max(0,d);l+=Math.max(0,-d)}g/=p;l/=p;for(let i=p;i<a.length;i++){if(i>p){const d=a[i]-a[i-1];g=(g*(p-1)+Math.max(0,d))/p;l=(l*(p-1)+Math.max(0,-d))/p}o[i]=l===0?100:100-100/(1+g/l)}return o}
function indicators(c:any[]){const a=c.map(z=>z.close),e20=ema(a,20),e50=ema(a,50),f=ema(a,12),s=ema(a,26),m=f.map((v,i)=>v-s[i]),me=ema(m,9),hist=m.map((v,i)=>v-me[i]),rr=rsi(a),atr:number[]=[],vr:number[]=[],mid:number[]=[],up:number[]=[],dn:number[]=[],width:number[]=[],vw:number[]=[],adx:number[]=[];for(let i=0;i<c.length;i++){let tr=0,plus=0,minus=0;for(let j=Math.max(1,i-13);j<=i;j++){const z=c[j],pr=c[j-1];tr+=Math.max(z.high-z.low,Math.abs(z.high-pr.close),Math.abs(z.low-pr.close));plus+=Math.max(0,z.high-pr.high);minus+=Math.max(0,pr.low-z.low)}atr.push(tr/Math.max(1,Math.min(14,i)));const w=c.slice(Math.max(0,i-19),i+1),cl=w.map(z=>z.close),vol=w.map(z=>z.volume),mm=avg(cl),st=std(cl);vr.push(c[i].volume/(avg(vol)||1));mid.push(mm);up.push(mm+2*st);dn.push(mm-2*st);width.push(mm?4*st/mm:0);const pv=w.reduce((t,z)=>t+((z.high+z.low+z.close)/3)*z.volume,0);vw.push(pv/(w.reduce((t,z)=>t+z.volume,0)||1));const dx=(plus+minus)>0?100*Math.abs(plus-minus)/(plus+minus):0;adx.push(dx)}return{e20,e50,rsi:rr,atr,vr,hist,mid,up,dn,width,vw,adx}}
function directionScore(id:string,dir:"LONG"|"SHORT",i:number,c:any[],x:any){const p=c[i],pr=c[i-1]||p,a=x.atr[i]||p.close*.01;let score=0;const reasons:string[]=[];const bull=dir==="LONG",trend=bull?x.e20[i]>x.e50[i]:x.e20[i]<x.e50[i],above=bull?p.close>x.e20[i]:p.close<x.e20[i],candle=bull?p.close>p.open:p.close<p.open,mom=bull?x.hist[i]>0:x.hist[i]<0,vol=x.vr[i];if(id==="trend-pullback"){if(trend){score+=22;reasons.push("EMA 20 / EMA 50 trend structure aligned")}if(above){score+=12;reasons.push("Price is on the trend side of EMA 20")}if(bull?p.low<=x.e20[i]+a*.45&&p.close>x.e20[i]:p.high>=x.e20[i]-a*.45&&p.close<x.e20[i]){score+=18;reasons.push("Retracement respected dynamic support / resistance")}if(bull?x.rsi[i]>=48&&x.rsi[i]<=68:x.rsi[i]>=32&&x.rsi[i]<=52){score+=14;reasons.push("RSI sits in the trend continuation band")}if(mom){score+=12;reasons.push("MACD histogram confirms direction")}if(vol>=.8&&vol<=2.8){score+=10;reasons.push("Relative volume confirms participation")}if(candle){score+=8;reasons.push("Completed candle confirms directional pressure")}}else if(id==="breakout"){const prev=c.slice(Math.max(0,i-20),i),level=bull?Math.max(...prev.map(z=>z.high)):Math.min(...prev.map(z=>z.low)),br=bull?p.close>level:p.close<level;if(br){score+=32;reasons.push("Close broke the prior 20-candle range")}if(vol>=1.45){score+=19;reasons.push("Relative volume expanded above 1.45×")}if(trend){score+=13;reasons.push("Breakout aligns with the 20 / 50 EMA trend")}if(bull?x.rsi[i]>=54&&x.rsi[i]<=78:x.rsi[i]>=22&&x.rsi[i]<=46){score+=12;reasons.push("Momentum supports the breakout direction")}if(mom){score+=10;reasons.push("MACD confirms impulse")}if(bull?(p.close-p.low)/Math.max(1e-9,p.high-p.low)>.68:(p.high-p.close)/Math.max(1e-9,p.high-p.low)>.68){score+=8;reasons.push("Candle closed near directional extreme")}}else if(id==="mean-reversion"){const z=(p.close-x.mid[i])/Math.max(a,1e-9),ext=bull?z< -1.35:z>1.35,exhaust=bull?x.rsi[i]<34:x.rsi[i]>66,turn=bull?p.close>pr.close:p.close<pr.close,band=bull?p.close>x.dn[i]:p.close<x.up[i];if(ext){score+=26;reasons.push("Price is extended away from its 20-period mean")}if(exhaust){score+=22;reasons.push("RSI confirms a stretched condition")}if(turn){score+=16;reasons.push("Price action shows a reversal attempt")}if(candle){score+=10;reasons.push("Completed candle confirms reversal pressure")}if(vol>1.05){score+=10;reasons.push("Participation increased near the extension")}if(band){score+=8;reasons.push("Price returned inside the outer volatility band")}}else if(id==="vwap-reclaim"){const cross=bull?pr.close<=x.vw[i-1]&&p.close>x.vw[i]:pr.close>=x.vw[i-1]&&p.close<x.vw[i];if(cross){score+=30;reasons.push("Price reclaimed / lost rolling VWAP")}if(above){score+=14;reasons.push("Price aligns with short-term trend")}if(bull?x.rsi[i]>50&&x.rsi[i]<72:x.rsi[i]<50&&x.rsi[i]>28){score+=14;reasons.push("RSI confirms improving directional momentum")}if(vol>1.2){score+=15;reasons.push("Participation increased on the VWAP cross")}if(candle){score+=10;reasons.push("Completed candle supports the VWAP direction")}if(mom){score+=9;reasons.push("MACD histogram confirms direction")}}else if(id==="squeeze-expansion"){const widths=x.width.slice(Math.max(0,i-60),i),base=avg(widths)||x.width[i],tight=x.width[i]<base*.78,prev=c.slice(Math.max(0,i-10),i),hi=Math.max(...prev.map(z=>z.high)),lo=Math.min(...prev.map(z=>z.low)),br=bull?p.close>hi:p.close<lo;if(tight){score+=23;reasons.push("Volatility compressed versus its recent baseline")}if(br){score+=25;reasons.push("Price broke the recent compression range")}if(vol>1.4){score+=18;reasons.push("Volume expansion supports the move")}if(trend){score+=12;reasons.push("Expansion aligns with prevailing trend")}if(bull?x.rsi[i]>=50&&x.rsi[i]<76:x.rsi[i]<=50&&x.rsi[i]>24){score+=10;reasons.push("RSI confirms directional momentum")}if(mom){score+=8;reasons.push("MACD histogram confirms expansion")}}return{score:clamp(Math.round(score),0,100),reasons}}
function makeSignal(s:any,i:number,c:any[],x:any){const p=c[i],a=x.atr[i]||p.close*.01,L=directionScore(s.id,"LONG",i,c,x),S=directionScore(s.id,"SHORT",i,c,x),best=L.score>=S.score?{...L,direction:"LONG"}:{...S,direction:"SHORT"},state=best.score>=s.trigger?"ACTIVE":best.score>=52?"WATCH":"WAIT",entry=p.close,sgn=best.direction==="LONG"?1:-1,stop=entry-sgn*a*1.35,targets=[entry+sgn*a*1.25,entry+sgn*a*2.2,entry+sgn*a*3.2];return{id:s.id,name:s.name,category:s.category,horizon:s.horizon,thesis:s.thesis,direction:state==="ACTIVE"?best.direction:"NEUTRAL",state,score:best.score,scoreLabel:"Confluence score · not probability",entry,entryLow:entry-a*.16,entryHigh:entry+a*.16,stop,targets,riskReward:Math.abs((targets[1]-entry)/(entry-stop)),reasons:best.reasons.length?best.reasons:["The required factors are not aligned.","Wait for a completed candle and fresh confirmation."],candleTime:p.time,atr:a}}
function backtestOne(id:string,c:any[]){if(c.length<120)return{strategy:id,trades:0,sampleStatus:"INSUFFICIENT_DATA",winRate:null,profitFactor:null,netReturn:null,maxDrawdown:null,equity:[]};const x=indicators(c),rets:number[]=[],eq:number[]=[];let cap=1,peak=1,dd=0,i=70;while(i<c.length-15){const l=directionScore(id,"LONG",i,c,x),s=directionScore(id,"SHORT",i,c,x),best=l.score>=s.score?{score:l.score,dir:1}:{score:s.score,dir:-1};if(best.score<78){i++;continue}const b=c[i+1],entry=b.open*(1+best.dir*.0003),a=x.atr[i]||entry*.01,stop=entry-best.dir*a*1.35,t1=entry+best.dir*a*1.25,t2=entry+best.dir*a*2.2,t3=entry+best.dir*a*3.2;let exit=c[Math.min(i+12,c.length-1)].close,exitAt=Math.min(i+12,c.length-1),hit1=false,reason="TIME";for(let j=i+1;j<=Math.min(i+12,c.length-1);j++){const hitStop=best.dir===1?c[j].low<=stop:c[j].high>=stop,hitT3=best.dir===1?c[j].high>=t3:c[j].low<=t3,hitT2=best.dir===1?c[j].high>=t2:c[j].low<=t2,hitT1=best.dir===1?c[j].high>=t1:c[j].low<=t1;if(hitStop){exit=hit1?(t1*.4+stop*.6):stop;exitAt=j;reason=hit1?"TP1+STOP":"STOP";break}if(hitT3){exit=t3;exitAt=j;reason="TP3";break}if(hitT2){exit=t2;exitAt=j;reason="TP2";break}if(hitT1)hit1=true}const raw=best.dir*(exit/entry-1),net=raw-.0026;rets.push(net);cap*=1+net;peak=Math.max(peak,cap);dd=Math.max(dd,(peak-cap)/peak);eq.push(Number(((cap-1)*100).toFixed(3)));i=exitAt+1}const wins=rets.filter(v=>v>0),loss=rets.filter(v=>v<=0),gw=wins.reduce((t,v)=>t+v,0),gl=Math.abs(loss.reduce((t,v)=>t+v,0));return{strategy:id,trades:rets.length,sampleStatus:rets.length>=30?"SAMPLE_30_PLUS":rets.length>=12?"LOW_SAMPLE":"INSUFFICIENT_SAMPLE",winRate:rets.length?Number((wins.length/rets.length*100).toFixed(1)):null,profitFactor:gl?Number((gw/gl).toFixed(2)):gw?99:null,netReturn:Number(((cap-1)*100).toFixed(2)),maxDrawdown:Number((dd*100).toFixed(2)),equity:eq}}
function demoCandles(symbol:string,interval:number){let seed=[...symbol].reduce((s,ch)=>s+ch.charCodeAt(0),interval*17);const rnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280};const step=interval*60,now=Math.floor(Date.now()/1000/step)*step;let price=65000;const arr:any[]=[];for(let i=599;i>=0;i--){const d=Math.sin(i/21)*.0015+Math.cos(i/51)*.0008+(rnd()-.49)*.005,open=price,close=Math.max(1,open*(1+d)),sp=Math.max(open*.0005,Math.abs(close-open)*.7+rnd()*open*.0015);arr.push({time:now-i*step,open,high:Math.max(open,close)+sp*rnd(),low:Math.min(open,close)-sp*rnd(),close,volume:5+rnd()*25});price=close}return arr}
async function marketData(symbol:string,interval:number,force=false){if(!MARKETS[symbol])symbol="BTCUSD";if(![15,60,240].includes(interval))interval=60;const key=symbol+":"+interval,old=cache.get(key);if(!force&&old&&Date.now()-old.at<25000)return old.data;let mode="LIVE_PUBLIC_DATA",source="Kraken public OHLC",fallbackReason="",candles:any[]=[];try{const r=await fetch("https://api.kraken.com/0/public/OHLC?pair="+MARKETS[symbol].pair+"&interval="+interval,{signal:AbortSignal.timeout(8500),headers:{"user-agent":"SignalForge/0.2 market research"}});if(!r.ok)throw new Error("Kraken HTTP "+r.status);const j:any=await r.json();if(j.error&&j.error.length)throw new Error(j.error.join(", "));const k=Object.keys(j.result||{}).find(z=>z!=="last"),rows=k?j.result[k]:null;if(!Array.isArray(rows)||rows.length<100)throw new Error("Insufficient OHLC response");candles=rows.slice(0,-1).map((v:any[])=>({time:+v[0],open:+v[1],high:+v[2],low:+v[3],close:+v[4],volume:+v[6]})).filter((z:any)=>Number.isFinite(z.close))}catch(e:any){mode="DEMO_DATA";source="Deterministic fallback";fallbackReason=e?.message||"Market data unavailable";candles=demoCandles(symbol,interval)}const data={candles,mode,source,fallbackReason,symbol,interval,fetchedAt:new Date().toISOString()};cache.set(key,{at:Date.now(),data});return data}
function summarize(c:any[]){const p=c[c.length-1],q=c[Math.max(0,c.length-25)]||p,x=indicators(c),recent=c.slice(-24);return{price:p.close,change24h:(p.close/q.close-1)*100,high24h:Math.max(...recent.map(z=>z.high)),low24h:Math.min(...recent.map(z=>z.low)),volume:p.volume,rsi:x.rsi.at(-1),ema20:x.e20.at(-1),ema50:x.e50.at(-1),atr:x.atr.at(-1),regime:x.e20.at(-1)>x.e50.at(-1)&&p.close>x.e20.at(-1)?"UPTREND":x.e20.at(-1)<x.e50.at(-1)&&p.close<x.e50.at(-1)?"DOWNTREND":"RANGE",lastTime:p.time}}
function json(data:any,status=200,headers:any={}){return new Response(JSON.stringify(data),{status,headers:Object.assign({"content-type":"application/json; charset=utf-8","cache-control":"no-store"},headers)})}
async function digest(s:string){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function cookie(req:Request,name:string){const c=req.headers.get("cookie")||"";const p=c.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));return p?p.slice(name.length+1):""}
async function userFor(req:Request){if(!dbReady||!db)return null;const raw=cookie(req,"sf_session");if(!raw)return null;const h=await digest(raw),s=await db.unsafe("SELECT u.id FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()",[h]);if(!s.length)return null;const id=s[0].id;await db.unsafe("UPDATE users SET plan='explorer',subscription_status='expired',updated_at=NOW() WHERE id=$1 AND subscription_status='trialing' AND trial_ends_at<=NOW() AND stripe_subscription_id IS NULL",[id]);await db.unsafe("UPDATE users SET last_active_at=NOW() WHERE id=$1",[id]);const r=await db.unsafe("SELECT id,email,role,selected_plan,selected_period,trial_ends_at,stripe_customer_id,stripe_subscription_id,subscription_status,billing_risk_status,referral_code,CASE WHEN billing_risk_status<>'clear' THEN 'explorer' WHEN subscription_status IN ('active','past_due') THEN plan WHEN subscription_status='trialing' AND trial_ends_at>NOW() THEN 'quant' ELSE 'explorer' END AS plan,CASE WHEN subscription_status='trialing' AND trial_ends_at>NOW() THEN GREATEST(0,CEIL(EXTRACT(EPOCH FROM(trial_ends_at-NOW()))/86400))::int ELSE 0 END AS trial_days_remaining FROM users WHERE id=$1",[id]);return r[0]||null}
async function apiKeyFor(req:Request){if(!dbReady||!db)return null;const a=req.headers.get("authorization")||"",raw=a.startsWith("Bearer ")?a.slice(7):"";if(!raw.startsWith("sf_live_"))return null;const r=await db.unsafe("SELECT k.id,k.user_id,CASE WHEN u.billing_risk_status<>'clear' THEN 'explorer' WHEN u.subscription_status IN ('active','past_due') THEN u.plan WHEN u.subscription_status='trialing' AND u.trial_ends_at>NOW() THEN 'quant' ELSE 'explorer' END AS plan FROM api_keys k JOIN users u ON u.id=k.user_id WHERE k.key_hash=$1 AND k.revoked_at IS NULL",[await digest(raw)]);if(!r.length)return null;const k=r[0],now=Date.now(),rk="api:"+k.id,o=rate.get(rk);if(!o||now-o.at>60000)rate.set(rk,{n:1,at:now});else if(++o.n>120)return{...k,rateLimited:true};await db.unsafe("INSERT INTO api_key_usage(api_key_id,path) VALUES($1,$2)",[k.id,new URL(req.url).pathname]);return{...k,rateLimited:false}}
async function initDb(){if(!db)return false;await db.unsafe("CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'explorer', role TEXT NOT NULL DEFAULT 'user', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");await db.unsafe("CREATE TABLE IF NOT EXISTS user_sessions (id BIGSERIAL PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");await db.unsafe("CREATE TABLE IF NOT EXISTS watchlists (id BIGSERIAL PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, symbol TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id,symbol))");await db.unsafe("CREATE TABLE IF NOT EXISTS signal_events (id BIGSERIAL PRIMARY KEY, signal_key TEXT UNIQUE NOT NULL, symbol TEXT NOT NULL, interval INTEGER NOT NULL, strategy_id TEXT NOT NULL, strategy_name TEXT NOT NULL, direction TEXT NOT NULL, score INTEGER NOT NULL, entry NUMERIC NOT NULL, stop NUMERIC NOT NULL, target1 NUMERIC NOT NULL, target2 NUMERIC NOT NULL, target3 NUMERIC NOT NULL, status TEXT NOT NULL DEFAULT 'OPEN', first_target BOOLEAN NOT NULL DEFAULT FALSE, outcome TEXT, exit_price NUMERIC, pnl_pct NUMERIC, entry_time BIGINT NOT NULL, candle_time BIGINT NOT NULL, reasoning JSONB NOT NULL DEFAULT '[]'::jsonb, source TEXT NOT NULL DEFAULT 'KRAKEN_PUBLIC_OHLC', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), closed_at TIMESTAMPTZ)");await db.unsafe("CREATE INDEX IF NOT EXISTS signal_events_created_idx ON signal_events(created_at DESC)");await db.unsafe("CREATE INDEX IF NOT EXISTS signal_events_open_idx ON signal_events(symbol,interval,status)");await db.unsafe("CREATE TABLE IF NOT EXISTS user_alerts (id BIGSERIAL PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, symbol TEXT NOT NULL, strategy_id TEXT, min_score INTEGER NOT NULL DEFAULT 75, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");await db.unsafe("CREATE TABLE IF NOT EXISTS api_keys (id BIGSERIAL PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, key_hash TEXT UNIQUE NOT NULL, key_prefix TEXT NOT NULL, label TEXT NOT NULL DEFAULT 'Default', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), revoked_at TIMESTAMPTZ)");await db.unsafe("CREATE TABLE IF NOT EXISTS payment_events (id BIGSERIAL PRIMARY KEY, stripe_event_id TEXT UNIQUE NOT NULL, event_type TEXT NOT NULL, user_id UUID, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");await db.unsafe("CREATE TABLE IF NOT EXISTS api_key_usage (id BIGSERIAL PRIMARY KEY, api_key_id BIGINT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE, path TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");await db.unsafe("CREATE INDEX IF NOT EXISTS api_key_usage_recent_idx ON api_key_usage(api_key_id,created_at DESC)");await db.unsafe("ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT, ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT, ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none', ADD COLUMN IF NOT EXISTS billing_price_id TEXT, ADD COLUMN IF NOT EXISTS billing_risk_status TEXT NOT NULL DEFAULT 'clear', ADD COLUMN IF NOT EXISTS referral_code TEXT, ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id), ADD COLUMN IF NOT EXISTS selected_plan TEXT, ADD COLUMN IF NOT EXISTS selected_period TEXT, ADD COLUMN IF NOT EXISTS marketing_source TEXT, ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ADD COLUMN IF NOT EXISTS lifecycle_email_consent BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN IF NOT EXISTS lifecycle_consent_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS lifecycle_consent_ip TEXT, ADD COLUMN IF NOT EXISTS lifecycle_unsubscribe_token TEXT, ADD COLUMN IF NOT EXISTS lifecycle_unsubscribed_at TIMESTAMPTZ");
await db.unsafe("CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code) WHERE referral_code IS NOT NULL");
await db.unsafe("CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_idx ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL");
await db.unsafe("CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_subscription_idx ON users(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL");
await db.unsafe("UPDATE users SET referral_code=UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text,'-',''),1,10)) WHERE referral_code IS NULL");
await db.unsafe("UPDATE users SET trial_started_at=NOW(),trial_ends_at=NOW()+INTERVAL '30 days',subscription_status='trialing',plan='quant' WHERE subscription_status='none' AND stripe_subscription_id IS NULL AND trial_ends_at IS NULL AND plan='explorer'");

await db.unsafe("UPDATE users SET role='admin' WHERE lower(email)=lower($1)",[Bun.env.SIGNALFORGE_ADMIN_EMAIL||"operations@noetfield.com"]);
await db.unsafe("CREATE TABLE IF NOT EXISTS growth_leads(id BIGSERIAL PRIMARY KEY,email TEXT UNIQUE NOT NULL,focus TEXT,source TEXT,consent BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
await db.unsafe("CREATE TABLE IF NOT EXISTS product_events(id BIGSERIAL PRIMARY KEY,user_id UUID REFERENCES users(id) ON DELETE SET NULL,event_name TEXT NOT NULL,source TEXT,metadata JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
await db.unsafe("CREATE INDEX IF NOT EXISTS product_events_created_idx ON product_events(created_at DESC)");
await db.unsafe("ALTER TABLE product_events ADD COLUMN IF NOT EXISTS event_key TEXT");
await db.unsafe("CREATE UNIQUE INDEX IF NOT EXISTS product_events_idempotency_idx ON product_events(event_key) WHERE event_key IS NOT NULL");
await db.unsafe("CREATE TABLE IF NOT EXISTS lifecycle_emails(id BIGSERIAL PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,email TEXT NOT NULL,template TEXT NOT NULL,scheduled_at TIMESTAMPTZ NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,sent_at TIMESTAMPTZ,last_error TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(user_id,template))");
await db.unsafe("CREATE INDEX IF NOT EXISTS lifecycle_emails_due_idx ON lifecycle_emails(status,scheduled_at)");
await db.unsafe("CREATE UNIQUE INDEX IF NOT EXISTS users_lifecycle_unsubscribe_idx ON users(lifecycle_unsubscribe_token) WHERE lifecycle_unsubscribe_token IS NOT NULL");
await db.unsafe("CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users(referred_by)");

await db.unsafe("CREATE TABLE IF NOT EXISTS community_posts(id BIGSERIAL PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,title VARCHAR(140) NOT NULL,body TEXT NOT NULL,category VARCHAR(24) NOT NULL,symbol VARCHAR(16),status VARCHAR(20) NOT NULL DEFAULT 'published',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
await db.unsafe("CREATE INDEX IF NOT EXISTS community_posts_recent_idx ON community_posts(status,created_at DESC)");
await db.unsafe("CREATE INDEX IF NOT EXISTS community_posts_author_idx ON community_posts(user_id,created_at DESC)");
await db.unsafe("CREATE TABLE IF NOT EXISTS community_comments(id BIGSERIAL PRIMARY KEY,post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,body TEXT NOT NULL,status VARCHAR(20) NOT NULL DEFAULT 'published',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
await db.unsafe("CREATE INDEX IF NOT EXISTS community_comments_post_idx ON community_comments(post_id,created_at ASC)");
await db.unsafe("CREATE TABLE IF NOT EXISTS community_likes(post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(post_id,user_id))");
await db.unsafe("CREATE TABLE IF NOT EXISTS community_reports(id BIGSERIAL PRIMARY KEY,post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,reason VARCHAR(36) NOT NULL,status VARCHAR(20) NOT NULL DEFAULT 'open',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(post_id,reporter_id))");
await db.unsafe("CREATE INDEX IF NOT EXISTS community_reports_open_idx ON community_reports(status,created_at DESC)");
await db.unsafe("CREATE TABLE IF NOT EXISTS token_observations (id BIGSERIAL PRIMARY KEY,chain_id TEXT NOT NULL,address TEXT NOT NULL,source TEXT NOT NULL,observation_hash TEXT NOT NULL,payload JSONB NOT NULL,observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(chain_id,address,source,observation_hash))");
await db.unsafe("CREATE INDEX IF NOT EXISTS token_observations_lookup_idx ON token_observations(chain_id,address,id DESC)");
await db.unsafe("CREATE TABLE IF NOT EXISTS token_change_events (id BIGSERIAL PRIMARY KEY,chain_id TEXT NOT NULL,address TEXT NOT NULL,previous_observation_id BIGINT REFERENCES token_observations(id) ON DELETE SET NULL,observation_id BIGINT NOT NULL REFERENCES token_observations(id) ON DELETE CASCADE,event_type TEXT NOT NULL,before_value NUMERIC,after_value NUMERIC,delta_pct NUMERIC,evidence JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(observation_id,event_type))");
await db.unsafe("CREATE INDEX IF NOT EXISTS token_change_events_lookup_idx ON token_change_events(chain_id,address,id DESC)");
await db.unsafe("CREATE TABLE IF NOT EXISTS token_watchlist_items (user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,chain_id TEXT NOT NULL DEFAULT 'solana',address TEXT NOT NULL,in_app_alerts BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,chain_id,address))");
await db.unsafe("CREATE TABLE IF NOT EXISTS token_alert_events (id BIGSERIAL PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,change_event_id BIGINT NOT NULL REFERENCES token_change_events(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),read_at TIMESTAMPTZ,UNIQUE(user_id,change_event_id))");
await db.unsafe("CREATE INDEX IF NOT EXISTS token_alert_events_user_idx ON token_alert_events(user_id,id DESC)");
await db.unsafe("CREATE TABLE IF NOT EXISTS token_research_notes (id BIGSERIAL PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,chain_id TEXT NOT NULL DEFAULT 'solana',address TEXT NOT NULL,kind TEXT NOT NULL CHECK (kind IN ('note','thesis')),body TEXT NOT NULL,invalidation TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
await db.unsafe("CREATE INDEX IF NOT EXISTS token_research_notes_owner_idx ON token_research_notes(user_id,chain_id,address,id DESC)");
dbReady=true;return true}
function rateLimit(req:Request,limit=30,scope="general"){const ip=req.headers.get("x-forwarded-for")?.split(",")[0]||"unknown",now=Date.now(),v=rate.get(scope+":"+ip);if(!v||now-v.at>60000){rate.set(scope+":"+ip,{n:1,at:now});return false}v.n++;return v.n>limit}
async function persistSignals(symbol:string,interval:number,c:any[],signals:any[],mode:string){if(!dbReady||!db||mode!=="LIVE_PUBLIC_DATA")return;const last=c[c.length-1];for(const s of signals){if(s.state!=="ACTIVE"||!["LONG","SHORT"].includes(s.direction))continue;const key=[symbol,interval,s.id,s.direction,last.time].join(":");await db.unsafe("INSERT INTO signal_events (signal_key,symbol,interval,strategy_id,strategy_name,direction,score,entry,stop,target1,target2,target3,entry_time,candle_time,reasoning,source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16) ON CONFLICT(signal_key) DO NOTHING",[key,symbol,interval,s.id,s.name,s.direction,s.score,s.entry,s.stop,s.targets[0],s.targets[1],s.targets[2],Date.now(),last.time,JSON.stringify(s.reasons),"KRAKEN_PUBLIC_OHLC"])}await evaluateSignals(symbol,interval,c)}
async function evaluateSignals(symbol:string,interval:number,c:any[]){if(!dbReady||!db)return;const rows=await db.unsafe("SELECT * FROM signal_events WHERE symbol=$1 AND interval=$2 AND status IN ('OPEN','TP1') ORDER BY id DESC LIMIT 300",[symbol,interval]);for(const t of rows){const after=c.filter(z=>z.time>Number(t.candle_time));if(!after.length)continue;let first=Boolean(t.first_target),closed=false,exit=0,outcome="",pnl=0;const dir=t.direction==="LONG"?1:-1,entry=Number(t.entry),stop=Number(t.stop),t1=Number(t.target1),t2=Number(t.target2),t3=Number(t.target3);for(const bar of after){const stopHit=dir===1?bar.low<=stop:bar.high>=stop,t1Hit=dir===1?bar.high>=t1:bar.low<=t1,t2Hit=dir===1?bar.high>=t2:bar.low<=t2,t3Hit=dir===1?bar.high>=t3:bar.low<=t3;if(stopHit){exit=first?(t1*.4+stop*.6):stop;outcome=first?"TP1+STOP":"STOP";closed=true;break}if(t3Hit){exit=t3;outcome="TARGET_3";closed=true;break}if(t2Hit){exit=t2;outcome="TARGET_2";closed=true;break}if(t1Hit&&!first){first=true;await db.unsafe("UPDATE signal_events SET first_target=TRUE,status='TP1' WHERE id=$1",[t.id])}}if(!closed&&Date.now()-new Date(t.created_at).getTime()>interval*60*1000*14){const last=after[after.length-1];exit=last.close;outcome="TIME_EXIT";closed=true}if(closed){pnl=(dir*(exit/entry-1)-.0026)*100;await db.unsafe("UPDATE signal_events SET status='CLOSED',outcome=$1,exit_price=$2,pnl_pct=$3,closed_at=NOW() WHERE id=$4",[outcome,exit,pnl,t.id])}}}
async function metricsLive(){if(!dbReady||!db)return{closedCount:0,winRate:null,netReturn:null,maxDrawdown:null};const rows=await db.unsafe("SELECT pnl_pct,closed_at FROM signal_events WHERE status='CLOSED' ORDER BY closed_at ASC");if(!rows.length)return{closedCount:0,winRate:null,netReturn:null,maxDrawdown:null};const rets=rows.map(x=>Number(x.pnl_pct)),wins=rets.filter(x=>x>0);let cap=1,peak=1,dd=0;for(const v of rets){cap*=1+v/100;peak=Math.max(peak,cap);dd=Math.max(dd,(peak-cap)/peak)}return{closedCount:rets.length,winRate:Number((wins.length/rets.length*100).toFixed(1)),netReturn:Number(((rets.reduce((s,v)=>s+v,0)/rets.length)).toFixed(3)),maxDrawdown:Number((dd*100).toFixed(2))}}
const MODELS=[
 ["Kronos","Financial candlestick foundation model","OHLCV autoregressive forecasting","KRONOS_INFERENCE_URL"],
 ["FinCast","Financial time-series foundation model","Probabilistic financial forecasting","FINCAST_INFERENCE_URL"],
 ["Chronos-2","Amazon time-series foundation model","Multivariate probabilistic forecasting","CHRONOS_INFERENCE_URL"],
 ["TimesFM 3.0","Google time-series foundation model","Covariate-aware multivariate forecasting","TIMESFM_INFERENCE_URL"],
 ["Moirai 2.0","Salesforce time-series foundation model","Universal probabilistic forecasting","MOIRAI_INFERENCE_URL"],
 ["TiRex-2","NXAI xLSTM forecaster","Streaming multivariate forecasting","TIREX_INFERENCE_URL"],
 ["Sundial","Probabilistic time-series foundation model","Distributional forecasting","SUNDIAL_INFERENCE_URL"],
 ["Lag-Llama","Probabilistic time-series Transformer","Lag-aware forecasting","LAGLLAMA_INFERENCE_URL"],
 ["MOMENT","General-purpose time-series foundation model","Forecasting and representation learning","MOMENT_INFERENCE_URL"],
 ["TimeGPT","Nixtla commercial forecasting model","Financial and multivariate time-series API","TIMEGPT_INFERENCE_URL"],
 ["PatchTST","Time-series Transformer baseline","Patch-based multivariate forecasting","PATCHTST_INFERENCE_URL"],
 ["iTransformer","Inverted Transformer","Cross-variate forecasting","ITRANSFORMER_INFERENCE_URL"],
 ["N-BEATS","Neural forecasting architecture","Interpretable basis expansion","NBEATS_INFERENCE_URL"],
 ["N-HiTS","Hierarchical interpolation forecaster","Multi-scale long-horizon forecasting","NHITS_INFERENCE_URL"],
 ["Temporal Fusion Transformer","Interpretable multi-horizon architecture","Covariate-rich forecasting","TFT_INFERENCE_URL"],
 ["DLinear","Linear time-series baseline","Robust benchmark baseline","DLINEAR_INFERENCE_URL"],
 ["MASTER","Market-Guided Stock Transformer","Cross-stock relation modeling","MASTER_INFERENCE_URL"],
 ["StockMixer","Stock forecasting neural model","Temporal and cross-sectional stock mixing","STOCKMIXER_INFERENCE_URL"],
 ["DeepLOB","Limit order book deep model","Order-book direction classification","DEEPLOB_INFERENCE_URL"],
 ["HLOB","Limit order book architecture","Order-book microstructure forecasting","HLOB_INFERENCE_URL"],
 ["MarS","Microsoft Research market simulator","Order-flow generation and market simulation","MARS_INFERENCE_URL"],
 ["FinBERT","Financial language model","News sentiment features","FINBERT_INFERENCE_URL"],
 ["FinGPT","Open financial language model","Financial news and research analysis","FINGPT_INFERENCE_URL"],
 ["FinRL","Reinforcement-learning trading framework","Portfolio policy research and strategy execution","FINRL_INFERENCE_URL"],
 ["TradingAgents","Multi-agent financial research framework","Multi-role analyst and decision workflow","TRADINGAGENTS_INFERENCE_URL"]
]
function modelList(){return MODELS.map(m=>({name:m[0],role:m[1],provider:m[2],status:Bun.env[m[3]]?"CONFIGURED_ENDPOINT":"NOT_CONNECTED",adapterEnv:m[3]}))}
async function backtestResponse(symbol:string,interval:number,strategy:string){const pack=await marketData(symbol,interval),ids=strategy==="all"?STRATEGIES.map(x=>x.id):[strategy],results=ids.filter(id=>STRATEGIES.some(x=>x.id===id)).map(id=>backtestOne(id,pack.candles));const sum=results.reduce((a,x)=>({trades:a.trades+x.trades,wins:a.wins+(x.trades&&x.winRate!==null?x.trades*x.winRate/100:0),net:a.net+(x.netReturn||0),dd:Math.max(a.dd,x.maxDrawdown||0)}),{trades:0,wins:0,net:0,dd:0});const aggregate={trades:sum.trades,winRate:sum.trades?Number((sum.wins/sum.trades*100).toFixed(1)):null,netReturn:results.length?Number((results.reduce((a,x)=>a+(x.netReturn||0),0)/results.length).toFixed(2)):null,profitFactor:results.length?Number(avg(results.map(x=>x.profitFactor||0)).toFixed(2)):null,maxDrawdown:sum.dd,sampleStatus:sum.trades>=30?"SAMPLE_30_PLUS":sum.trades>=12?"LOW_SAMPLE":"INSUFFICIENT_SAMPLE"};return{mode:pack.mode,source:pack.source,results,aggregate,assumptions:"Historical simulation · completed candle signal · next-bar open entry · long and short · 0.10% taker fee + 0.03% slippage each side (0.26% round trip) · 1.35 ATR stop · 40% at target 1 / 60% stop if reversal before target 2 · target 2 / 3 full exit · 14-bar max hold · stop-first same-bar ordering."}}
async function stripeCheckout(user:any,plan:string,period:string){
 const p=plan==="quant"?"quant":"pro",i=period==="year"?"year":"month";
 if(user.subscription_status==="active"&&user.stripe_subscription_id)return json({error:"You already have an active subscription. Use Manage billing."},409);
 const k=stripeCheckoutUrlKey(p,i),link=Bun.env[k];
 if(!link)return json({error:"Paid checkout is not configured for this plan."},503);
 let dest:URL;
 try{dest=new URL(link);if(dest.protocol!=="https:"||!["buy.stripe.com","checkout.stripe.com"].includes(dest.hostname))throw Error("Unexpected payment host")}
 catch{return json({error:"Payment link configuration invalid"},503)}
 dest.searchParams.set("client_reference_id",user.id);
 dest.searchParams.set("prefilled_email",user.email);
 dest.searchParams.set("utm_source","signalforge_app");
 dest.searchParams.set("utm_campaign","paid_"+p+"_"+i);
 await db.unsafe("UPDATE users SET selected_plan=$1,selected_period=$2,updated_at=NOW() WHERE id=$3",[p,i,user.id]);
 await recordProductAction(user.id,"checkout_started","checkout:"+user.id+":"+p+":"+i+":"+Math.floor(Date.now()/300000));
 return json({url:dest.toString(),checkoutMode:"voluntary_paid",subscriptionStatus:user.subscription_status,entitlementChanged:false});
}

const COMMUNITY_CATEGORIES=["analysis","strategy","research","questions","product"];
function communityText(value:any,max:number){return String(value||"").trim().slice(0,max+1)}
function communityOrigin(req:Request){const o=req.headers.get("origin");return !o||o===new URL(req.url).origin||o===BASE_URL.replace(/\/$/,"")}
async function safeToken(req:Request){const secret=Bun.env.SIGNALFORGE_COMPANY_OS_KEY||"",supplied=(req.headers.get("authorization")||"").replace(/^Bearer /,"");if(secret.length<40||supplied.length!==secret.length)return false;const a=await digest(secret),b=await digest(supplied);let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
async function recordProductAction(userId:string,eventName:string,key:string){
 // Only server-observed authenticated actions enter conversion cohorts.
 // Event keys are scoped, deterministic, replay-safe and contain no PII.
 if(!dbReady||!db)return;
 try{await db.unsafe("INSERT INTO product_events(user_id,event_name,source,event_key) VALUES($1,$2,'server_observed',$3) ON CONFLICT DO NOTHING",
  [userId,eventName,key]);}catch(e:any){console.error("company event record failed",e?.message||"unknown")}
}
async function operationalCohorts(){
 if(!dbReady||!db)throw new Error("operating metrics storage unavailable");
 const exclude=" AND role='user' AND email NOT LIKE '%@signalforge.test' AND email NOT LIKE '%@example.com' AND email NOT LIKE '%@signalforge.invalid'";
 const [activation,retention,trial,moderation,failed]=await Promise.all([
 db.unsafe("SELECT COUNT(*)::int AS eligible,COUNT(*) FILTER(WHERE EXISTS(SELECT 1 FROM product_events e WHERE e.user_id=u.id AND e.source='server_observed' AND e.event_name IN ('token_researched','watchlist_added','token_watchlist_added','research_note_created','research_backtest','community_post','community_reply') AND e.created_at>=u.created_at AND e.created_at<u.created_at+INTERVAL '24 hours'))::int AS converted FROM users u WHERE u.created_at>NOW()-INTERVAL '15 days' AND u.created_at<=NOW()-INTERVAL '1 day'"+exclude),
 db.unsafe("SELECT COUNT(*)::int AS eligible,COUNT(*) FILTER(WHERE EXISTS(SELECT 1 FROM product_events e WHERE e.user_id=u.id AND e.source='server_observed' AND e.event_name IN ('token_researched','watchlist_added','token_watchlist_added','research_note_created','research_backtest','community_post','community_reply') AND e.created_at>=u.created_at+INTERVAL '6 days' AND e.created_at<u.created_at+INTERVAL '8 days'))::int AS converted FROM users u WHERE u.created_at>NOW()-INTERVAL '22 days' AND u.created_at<=NOW()-INTERVAL '8 days'"+exclude),
 db.unsafe("SELECT COUNT(*)::int AS eligible,COUNT(*) FILTER(WHERE subscription_status='active' AND billing_risk_status='clear' AND stripe_customer_id IS NOT NULL AND EXISTS(SELECT 1 FROM payment_events p WHERE p.event_type='invoice.paid' AND p.payload->'data'->'object'->>'customer'=u.stripe_customer_id AND COALESCE(p.payload #>> '{data,object,subscription}',p.payload #>> '{data,object,parent,subscription_details,subscription}')=u.stripe_subscription_id AND COALESCE(p.payload #>> '{data,object,lines,data,0,price,id}',p.payload #>> '{data,object,lines,data,0,pricing,price_details,price}')=u.billing_price_id AND p.payload #>> '{data,object,paid}'='true' AND p.payload #>> '{data,object,status}'='paid'))::int AS converted FROM users u WHERE u.trial_started_at IS NOT NULL AND u.trial_ends_at<=NOW() AND u.trial_started_at>NOW()-INTERVAL '120 days'"+exclude),
 db.unsafe("SELECT COUNT(*)::int AS n FROM community_reports WHERE status='open' AND created_at<NOW()-INTERVAL '24 hours'"),
 db.unsafe("SELECT COUNT(*)::int AS n FROM payment_events p JOIN users u ON u.stripe_customer_id=(p.payload #>> '{data,object,customer}') AND u.stripe_subscription_id=COALESCE(p.payload #>> '{data,object,subscription}',p.payload #>> '{data,object,parent,subscription_details,subscription}') WHERE p.event_type='invoice.payment_failed' AND p.created_at>NOW()-INTERVAL '7 days' AND u.role='user' AND u.email NOT LIKE '%@signalforge.test' AND u.email NOT LIKE '%@example.com' AND u.email NOT LIKE '%@signalforge.invalid'")
 ]);
 return {eligible24h:activation[0].eligible,activated24h:activation[0].converted,
   eligibleDay7:retention[0].eligible,returnedDay7:retention[0].converted,
   maturedTrials:trial[0].eligible,invoicePaidMatured:trial[0].converted,
   overdueReports:moderation[0].n,failedInvoices7d:failed[0].n};
}
async function companySnapshot(req:Request){if(!dbReady||!db)return json({error:"Metrics database not ready"},503);if(!Bun.env.SIGNALFORGE_COMPANY_OS_KEY)return json({error:"Company OS integration not configured"},503);if(!await safeToken(req))return json({error:"Unauthorized"},401);
const [users,community,reports,activity,signals,operatingMetrics,commercial]=await Promise.all([
 db.unsafe("SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE created_at>NOW()-INTERVAL '7 days')::int AS signups7d,COUNT(*) FILTER(WHERE last_active_at>NOW()-INTERVAL '7 days')::int AS active7d,COUNT(*) FILTER(WHERE subscription_status='trialing' AND trial_ends_at>NOW())::int AS trials,COUNT(*) FILTER(WHERE subscription_status='active' AND billing_risk_status='clear')::int AS paying FROM users u WHERE u.role='user' AND u.email NOT LIKE '%@signalforge.test' AND u.email NOT LIKE '%@example.com' AND u.email NOT LIKE '%@signalforge.invalid'"),
 db.unsafe("SELECT COUNT(*)::int AS posts,COUNT(*) FILTER(WHERE p.created_at>NOW()-INTERVAL '7 days')::int AS posts7d,COUNT(DISTINCT p.user_id)::int AS authors FROM community_posts p JOIN users u ON u.id=p.user_id WHERE p.status='published' AND u.role='user' AND u.email NOT LIKE '%@signalforge.test' AND u.email NOT LIKE '%@example.com' AND u.email NOT LIKE '%@signalforge.invalid'"),
 db.unsafe("SELECT COUNT(*)::int AS open FROM community_reports r JOIN community_posts p ON p.id=r.post_id JOIN users u ON u.id=p.user_id WHERE r.status='open' AND u.role='user' AND u.email NOT LIKE '%@signalforge.test' AND u.email NOT LIKE '%@example.com' AND u.email NOT LIKE '%@signalforge.invalid'"),
 db.unsafe("SELECT COUNT(*)::int AS events7d FROM product_events e JOIN users u ON u.id=e.user_id WHERE e.created_at>NOW()-INTERVAL '7 days' AND e.source='server_observed' AND u.role='user' AND u.email NOT LIKE '%@signalforge.test' AND u.email NOT LIKE '%@example.com' AND u.email NOT LIKE '%@signalforge.invalid'"),
 db.unsafe("SELECT COUNT(*)::int AS recorded,COUNT(*) FILTER(WHERE status='CLOSED')::int AS resolved FROM signal_events"),
 operationalCohorts(),
 getRevenueSnapshot(db)
]);return json({schemaVersion:"1.0.0",tenant:"signalforge",generatedAt:new Date().toISOString(),environment:"production",source:"SignalForge PostgreSQL aggregate observations",readOnly:true,privacy:{identifiersIncluded:false,freeTextIncluded:false,syntheticUsersExcluded:true},users:users[0],community:community[0],moderation:reports[0],product:activity[0],signals:signals[0],operatingMetrics,operatingPolicy:evaluateCompanyPolicy(operatingMetrics),
 commercialEvidence:{
  source:"SignalForge signed local webhook and authenticated source activity",
  asOf:commercial.asOf,
  genuineAccounts:commercial.accounts.genuineAccounts,
  tokenResearchersLast30Days:commercial.funnel.authenticatedTokenResearchersLast30Days,
  returnDayResearchersLast30Days:commercial.funnel.returnDayResearchersLast30Days,
  pricingViewersLast30Days:commercial.funnel.pricingViewersLast30Days,
  checkoutStartedUsersLast30Days:commercial.funnel.checkoutStartedUsersLast30Days,
  linkedPaidSubscriberUsersInRetainedEvents:commercial.billing.linkedPaidSubscriberUsers,
  sourceReportedGrossPaidCadMinor:commercial.billing.sourceReportedGrossPaidCadMinor,
  settledCashCadMinor:null,
  settlementStatus:"NOT_INDEPENDENTLY_RECONCILED"
 }})}
async function communityRoute(req:Request,path:string,method:string,url:URL){
if(!dbReady||!db)return json({error:"Community storage unavailable"},503);
if(method!=="GET"&&!communityOrigin(req))return json({error:"Invalid request origin"},403);
const viewer=await userFor(req),needsLogin=()=>json({error:"Sign in to participate in Signal Rooms."},401);
if(path==="/api/community/posts"&&method==="GET"){
 const category=String(url.searchParams.get("category")||""),sort=url.searchParams.get("sort")==="popular"?"popular":"recent",page=Math.min(20,Math.max(0,Number(url.searchParams.get("page")||0)||0)),limit=20;
 if(category&&!COMMUNITY_CATEGORIES.includes(category))return json({error:"Unsupported category"},400);
 const order=sort==="popular"?"likes DESC,p.created_at DESC":"p.created_at DESC";
 const rows=await db.unsafe("SELECT p.id::text AS id,p.title,p.body,p.category,p.symbol,p.created_at AS \"createdAt\",'Member '||UPPER(LEFT(p.user_id::text,6)) AS author,(SELECT COUNT(*)::int FROM community_likes l WHERE l.post_id=p.id) AS likes,(SELECT COUNT(*)::int FROM community_comments c WHERE c.post_id=p.id AND c.status='published') AS comments,EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=$4::uuid) AS \"likedByMe\" FROM community_posts p WHERE p.status='published' AND ($1::text='' OR p.category=$1) ORDER BY "+order+" LIMIT $2 OFFSET $3",[category,limit,page*limit,viewer?.id||null]);
 return json({items:rows,page,limit,source:"Member-authored posts only; no simulated activity."})
}
if(path==="/api/community/posts"&&method==="POST"){
 if(!viewer)return needsLogin();const b=await req.json().catch(()=>({})),title=communityText(b.title,140),body=communityText(b.body,2200),category=String(b.category||"questions"),symbol=String(b.symbol||"");
 if(title.length<8||title.length>140||body.length<30||body.length>2200||!COMMUNITY_CATEGORIES.includes(category)||(symbol&&!MARKETS[symbol]))return json({error:"Title 8–140 characters, body 30–2200 characters, valid category and market required."},400);
 const count=await db.unsafe("SELECT COUNT(*)::int AS n FROM community_posts WHERE user_id=$1 AND created_at>NOW()-INTERVAL '1 hour'",[viewer.id]);if(count[0].n>=6)return json({error:"Hourly posting limit reached."},429);
 const rows=await db.unsafe("INSERT INTO community_posts(user_id,title,body,category,symbol) VALUES($1,$2,$3,$4,$5) RETURNING id::text AS id",[viewer.id,title,body,category,symbol||null]);await recordProductAction(viewer.id,"community_post","post:"+rows[0].id);return json({ok:true,id:rows[0].id},201)
}
const match=/^\/api\/community\/posts\/(\d{1,18})\/(comments|like|report)$/.exec(path);if(match){
 const id=match[1],action=match[2],post=await db.unsafe("SELECT id,user_id FROM community_posts WHERE id=$1 AND status='published'",[id]);if(!post.length)return json({error:"Post not found"},404);
 if(action==="comments"&&method==="GET"){const rows=await db.unsafe("SELECT id::text AS id,body,created_at AS \"createdAt\",'Member '||UPPER(LEFT(user_id::text,6)) AS author FROM community_comments WHERE post_id=$1 AND status='published' ORDER BY created_at ASC LIMIT 100",[id]);return json({items:rows})}
 if(!viewer)return needsLogin();
 if(action==="comments"&&method==="POST"){const b=await req.json().catch(()=>({})),body=communityText(b.body,1000);if(body.length<5||body.length>1000)return json({error:"Reply must be 5–1000 characters."},400);
 const count=await db.unsafe("SELECT COUNT(*)::int AS n FROM community_comments WHERE user_id=$1 AND created_at>NOW()-INTERVAL '1 hour'",[viewer.id]);if(count[0].n>=25)return json({error:"Hourly reply limit reached."},429);const comment=await db.unsafe("INSERT INTO community_comments(post_id,user_id,body) VALUES($1,$2,$3) RETURNING id::text AS id",[id,viewer.id,body]);await recordProductAction(viewer.id,"community_reply","reply:"+comment[0].id);return json({ok:true},201)}
 if(action==="like"&&method==="POST"){const b=await req.json().catch(()=>({}));if(b.liked===false)await db.unsafe("DELETE FROM community_likes WHERE post_id=$1 AND user_id=$2",[id,viewer.id]);else await db.unsafe("INSERT INTO community_likes(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[id,viewer.id]);return json({ok:true})}
 if(action==="report"&&method==="POST"){const b=await req.json().catch(()=>({})),reason=String(b.reason||"spam");if(!["spam","harassment","misinformation","other"].includes(reason))return json({error:"Invalid report reason"},400);await db.unsafe("INSERT INTO community_reports(post_id,reporter_id,reason) VALUES($1,$2,$3) ON CONFLICT(post_id,reporter_id) DO NOTHING",[id,viewer.id,reason]);return json({ok:true})}
}
if(path==="/api/community/moderation"&&method==="GET"){if(!viewer||viewer.role!=="admin")return json({error:"Admin required"},403);return json({items:await db.unsafe("SELECT r.id::text AS id,r.post_id::text AS \"postId\",r.reason,r.created_at AS \"createdAt\",p.title FROM community_reports r JOIN community_posts p ON p.id=r.post_id WHERE r.status='open' ORDER BY r.created_at DESC LIMIT 100")})}
if(path==="/api/community/moderation"&&method==="POST"){if(!viewer||viewer.role!=="admin")return json({error:"Admin required"},403);const b=await req.json().catch(()=>({}));if(!/^\d{1,18}$/.test(String(b.postId||""))||!["hide","dismiss"].includes(b.action))return json({error:"Invalid moderation action"},400);if(b.action==="hide")await db.unsafe("UPDATE community_posts SET status='hidden',updated_at=NOW() WHERE id=$1",[b.postId]);await db.unsafe("UPDATE community_reports SET status='closed' WHERE post_id=$1",[b.postId]);return json({ok:true})}
return json({error:"Not found"},404)
}

async function handler(req:Request){const u=new URL(req.url),path=u.pathname,method=req.method;if(method==="GET"&&(path==="/welcome"||path==="/start"))return new Response(SIGNALFORGE_MARKETING_HTML,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public,max-age=300","x-content-type-options":"nosniff"}});if(method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":u.origin,"Access-Control-Allow-Credentials":"true","Access-Control-Allow-Headers":"content-type,authorization","Access-Control-Allow-Methods":"GET,POST,OPTIONS"}});if(path==="/api/health"){let database=false;try{if(dbReady&&db){await db.unsafe("SELECT 1");database=true}}catch{}return json({ok:true,service:"SIGNALFORGE",version:"0.4.0",database:database?"connected":"not_ready",marketData:"Kraken public OHLC",mode:"read-only signals; no broker execution",now:new Date().toISOString()})}
if(method==="GET"&&path==="/robots.txt"){
 const origin=BASE_URL.replace(/\/$/,"");
 return new Response("User-agent: *\nAllow: /radar\nAllow: /tokens/solana/\nDisallow: /api/\nDisallow: /app\nDisallow: /admin\nSitemap: "+origin+"/sitemap.xml\n",{headers:{"content-type":"text/plain; charset=utf-8","cache-control":"public,max-age=3600"}});
}
if(method==="GET"&&path==="/sitemap.xml"){
 const origin=BASE_URL.replace(/\/$/,"");
 let discovered:any[]=[];
 if(dbReady&&db){
  try{
   discovered=await db.unsafe("SELECT address,MAX(last_seen_at) AS last_seen_at FROM token_observations WHERE chain_id='solana' GROUP BY address ORDER BY MAX(last_seen_at) DESC LIMIT 100");
  }catch(error){console.error("Public token sitemap unavailable",String(error).slice(0,90))}
 }
 const pages=[{url:"/welcome",last:null},{url:"/radar",last:null},...discovered.filter(x=>validSolanaAddress(String(x.address))).map(x=>({url:"/tokens/solana/"+x.address,last:x.last_seen_at}))];
 const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.map(p=>'<url><loc>'+origin+p.url+'</loc>'+(p.last?'<lastmod>'+new Date(p.last).toISOString()+'</lastmod>':"")+'</url>').join("")+'</urlset>';
 return new Response(xml,{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public,max-age=3600","x-content-type-options":"nosniff"}});
}
if(method==="GET" && (path==="/radar" || path.startsWith("/tokens/solana/"))){
 const address=path.startsWith("/tokens/solana/")?path.slice("/tokens/solana/".length):null;
 if(address && !validSolanaAddress(address))return new Response("Invalid Solana token address",{status:404,headers:{"content-type":"text/plain; charset=utf-8"}});
 const origin=BASE_URL.replace(/\/$/,"");
 const pathForMeta=address?"/tokens/solana/"+address:"/radar";
 const canonical=origin+pathForMeta;
 const meta='<link rel="canonical" href="'+canonical+'">'+
   '<meta property="og:url" content="'+canonical+'">'+
   '<meta name="twitter:card" content="summary">'+
   '<meta name="robots" content="index,follow">';
 const document=TOKEN_RADAR_HTML
   .replace("<title>Token Radar · SignalForge</title>",address?"<title>Solana token "+address+" · Token Radar · SignalForge</title>":"<title>Token Radar · SignalForge</title>")
   .replace('content="SignalForge Token Radar — Source-linked Solana research"', 'content="'+(address?"Solana "+address+" market research — SignalForge Token Radar":"SignalForge Token Radar — Source-linked Solana research")+'"')
   .replace("</head>",meta+"</head>");
 return new Response(document,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public,max-age=60","x-content-type-options":"nosniff"}});
}
if(path==="/api/tokens/history" || /^\/api\/tokens\/solana\/[^/]+\/history$/.test(path)){
 if(method!=="GET")return json({error:"METHOD_NOT_ALLOWED"},405);
 const mint=path.includes("/solana/")?path.split("/")[4]:u.searchParams.get("address")||"";
 if(!validSolanaAddress(mint))return json({error:"INVALID_SOLANA_ADDRESS"},400);
 if(!dbReady||!db)return json({error:"HISTORY_DATABASE_UNAVAILABLE"},503);
 if(rateLimit(req,45))return json({error:"RATE_LIMITED"},429);
 try{return json(await getTokenHistory(db,mint))}
 catch(e){console.error("Token history unavailable",String(e).slice(0,100));return json({error:"HISTORY_UNAVAILABLE"},503)}
}

if(path==="/api/tokens/notes"){
 if(!["GET","POST","DELETE"].includes(method))return json({error:"METHOD_NOT_ALLOWED"},405);
 if(!dbReady||!db)return json({error:"RESEARCH_STORAGE_UNAVAILABLE"},503);
 const owner=await userFor(req);
 if(!owner)return json({error:"SIGN_IN_REQUIRED"},401);
 if(method==="GET"){
  const address=u.searchParams.get("address")||"";
  if(!validSolanaAddress(address))return json({error:"INVALID_SOLANA_ADDRESS"},400);
  const items=await loadResearchJournalWithEvidence(db,owner.id,address);
  return json({address,items,source:"USER_AUTHORED_PRIVATE_NOTES",verifiedMarketFacts:false});
 }
 if(!communityOrigin(req))return json({error:"INVALID_ORIGIN"},403);
 if(method==="DELETE"){
  const id=u.searchParams.get("id")||"";
  if(!validResearchNoteId(id))return json({error:"INVALID_NOTE_ID"},400);
  const deleted=await db.unsafe("DELETE FROM token_research_notes WHERE id=$1 AND user_id=$2 RETURNING id",[id,owner.id]);
  return deleted.length?json({ok:true,deletedId:String(id)}):json({error:"NOTE_NOT_FOUND"},404);
 }
 if(Number(req.headers.get("content-length")||0)>4000)return json({error:"NOTE_PAYLOAD_TOO_LARGE"},413);
 const raw=await req.text();
 if(raw.length>4000)return json({error:"NOTE_PAYLOAD_TOO_LARGE"},413);
 let input:any;
 try{input=JSON.parse(raw)}catch{return json({error:"INVALID_JSON"},400)}
 const validation=validateResearchNote(input,validSolanaAddress);
 if(validation.error)return json({error:validation.error},400);
 const note=validation.value;
 const count=await db.unsafe("SELECT COUNT(*)::int AS n FROM token_research_notes WHERE user_id=$1",[owner.id]);
 if(count[0]?.n>=100)return json({error:"NOTE_LIMIT_REACHED"},409);
 const rows=await db.unsafe("INSERT INTO token_research_notes(user_id,chain_id,address,kind,body,invalidation) VALUES($1,'solana',$2,$3,$4,$5) RETURNING id,kind,body,invalidation,created_at AS \"createdAt\"",[owner.id,note.address,note.kind,note.body,note.invalidation]);
 await recordProductAction(owner.id,"research_note_created","research-note:"+owner.id+":"+rows[0].id);
 return json({note:rows[0],address:note.address},201);
}
if(path==="/api/tokens/watchlist"){
 if(!dbReady||!db)return json({error:"ACCOUNT_STORAGE_UNAVAILABLE"},503);
 const user=await userFor(req);
 if(!user)return json({error:"SIGN_IN_REQUIRED"},401);
 if(method==="GET")return json({items:await getSavedTokenList(db,user.id)});
 if(!communityOrigin(req))return json({error:"INVALID_ORIGIN"},403);
 if(method==="POST"){
  const b=await req.json().catch(()=>({})),mint=String(b.address||"");
  if(!validSolanaAddress(mint))return json({error:"INVALID_SOLANA_ADDRESS"},400);
  const count=await db.unsafe("SELECT COUNT(*)::int AS count FROM token_watchlist_items WHERE user_id=$1",[user.id]);
  if(count[0]?.count>=50)return json({error:"WATCHLIST_LIMIT_REACHED"},409);
  const result=await saveToken(db,user.id,mint,b.inAppAlerts===true);
  await recordProductAction(user.id,"token_watchlist_added","token-watch:"+user.id+":"+mint);
  return json(result,201);
 }
 if(method==="DELETE"){
  const mint=u.searchParams.get("address")||"";
  if(!validSolanaAddress(mint))return json({error:"INVALID_SOLANA_ADDRESS"},400);
  return json(await removeSavedToken(db,user.id,mint));
 }
 return json({error:"METHOD_NOT_ALLOWED"},405);
}
if(path==="/api/tokens/notifications/read"){
 if(method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
 if(!dbReady||!db)return json({error:"ACCOUNT_STORAGE_UNAVAILABLE"},503);
 const user=await userFor(req);if(!user)return json({error:"SIGN_IN_REQUIRED"},401);
 if(!communityOrigin(req))return json({error:"INVALID_ORIGIN"},403);
 const b=await req.json().catch(()=>({}));
 if(b.all!==true)return json({error:"ALL_FLAG_REQUIRED"},400);
 const updated=await db.unsafe("UPDATE token_alert_events SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL RETURNING id",[user.id]);
 return json({ok:true,updated:updated.length});
}
if(path==="/api/tokens/notifications"){
 if(method!=="GET")return json({error:"METHOD_NOT_ALLOWED"},405);
 if(!dbReady||!db)return json({error:"ACCOUNT_STORAGE_UNAVAILABLE"},503);
 const user=await userFor(req);if(!user)return json({error:"SIGN_IN_REQUIRED"},401);
 return json({items:await getTokenNotifications(db,user.id),channel:"IN_APP_ONLY",polling:"ON_DEMAND_ONLY"});
}
if(path==="/api/tokens/lookup" || path.startsWith("/api/tokens/solana/")){
 if(method!=="GET")return json({error:"METHOD_NOT_ALLOWED"},405);
 if(rateLimit(req,24))return json({error:"RATE_LIMITED"},429,{"retry-after":"60"});
 const chain=u.searchParams.get("chain")||"solana";
 if(chain!=="solana")return json({error:"UNSUPPORTED_CHAIN"},400);
 const mint=path.startsWith("/api/tokens/solana/")?path.slice("/api/tokens/solana/".length):u.searchParams.get("address")||"";
 if(!validSolanaAddress(mint))return json({error:"INVALID_SOLANA_ADDRESS"},400);
 try{
  const report=await researchSolanaToken(mint);
  if(dbReady&&db){
   try{
    const persistence=await persistTokenObservation(db,report);
    const history=await getTokenHistory(db,mint);
    report.historyStatus=history.historyStatus;
    report.observationState=persistence.status;
    report.newChangeEvents=persistence.newEvents;
   }catch(error){
    console.error("Token research persistence failed:",String(error).slice(0,90));
    report.historyStatus="PERSISTENCE_UNAVAILABLE";
    report.observationState="PERSISTENCE_UNAVAILABLE";
   }
  }else{
   report.historyStatus="PERSISTENCE_UNAVAILABLE";
   report.observationState="PERSISTENCE_UNAVAILABLE";
  }
  // Record only authenticated, real source-backed research; anonymous requests and
  // invalid/provider-unavailable lookups are never treated as human conversion.
  if(dbReady&&db&&report.status==="OBSERVED"&&report.source?.name==="DEX Screener"){
   const researcher=await userFor(req);
   if(researcher)await recordProductAction(researcher.id,"token_researched","token-researched:"+researcher.id+":"+mint+":"+new Date().toISOString().slice(0,10));
  }
  return json(report,200,{"x-content-type-options":"nosniff"});
 }catch(error){
  const code=error instanceof TokenRadarError?error.code:"RESEARCH_UNAVAILABLE";
  const status=error instanceof TokenRadarError?error.status:503;
  console.error("Token Radar upstream unavailable:",code);
  return json({error:code,source:"DEX Screener",mode:"SOURCE_UNAVAILABLE",simulated:false},status,{"retry-after":"30"});
 }
}
if(path==="/api/company-os/evidence-gate"&&method==="POST"){
 if(!Bun.env.SIGNALFORGE_COMPANY_OS_KEY || !await safeToken(req))
  return json({error:"Company OS operator identity required"},401);
 if(!String(req.headers.get("content-type")||"").startsWith("application/json"))
  return json({error:"JSON required"},415);
 if(Number(req.headers.get("content-length")||0)>4096)
  return json({error:"Request too large"},413);
 const raw=await req.text();
 if(raw.length>4096)return json({error:"Request too large"},413);
 let evidence:any;
 try{evidence=JSON.parse(raw)}catch{return json({error:"Malformed JSON"},400)}
 return json(assessCompanyOutcome(evidence));
}
if(path==="/api/company-os/snapshot"&&method==="GET")return companySnapshot(req);
if(path==="/api/company-os/operations"&&method==="GET"){
 const snapshot=await companySnapshot(req);
 if(snapshot.status!==200)return snapshot; // same scoped workload auth & PII boundary
 try{return json(compileOperatingBoard(await snapshot.json()))}
 catch(error:any){
   console.error("Company OS aggregate gate rejected:",String(error?.message||"invalid").slice(0,100));
   return json({error:"Company operating board unavailable",state:"SOURCE_VALIDATION_FAILED"},503);
 }
}
if(path.startsWith("/api/community/"))return communityRoute(req,path,method,u);
 if(path==="/favicon.ico")return new Response("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\"><rect width=\"64\" height=\"64\" rx=\"16\" fill=\"#53e0c2\"/><path d=\"M16 43V21h7l9 13 9-13h7v22h-7V31l-9 12-9-12v12z\" fill=\"#07131d\"/></svg>",{headers:{"content-type":"image/svg+xml","cache-control":"public,max-age=86400"}});if(path==="/"||path==="/app"||path==="/index.html")return new Response(HTML,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-cache"}});
if(path.startsWith("/api/v1/")){if(method!=="GET")return json({error:"Read-only API. Use GET."},405);const key=await apiKeyFor(req);if(!key)return json({error:"Valid developer API key required. Send Authorization: Bearer sf_live_…"},401);if(key.rateLimited)return json({error:"API key rate limit exceeded. Limit: 120 requests per minute."},429);if(key.plan==="explorer")return json({error:"Developer API access requires Pro or Quant Desk."},403);if(path==="/api/v1/strategies")return json({strategies:STRATEGIES});if(path==="/api/v1/performance")return json({live:await metricsLive()});if(path==="/api/v1/market"||path==="/api/v1/signals"){const symbol=u.searchParams.get("symbol")||"BTCUSD",interval=Number(u.searchParams.get("interval")||60),p=await marketData(symbol,interval),x=indicators(p.candles),signals=STRATEGIES.map(s=>makeSignal(s,p.candles.length-1,p.candles,x));if(p.mode==="LIVE_PUBLIC_DATA")await persistSignals(symbol,interval,p.candles,signals,p.mode);return json({mode:p.mode,source:p.source,symbol,interval,candles:path.endsWith("/market")?p.candles:undefined,signals,summary:summarize(p.candles)})}return json({error:"API endpoint not found"},404)}
if(path.startsWith("/api/auth/")){if(rateLimit(req,14,"auth"))return json({error:"Too many authentication requests. Try again later."},429);if(!dbReady||!db)return json({error:"Account storage is initializing. Try again shortly."},503);const body=method==="POST"?await req.json().catch(()=>({})):{};if(path==="/api/auth/signup"&&method==="POST"){const email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<10||password.length>200)return json({error:"Enter a valid email and a password of at least 10 characters."},400);const consent=body.emailConsent===true,unsubscribeToken=crypto.randomUUID()+crypto.randomUUID(),hash=await Bun.password.hash(password),ref=String(body.referralCode||"").trim().toUpperCase(),source=String(body.marketingSource||"").slice(0,150),refRows=ref?await db.unsafe("SELECT id FROM users WHERE referral_code=$1 LIMIT 1",[ref]):[],code=crypto.randomUUID().replace(/-/g,"").slice(0,10).toUpperCase(),role=email===(Bun.env.SIGNALFORGE_ADMIN_EMAIL||"").trim().toLowerCase()?"admin":"user",ins=await db.unsafe("INSERT INTO users(email,password_hash,plan,role,trial_started_at,trial_ends_at,subscription_status,referral_code,referred_by,marketing_source,lifecycle_email_consent,lifecycle_consent_at,lifecycle_consent_ip,lifecycle_unsubscribe_token) VALUES($1,$2,'quant',$3,NOW(),NOW()+INTERVAL '30 days','trialing',$4,$5,$6,$7,CASE WHEN $7 THEN NOW() ELSE NULL END,$8,$9) ON CONFLICT(email) DO NOTHING RETURNING id,email,plan,role,trial_ends_at,subscription_status,referral_code",[email,hash,role,code,refRows[0]?.id||null,source,consent,req.headers.get("x-forwarded-for")?.split(",")[0]?.slice(0,80)||null,unsubscribeToken]);if(!ins.length)return json({error:"An account with this email already exists. Sign in instead."},409);await recordProductAction(ins[0].id,"account_created","signup:"+ins[0].id);await db.unsafe("INSERT INTO lifecycle_emails(user_id,email,template,scheduled_at) VALUES($1,$2,'welcome',NOW()) ON CONFLICT(user_id,template) DO NOTHING",[ins[0].id,email]);if(consent)await db.unsafe("INSERT INTO lifecycle_emails(user_id,email,template,scheduled_at) VALUES($1,$2,'day3',NOW()+INTERVAL '3 days'),($1,$2,'day7',NOW()+INTERVAL '7 days'),($1,$2,'day25',NOW()+INTERVAL '25 days') ON CONFLICT(user_id,template) DO NOTHING",[ins[0].id,email]);const token=crypto.randomUUID()+crypto.randomUUID();await db.unsafe("INSERT INTO user_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 days')",[await digest(token),ins[0].id]);return json({user:{...ins[0],trial_days_remaining:30},created:true,trial:{days:30,cardRequired:false},emailUpdates:consent},201,{"Set-Cookie":"sf_session="+token+"; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000"})}
if(path==="/api/auth/login"&&method==="POST"){const email=String(body.email||"").trim().toLowerCase(),rows=await db.unsafe("SELECT id,email,password_hash FROM users WHERE email=$1",[email]);if(!rows.length||!(await Bun.password.verify(String(body.password||""),rows[0].password_hash)))return json({error:"Email or password is incorrect."},401);const token=crypto.randomUUID()+crypto.randomUUID();await db.unsafe("INSERT INTO user_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 days')",[await digest(token),rows[0].id]);return json({user:await userFor(new Request("http://local",{headers:{cookie:"sf_session="+token}}))},200,{"Set-Cookie":"sf_session="+token+"; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000"})}
if(path==="/api/auth/me"&&method==="GET")return json({user:await userFor(req)});
if(path==="/api/auth/logout"&&method==="POST"){const raw=cookie(req,"sf_session");if(raw)await db.unsafe("DELETE FROM user_sessions WHERE token_hash=$1",[await digest(raw)]);return json({ok:true},200,{"Set-Cookie":"sf_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"})}}
if(path==="/api/strategies")return json({strategies:STRATEGIES,engine:"Explainable multi-factor confluence engine v2",caveat:"Confluence scores are not calibrated win probabilities."});
if(path==="/api/models")return json({models:modelList(),ensemble:"Walk-forward calibrated weighting; not active until model endpoints are configured.",routerReady:true});
if(path==="/api/market"){const symbol=u.searchParams.get("symbol")||"BTCUSD",interval=Number(u.searchParams.get("interval")||60),pack=await marketData(symbol,interval,u.searchParams.get("refresh")==="1"),c=pack.candles,x=indicators(c),signals=STRATEGIES.map(s=>makeSignal(s,c.length-1,c,x));if(pack.mode==="LIVE_PUBLIC_DATA")await persistSignals(symbol,interval,c,signals,pack.mode);const perf=await metricsLive();const overview=await Promise.all(Object.keys(MARKETS).map(async sym=>{const d=await marketData(sym,60),m=summarize(d.candles);return{symbol:sym,price:m.price,change24h:m.change24h,mode:d.mode}}));return json({...pack,summary:summarize(c),signals,overview,liveRecord:perf})}
if(path==="/api/signals"){const symbol=u.searchParams.get("symbol")||"BTCUSD",interval=Number(u.searchParams.get("interval")||60),p=await marketData(symbol,interval),x=indicators(p.candles),signals=STRATEGIES.map(s=>makeSignal(s,p.candles.length-1,p.candles,x));if(p.mode==="LIVE_PUBLIC_DATA")await persistSignals(symbol,interval,p.candles,signals,p.mode);return json({...p,signals})}
if(path==="/api/scanner"){const interval=Number(u.searchParams.get("interval")||60),items:any[]=[];for(const symbol of Object.keys(MARKETS)){const p=await marketData(symbol,interval),x=indicators(p.candles),signals=STRATEGIES.map(s=>makeSignal(s,p.candles.length-1,p.candles,x));if(p.mode==="LIVE_PUBLIC_DATA")await persistSignals(symbol,interval,p.candles,signals,p.mode);for(const s of signals)items.push({...s,symbol,mode:p.mode})}items.sort((a,b)=>b.score-a.score);return json({items,mode:items.every(x=>x.mode==="LIVE_PUBLIC_DATA")?"LIVE_PUBLIC_DATA":"MIXED_OR_DEMO",count:items.length,scannedAt:new Date().toISOString()})}
if(path==="/api/backtest"){const symbol=u.searchParams.get("symbol")||"BTCUSD",interval=Number(u.searchParams.get("interval")||60),strategy=u.searchParams.get("strategy")||"all";const result=await backtestResponse(symbol,interval,strategy);const viewer=await userFor(req);if(viewer)await recordProductAction(viewer.id,"research_backtest","backtest:"+viewer.id+":"+symbol+":"+interval+":"+strategy+":"+Math.floor(Date.now()/86400000));return json(result)}
if(path==="/api/performance"){const live=await metricsLive();let recent:any[]=[];if(dbReady&&db){recent=await db.unsafe("SELECT symbol,strategy_name AS strategy,direction,entry,exit_price AS \"exitPrice\",outcome,pnl_pct AS \"pnlPct\",created_at AS \"createdAt\" FROM signal_events WHERE status='CLOSED' ORDER BY closed_at DESC LIMIT 50")}return json({live,recent,recordStatus:live.closedCount>=30?"LIVE_SAMPLE_30_PLUS":live.closedCount>=12?"LIVE_LOW_SAMPLE":"BUILDING_LIVE_RECORD",source:"Timestamped public-market signals; fees and slippage included."})}
if(path==="/api/referral"&&method==="GET"){const u=await userFor(req);if(!u)return json({error:"Sign in first."},401);const n=await db.unsafe("SELECT COUNT(*)::int AS count FROM users WHERE referred_by=$1",[u.id]);return json({code:u.referral_code,referrals:n[0]?.count||0,url:BASE_URL+"/?ref="+encodeURIComponent(u.referral_code||"")})}
if(path==="/admin/revenue"||path==="/api/admin/revenue"){
 if(method!=="GET")return json({error:"Method not allowed"},405);
 if(!dbReady||!db)return json({error:"Revenue evidence storage unavailable"},503);
 const admin=await userFor(req);
 if(!admin||admin.role!=="admin")return json({error:"Admin access required"},403);
 if(path==="/admin/revenue")return new Response(REVENUE_CONTROL_HTML,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"private,no-store","x-robots-tag":"noindex,nofollow","x-content-type-options":"nosniff"}});
 return json(await getRevenueSnapshot(db));
}
if(path==="/api/admin/overview"&&method==="GET"){const u=await userFor(req);if(!u||u.role!=="admin")return json({error:"Admin access required."},403);const [a,l,e,r,c]=await Promise.all([db.unsafe("SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE subscription_status='trialing' AND trial_ends_at>NOW())::int AS active_trials,COUNT(*) FILTER(WHERE subscription_status IN ('active','past_due'))::int AS paid,COUNT(*) FILTER(WHERE created_at>NOW()-INTERVAL '7 days')::int AS signups_7d FROM users"),db.unsafe("SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE created_at>NOW()-INTERVAL '7 days')::int AS new_7d FROM growth_leads"),db.unsafe("SELECT event_name,COUNT(*)::int AS count FROM product_events WHERE created_at>NOW()-INTERVAL '7 days' GROUP BY event_name ORDER BY count DESC"),db.unsafe("SELECT COUNT(*)::int AS referred_signups FROM users WHERE referred_by IS NOT NULL"),db.unsafe("SELECT template,status,COUNT(*)::int AS count FROM lifecycle_emails GROUP BY template,status ORDER BY template,status")]);return json({users:a[0],leads:l[0],events:e,referrals:r[0],lifecycle:c})}
if(path==="/api/watchlist"){const user=await userFor(req);if(!user)return json({error:"Sign in to use a persistent watchlist."},401);if(method==="GET"){const rows=await db.unsafe("SELECT symbol,created_at FROM watchlists WHERE user_id=$1 ORDER BY created_at DESC",[user.id]);return json({items:rows})}if(method==="POST"){const b=await req.json().catch(()=>({})),symbol=String(b.symbol||"");if(!MARKETS[symbol])return json({error:"Unsupported market."},400);const added=await db.unsafe("INSERT INTO watchlists(user_id,symbol) VALUES($1,$2) ON CONFLICT(user_id,symbol) DO NOTHING RETURNING symbol",[user.id,symbol]);if(added.length)await recordProductAction(user.id,"watchlist_added","watchlist:"+user.id+":"+symbol);return json({ok:true})}}
if(path==="/api/alerts"){const user=await userFor(req);if(!user)return json({error:"Sign in to manage alerts."},401);if(method==="GET")return json({items:await db.unsafe("SELECT id,symbol,strategy_id AS \"strategyId\",min_score AS \"minScore\",active,created_at AS \"createdAt\" FROM user_alerts WHERE user_id=$1 ORDER BY id DESC",[user.id])});if(method==="POST"){const b=await req.json().catch(()=>({})),symbol=String(b.symbol||""),min=clamp(Number(b.minScore||75),50,100);if(!MARKETS[symbol])return json({error:"Unsupported market."},400);const row=await db.unsafe("INSERT INTO user_alerts(user_id,symbol,strategy_id,min_score) VALUES($1,$2,$3,$4) RETURNING id",[user.id,symbol,b.strategyId||null,min]);return json({ok:true,id:row[0].id},201)}}
if(path==="/api/api-keys"&&method==="POST"){const user=await userFor(req);if(!user)return json({error:"Sign in to request an API key."},401);if(user.plan==="explorer")return json({error:"Developer API access is part of paid plans. Request Quant Desk access."},403);const raw="sf_live_"+crypto.randomUUID().replace(/-/g,"")+crypto.randomUUID().replace(/-/g,"").slice(0,12);await db.unsafe("INSERT INTO api_keys(user_id,key_hash,key_prefix,label) VALUES($1,$2,$3,'Default')",[user.id,await digest(raw),raw.slice(0,15)]);return json({apiKey:raw,warning:"Copy this key now. It will not be shown again."},201)}
if(path==="/api/engagement"){
 if(method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
 if(!dbReady||!db)return json({error:"ACCOUNT_STORAGE_UNAVAILABLE"},503);
 if(!communityOrigin(req))return json({error:"INVALID_ORIGIN"},403);
 if(rateLimit(req,24,"engagement"))return json({error:"RATE_LIMITED"},429);
 if(Number(req.headers.get("content-length")||0)>2048)return json({error:"BODY_TOO_LARGE"},413);
 const viewer=await userFor(req);
 if(!viewer)return json({error:"SIGN_IN_REQUIRED"},401);
 const body=await req.json().catch(()=>({}));
 const action=String(body?.action||"");
 if(!["pricing_view","report_share_clicked"].includes(action))return json({error:"INVALID_ACTION"},400);
 const mint=String(body?.address||"");
 if(action==="report_share_clicked"&&!validSolanaAddress(mint))return json({error:"INVALID_SOLANA_ADDRESS"},400);
 const today=new Date().toISOString().slice(0,10);
 const key="engagement:"+viewer.id+":"+action+":"+(action==="report_share_clicked"?mint:"pricing")+":"+today;
 await recordProductAction(viewer.id,action,key);
 return json({ok:true,action,source:"AUTHENTICATED_SERVER_OBSERVED_INTERACTION",note:action==="report_share_clicked"?"Share button clicked; external posting cannot be verified.":undefined});
}
if(path==="/api/checkout"&&method==="POST"){if(!communityOrigin(req))return json({error:"INVALID_ORIGIN"},403);const user=await userFor(req);if(!user)return json({error:"Create an account before checkout."},401);const b=await req.json().catch(()=>({}));return stripeCheckout(user,String(b.plan||"pro"),String(b.period||"month"))}
if(path==="/api/model-forecast"&&method==="POST"){const b=await req.json().catch(()=>({})),model=MODELS.find(x=>x[0].toLowerCase()===String(b.model||"").toLowerCase());if(!model)return json({error:"Unknown model."},400);const endpoint=Bun.env[model[3]];if(!endpoint)return json({error:model[0]+" endpoint is not configured.",status:"NOT_CONNECTED"},503);const symbol=String(b.symbol||"BTCUSD"),interval=Number(b.interval||60),pack=await marketData(symbol,interval);const r=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","authorization":Bun.env[model[3].replace("_URL","_TOKEN")]?"Bearer "+Bun.env[model[3].replace("_URL","_TOKEN")]:""},body:JSON.stringify({symbol,interval,candles:pack.candles.slice(-256)}),signal:AbortSignal.timeout(15000)});if(!r.ok)return json({error:"Model endpoint returned HTTP "+r.status},502);return json({model:model[0],result:await r.json(),source:"Configured external inference endpoint"})}
return json({error:"Not found"},404)}
async function start(){try{await initDb();console.log("Database schema ready")}catch(e:any){console.error("Database initialization failed",e?.message||e);dbReady=false}Bun.serve({port:PORT,fetch:async(req)=>{try{if(req.method==="POST"&&rateLimit(req,90))return json({error:"Rate limit exceeded."},429);return await handler(req)}catch(e:any){console.error("Request error",e?.stack||e);return json({error:"Request failed",detail:Bun.env.NODE_ENV==="development"?e?.message:undefined},500)}}});console.log("SIGNALFORGE v0.4.0 listening on "+PORT);try{const email="sf-selftest-"+Date.now()+"@signalforge.invalid",signup=await handler(new Request("http://local/api/auth/signup",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password:"SignalForge#LaunchTest2026",marketingSource:"production_selftest",emailConsent:true})})),j:any=await signup.json(),raw=signup.headers.get("set-cookie")||"",ck=raw.split(";")[0],ref=await handler(new Request("http://local/api/referral",{headers:{cookie:ck}})),trial=await handler(new Request("http://local/api/auth/me",{headers:{cookie:ck}})),checkout=await handler(new Request("http://local/api/checkout",{method:"POST",headers:{cookie:ck,"content-type":"application/json"},body:JSON.stringify({plan:"pro",period:"month"})})),bj:any=await checkout.json(),me:any=await trial.json();const lifecycle=j.user?.id?await db.unsafe("SELECT template FROM lifecycle_emails WHERE user_id=$1 ORDER BY template",[j.user.id]):[];console.log("SELFTEST lifecycle-queue",lifecycle.length,lifecycle.map((x:any)=>x.template).join(","),j.user?.id?"consent accepted":"no user");if(j.user?.id)await db.unsafe("DELETE FROM users WHERE id=$1",[j.user.id]);console.log("SELFTEST launch-trial",signup.status,me.user?.subscription_status,me.user?.trial_days_remaining,ref.status,checkout.status,bj.saved===true,"no charge; temporary user purged")}catch(e:any){console.error("SELFTEST launch-trial failed",e?.message||e)}}

start();