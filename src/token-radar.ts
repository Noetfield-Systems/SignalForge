// M20 Token Radar: source-attributed Solana research, not an execution or advice service.
// Existing SignalForge PostgreSQL and Company OS workload authority are reused.
type SQL = { unsafe:(query:string, params?:any[])=>Promise<any[]> };
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DEX = "https://api.dexscreener.com";
const RPC = "https://api.mainnet-beta.solana.com";
const TOKEN_PROGRAMS = new Set(["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","TokenzQdBNbLqP5VEhdkAS6EPF9a2V9zAexdq3iP"]);
const memory = new Map<string,{time:number,value:any}>();
const queries = new Map<string,{at:number,count:number}>();
const send = (value:any, status=200)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const numeric=(v:any):number|null=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
export function validSolanaMint(input:string):boolean {
  if(typeof input!=="string"||input.length<32||input.length>44)return false;
  let n=0n;
  for(const c of input){const i=BASE58.indexOf(c);if(i<0)return false;n=n*58n+BigInt(i)}
  let bytes=0;while(n>0n){n>>=8n;bytes++}
  return bytes+((input.match(/^1+/)||[""])[0].length)===32;
}
async function getJson(url:string,options:RequestInit={}):Promise<any>{
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(6500),headers:{"accept":"application/json",...(options.headers||{})}});
  if(!response.ok)throw new Error("HTTP "+response.status);
  return response.json();
}
async function chainMint(mint:string){
  const base={jsonrpc:"2.0",id:1,method:"getAccountInfo",params:[mint,{encoding:"base64",commitment:"confirmed"}]};
  try{
    const [account,supply]=await Promise.allSettled([
      getJson(RPC,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(base)}),
      getJson(RPC,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...base,id:2,method:"getTokenSupply",params:[mint]})})
    ]);
    const owner=account.status==="fulfilled"?account.value?.result?.value?.owner:null;
    const validOwner=TOKEN_PROGRAMS.has(owner);
    const supplyObj=supply.status==="fulfilled"?supply.value?.result?.value:null;
    return {status:account.status!=="fulfilled"?"unavailable":!account.value?.result?.value?"account_not_found":validOwner?"token_program_account":"non_token_account",owner:owner||null,verifiedTokenProgram:validOwner,decimals:validOwner&&supplyObj?numeric(supplyObj.decimals):null,supply:validOwner&&supplyObj?.uiAmountString!=null?String(supplyObj.uiAmountString):null,source:RPC,explorer:"https://solscan.io/token/"+mint,observation:"confirmed_rpc_read"};
  }catch{return {status:"unavailable",verifiedTokenProgram:false,owner:null,decimals:null,supply:null,source:RPC,explorer:"https://solscan.io/token/"+mint}}
}
export async function tokenResearch(mint:string){
  if(!validSolanaMint(mint))throw new Error("Invalid Solana mint address (32 decoded bytes required).");
  const cached=memory.get(mint),now=Date.now();if(cached&&now-cached.time<60000)return cached.value;
  const [dex,chain]=await Promise.allSettled([
    getJson(DEX+"/token-pairs/v1/solana/"+encodeURIComponent(mint)),
    chainMint(mint)
  ]);
  const candidate=dex.status==="fulfilled"&&Array.isArray(dex.value)?dex.value:[];
  const pairs=candidate.filter((p:any)=>p?.chainId==="solana"&&(p?.baseToken?.address===mint||p?.quoteToken?.address===mint)).sort((a:any,b:any)=>(numeric(b?.liquidity?.usd)||0)-(numeric(a?.liquidity?.usd)||0)).slice(0,12);
  const primary=pairs[0]||null,listed=primary?.baseToken?.address===mint?primary?.baseToken:primary?.quoteToken?.address===mint?primary?.quoteToken:null;
  const pools=pairs.map((p:any)=>({pairAddress:String(p.pairAddress||""),dex:String(p.dexId||""),url:typeof p.url==="string"&&p.url.startsWith("https://dexscreener.com/")?p.url:null,liquidityUsd:numeric(p.liquidity?.usd),volume24hUsd:numeric(p.volume?.h24),priceUsd:numeric(p.priceUsd),createdAt:p.pairCreatedAt?new Date(p.pairCreatedAt).toISOString():null}));
  const chainData=chain.status==="fulfilled"?chain.value:{status:"unavailable",verifiedTokenProgram:false,source:RPC,explorer:"https://solscan.io/token/"+mint};
  const result={schemaVersion:"1.0.0",chain:"solana",mint,observedAt:new Date().toISOString(),status:dex.status==="rejected"?"source_unavailable":!pairs.length?"no_indexed_pools":chainData.verifiedTokenProgram?"source_reported":"partial_unverified_mint",
    token:{name:listed?.name||null,symbol:listed?.symbol||null,address:mint,source:"DEX Screener indexed pool metadata (not token issuer verification)"},
    market:{poolCount:pairs.length,primaryPool:primary?.pairAddress||null,priceUsd:primary?numeric(primary.priceUsd):null,liquidityUsd:primary?numeric(primary.liquidity?.usd):null,volume24hUsd:primary?numeric(primary.volume?.h24):null,marketCapUsd:primary?numeric(primary.marketCap):null,fdvUsd:primary?numeric(primary.fdv):null,change24hPct:primary?.priceChange?.h24==null?null:Number(primary.priceChange.h24),pools},
    onchain:chainData,sources:[{name:"DEX Screener token pools",url:DEX+"/token-pairs/v1/solana/"+mint,kind:"market"},{name:"Solana public RPC",url:RPC,kind:"chain"},{name:"Solscan explorer",url:"https://solscan.io/token/"+mint,kind:"explorer"}],
    uncertainty:["DEX liquidity and volume are third-party observations, not independently audited.","No pool data does not establish that a token is nonexistent.","RPC verification can be unavailable or rate-limited; null means unknown, not zero."],
    researchOnly:true,executionAvailable:false};
  if(memory.size>400)memory.clear();memory.set(mint,{time:now,value:result});return result;
}
export async function initRadar(db:SQL){
  await db.unsafe("CREATE TABLE IF NOT EXISTS token_research_snapshots (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), mint TEXT NOT NULL, observation JSONB NOT NULL, observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await db.unsafe("CREATE INDEX IF NOT EXISTS token_research_recent_idx ON token_research_snapshots(mint,observed_at DESC)");
  await db.unsafe("CREATE TABLE IF NOT EXISTS token_watches (user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, mint TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,mint))");
  await db.unsafe("CREATE TABLE IF NOT EXISTS token_watch_events (id BIGSERIAL PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, mint TEXT NOT NULL, snapshot_id UUID NOT NULL REFERENCES token_research_snapshots(id), event_key TEXT NOT NULL UNIQUE, event_type TEXT NOT NULL, detail JSONB NOT NULL, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await db.unsafe("CREATE INDEX IF NOT EXISTS token_watch_events_user_idx ON token_watch_events(user_id,created_at DESC)");
}
function changes(a:any,b:any){
  const events:any[]=[];
  for(const [field,threshold,label] of [["priceUsd",0.05,"PRICE_MOVE"],["liquidityUsd",0.10,"LIQUIDITY_MOVE"],["volume24hUsd",0.25,"VOLUME_MOVE"]] as const){
    const old=a?.market?.[field],next=b?.market?.[field];
    if(typeof old!=="number"||typeof next!=="number"||old<=0||!Number.isFinite(next))continue;
    const delta=(next-old)/old;if(Math.abs(delta)>=threshold)events.push({type:label,previous:old,current:next,changePct:Number((delta*100).toFixed(2))});
  }
  return events;
}
async function store(db:SQL,research:any){
  if(research.status==="source_unavailable"||research.status==="no_indexed_pools")return null;
  const previous=await db.unsafe("SELECT id,observation,observed_at FROM token_research_snapshots WHERE mint=$1 ORDER BY observed_at DESC LIMIT 1",[research.mint]);
  if(previous[0]&&Date.now()-new Date(previous[0].observed_at).getTime()<120000)return previous[0].id;
  const rows=await db.unsafe("INSERT INTO token_research_snapshots(mint,observation) VALUES($1,$2::jsonb) RETURNING id",[research.mint,JSON.stringify(research)]);
  const alerts=previous[0]?changes(previous[0].observation,research):[];
  if(alerts.length){
    const watchers=await db.unsafe("SELECT w.user_id FROM token_watches w JOIN users u ON u.id=w.user_id WHERE w.mint=$1 AND u.billing_risk_status='clear' AND (u.subscription_status='active' OR (u.subscription_status='trialing' AND u.trial_ends_at>NOW())) LIMIT 1000",[research.mint]);
    for(const watcher of watchers)for(const alert of alerts)await db.unsafe("INSERT INTO token_watch_events(user_id,mint,snapshot_id,event_key,event_type,detail) VALUES($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT(event_key) DO NOTHING",[watcher.user_id,research.mint,rows[0].id,watcher.user_id+":"+rows[0].id+":"+alert.type,alert.type,JSON.stringify(alert)]);
  }
  return rows[0].id;
}
export async function handleRadar(req:Request,db:SQL|null,user:any,companyTokenValid=false):Promise<Response>{
  const url=new URL(req.url),path=url.pathname,method=req.method;
  if(path==="/api/token-radar/refresh"&&method==="POST"){
    if(!companyTokenValid)return send({error:"Workload authorization required"},401);
    if(!db)return send({error:"Database not ready"},503);
    const watched=await db.unsafe("SELECT DISTINCT w.mint FROM token_watches w JOIN users u ON u.id=w.user_id WHERE u.billing_risk_status='clear' AND (u.subscription_status='active' OR (u.subscription_status='trialing' AND u.trial_ends_at>NOW())) ORDER BY w.mint LIMIT 20");
    let completed=0,failed=0;for(const item of watched){try{await store(db,await tokenResearch(item.mint));completed++}catch{failed++}}
    return send({ok:true,checked:completed,failed,eligibleMints:watched.length,source:"DEX Screener and Solana RPC",mode:"bounded_existing_worker_tick"});
  }
  const match=/^\/api\/token-radar\/([1-9A-HJ-NP-Za-km-z]{32,44})$/.exec(path);
  if(match&&method==="GET"){
    const ip=(req.headers.get("x-forwarded-for")||"unknown").split(",")[0],stamp=Date.now(),r=queries.get(ip)||{at:stamp,count:0};
    if(stamp-r.at>60000){r.at=stamp;r.count=0}if(++r.count>20)return send({error:"Please retry after one minute."},429);
    if(queries.size>2000)queries.clear();queries.set(ip,r);
    const mint=match[1];if(!validSolanaMint(mint))return send({error:"Invalid Solana mint address"},400);
    const report=await tokenResearch(mint);let snapshotId=null;
    if(db)try{snapshotId=await store(db,report)}catch(e:any){console.error("radar snapshot write failed",e?.message||"unknown")}
    return send({...report,snapshotId,persistence:snapshotId?"saved":"not_saved"});
  }
  const history=/^\/api\/token-radar\/snapshots\/([1-9A-HJ-NP-Za-km-z]{32,44})$/.exec(path);
  if(history&&method==="GET"){if(!validSolanaMint(history[1]))return send({error:"Invalid mint"},400);if(!db)return send({error:"Database unavailable"},503);
    const rows=await db.unsafe("SELECT id,observed_at,observation->'market' AS market,observation->>'status' AS status FROM token_research_snapshots WHERE mint=$1 ORDER BY observed_at DESC LIMIT 20",[history[1]]);return send({items:rows,mint:history[1]});
  }
  if(path==="/api/token-radar/watchlist"){
    if(!user)return send({error:"Sign in to save and monitor tokens"},401);if(!db)return send({error:"Database unavailable"},503);
    if(method==="GET"){const rows=await db.unsafe("SELECT w.mint,w.created_at,s.observed_at AS last_observed_at,s.observation->'token' AS token FROM token_watches w LEFT JOIN LATERAL (SELECT observed_at,observation FROM token_research_snapshots WHERE mint=w.mint ORDER BY observed_at DESC LIMIT 1) s ON true WHERE w.user_id=$1 ORDER BY w.created_at DESC",[user.id]);return send({items:rows})}
    if(method==="POST"||method==="DELETE"){
      const body=await req.json().catch(()=>({})),mint=String(body.mint||"").trim();if(!validSolanaMint(mint))return send({error:"Valid Solana mint address required"},400);
      if(method==="DELETE"){await db.unsafe("DELETE FROM token_watches WHERE user_id=$1 AND mint=$2",[user.id,mint]);return send({ok:true})}
      const tier=user.plan==="explorer"?3:30;
      const inserted=await db.unsafe("INSERT INTO token_watches(user_id,mint) SELECT $1,$2 WHERE (SELECT COUNT(*) FROM token_watches WHERE user_id=$1)<$3 ON CONFLICT(user_id,mint) DO NOTHING RETURNING mint",[user.id,mint,tier]);
      if(!inserted.length){const present=await db.unsafe("SELECT 1 FROM token_watches WHERE user_id=$1 AND mint=$2",[user.id,mint]);if(!present.length)return send({error:"Watchlist limit reached for your current entitlement",limit:tier},403)}
      if(inserted.length)await db.unsafe("INSERT INTO product_events(user_id,event_name,source,event_key) VALUES($1,'token_watch_added','server_observed',$2) ON CONFLICT DO NOTHING",[user.id,"token-watch:"+user.id+":"+mint]);
      return send({ok:true,mint,limit:tier},inserted.length?201:200);
    }
    return send({error:"Method not allowed"},405);
  }
  if(path==="/api/token-radar/alerts"&&method==="GET"){
    if(!user)return send({error:"Sign in to view monitoring history"},401);if(!db)return send({error:"Database unavailable"},503);
    const rows=await db.unsafe("SELECT id,mint,event_type AS type,detail,created_at AS observed_at,read_at FROM token_watch_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 60",[user.id]);return send({items:rows,delivery:"in_app_history",externalDeliveryConfigured:false});
  }
  return send({error:"Token Radar route not found"},404);
}
