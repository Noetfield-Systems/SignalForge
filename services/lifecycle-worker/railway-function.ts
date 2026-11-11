import postgres from "postgres";
const url=Bun.env.DATABASE_URL||"";
if(!url)throw new Error("DATABASE_URL is required");
const db=postgres(url,{max:4,idle_timeout:10,connect_timeout:12,ssl:Bun.env.NODE_ENV==="test"&&Bun.env.DATABASE_SSL==="disable"?false:"require"});
const apiKey=Bun.env.RESEND_API_KEY||"",from=Bun.env.RESEND_FROM||"";
console.log("LIFECYCLE_ENV_CHECK",JSON.stringify({databaseConfigured:!!url,resendKeyConfigured:!!apiKey,senderConfigured:!!from}));
const app="https://signalforge-web-production.up.railway.app";
const growth="https://signalforge-growth-assets-production.up.railway.app";
const link=(href:string,label:string)=>"<a href=\""+href+"\" style=\"display:inline-block;padding:12px 18px;background:#53e0c2;color:#071811;text-decoration:none;border-radius:8px;font-weight:700\">"+label+"</a>";
function emailFor(row:any,activity:any,token:string){
 const unsub=growth+"/unsubscribe?token="+encodeURIComponent(token||"");
 const footer=row.template==="welcome"?"<p style='color:#8495a8;font-size:12px'>You are receiving this essential account message because you created a SIGNALFORGE account.</p>":"<p style='color:#8495a8;font-size:12px'>You received this product email because you opted in during registration. <a style='color:#53e0c2' href=\""+unsub+"\">Unsubscribe</a>.</p>";
 let subject="",heading="",body="";
 if(row.template==="welcome"){
  subject="Welcome to SIGNALFORGE — your 30-day trial starts now";
  heading="Your research workspace is ready.";
  body="<p>Your 30-day full-access trial has started. You do not need to add a payment method, and the trial will not automatically charge you when it ends.</p><h3 style='color:#eaf1f7'>Start with one useful action</h3><ol><li>Open a market and inspect its structure.</li><li>Run the Opportunity Scanner.</li><li>Open a strategy and test its historical assumptions.</li></ol><p>Signal scores are technical confluence, not win probabilities. Backtests are simulations, not live performance.</p>"+link(app,"Open SIGNALFORGE");
 }else if(row.template==="day3"){
  subject="Your first SIGNALFORGE workflow";
  heading=activity.market>0?"Build on your first market review.":"Let’s get your first market review done.";
  body="<p>Three days into your trial, the best way to evaluate SIGNALFORGE is to complete a small research workflow.</p><p>"+(activity.market>0?"You have opened a market. Next, compare the active strategy signals and inspect their invalidation levels.":"Choose BTC/USD or ETH/USD and review the chart, timeframe and market regime.")+"</p><p>"+(activity.scanner>0?"You have run the scanner. Open one result and inspect the reasoning behind its score.":"Run the Opportunity Scanner to compare setups across the supported crypto markets.")+"</p><p>"+(activity.backtest>0?"You have also used the Backtest Lab. Compare the assumptions and drawdown—not just the headline return.":"Then run one backtest to understand how a strategy behaved historically. Historical results are not a promise of future returns.")+"</p>"+link(app,"Continue your research");
 }else if(row.template==="day7"){
  subject="One week in: make SIGNALFORGE part of your research routine";
  heading="Turn a single visit into a repeatable research routine.";
  body="<p>You are one week into your 30-day trial. Your activity so far: <strong>"+activity.market+"</strong> market views, <strong>"+activity.scanner+"</strong> scanner runs and <strong>"+activity.backtest+"</strong> backtests.</p><p>Try a repeatable 10-minute routine: review the market regime, scan for high-confluence setups, inspect entry and invalidation levels, then compare one strategy in the Backtest Lab.</p><p>Save the markets you follow so your next session starts with the assets you care about. Treat the score as confluence—not a probability or a performance guarantee.</p>"+link(app,"Return to your workspace");
 }else{
  subject="Five days left in your SIGNALFORGE trial";
  heading="Your trial ends in five days.";
  body="<p>Your 30-day full-access trial is scheduled to end on <strong>"+new Date(row.trial_ends_at).toLocaleDateString("en-CA",{month:"long",day:"numeric",year:"numeric",timeZone:"UTC"})+"</strong>.</p><p><strong>No automatic charge will occur.</strong> If you do not subscribe, your account will move to the free Explorer tier. You can choose Pro Research or Quant Desk if you want to keep the corresponding paid features.</p><p>Review the plans before your trial ends. You can also take no action and remain on Explorer.</p>"+link(app,"Review plans and access");
 }
 const html="<div style='background:#090d15;padding:32px 14px;font-family:Arial,sans-serif;color:#eef4fa'><div style='max-width:620px;margin:auto;background:#101722;border:1px solid #263647;border-radius:14px;padding:28px'><div style='font-size:12px;letter-spacing:3px;color:#53e0c2;font-weight:700'>SIGNALFORGE · MARKET INTELLIGENCE</div><h1 style='font-size:25px;line-height:1.25'>"+heading+"</h1><div style='font-size:15px;line-height:1.7;color:#c2cfdb'>"+body+"</div><hr style='border:0;border-top:1px solid #263647;margin:26px 0'><p style='font-size:12px;color:#8495a8'>Research only. Signals are not win probabilities, backtests are historical simulations, and SIGNALFORGE does not execute trades.</p>"+footer+"</div></div>";
 return {subject,html,text:heading+"\n\n"+body.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim()+"\n\n"+(row.template==="welcome"?"Essential account message.":"Unsubscribe: "+unsub)};
}
// Monitor only opted-in Solana mints using the EXISTING 5-minute Railway lifecycle cron.
// No additional worker, database, service key, market simulation or outbound notification.
async function refreshTokenWatchlist(){
 let due:any[]=[];
 try{
  due=await db.unsafe("SELECT w.address,MAX(o.last_seen_at) AS last_seen FROM token_watchlist_items w LEFT JOIN token_observations o ON o.chain_id=w.chain_id AND o.address=w.address WHERE w.chain_id='solana' AND w.in_app_alerts=TRUE GROUP BY w.address HAVING MAX(o.last_seen_at) IS NULL OR MAX(o.last_seen_at)<NOW()-INTERVAL '4 minutes' ORDER BY MAX(o.last_seen_at) NULLS FIRST LIMIT 10");
 }catch(error:any){
  console.error("RADAR_MONITOR_QUERY_UNAVAILABLE",String(error?.message||error).slice(0,160));
  return;
 }
 let scanned=0,observed=0,failed=0;
 for(const row of due){
  const mint=String(row.address||"");
  if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)){failed++;continue}
  scanned++;
  try{
   const endpoint=app+"/api/tokens/lookup?chain=solana&address="+encodeURIComponent(mint);
   const response=await fetch(endpoint,{headers:{"accept":"application/json"},signal:AbortSignal.timeout(9000)});
   if(!response.ok){failed++;console.error("RADAR_MONITOR_FETCH_FAILED",response.status);continue}
   const report:any=await response.json();
   if(report.chainId==="solana"&&report.address===mint&&report.source?.name==="DEX Screener"&&report.observationState!=="PERSISTENCE_UNAVAILABLE")observed++;
   else failed++;
  }catch(error:any){failed++;console.error("RADAR_MONITOR_SOURCE_UNAVAILABLE",String(error?.message||error).slice(0,100))}
 }
 console.log("RADAR_MONITOR_DONE",JSON.stringify({queued:due.length,scanned,sourceBackedObservations:observed,failed,mode:"IN_APP_ONLY",noSyntheticEvents:true}));
}

// Premium, explicitly opted-in source-observed digest.
// Uses the EXISTING lifecycle cron, existing Resend sender and database.
// Provider acceptance is not inbox delivery. No email without a genuine
// source-observed change, a saved monitored token and eligible membership.
async function deliverTokenDigests(){
 const hour=Bun.env.NODE_ENV==="test"&&Bun.env.TOKEN_DIGEST_TEST_FORCE_HOUR==="16"
   ?16:new Date().getUTCHours();
 if(hour<16){console.log("TOKEN_DIGEST_WAIT_WINDOW",hour);return}
 const eligible="u.billing_risk_status='clear' AND (u.subscription_status='active' AND u.plan IN ('pro','quant') OR u.subscription_status='trialing' AND u.trial_ends_at>NOW())";
 const synthetic="u.role='user' AND u.email NOT LIKE '%@signalforge.test' AND u.email NOT LIKE '%@example.com' AND u.email NOT LIKE '%@signalforge.invalid'";
 const pending=await db.unsafe("INSERT INTO token_digest_deliveries(user_id,digest_date) "+
   "SELECT p.user_id,(NOW() AT TIME ZONE 'UTC')::date FROM token_digest_preferences p "+
   "JOIN users u ON u.id=p.user_id WHERE p.enabled=TRUE AND p.opted_in_at IS NOT NULL AND "+
   eligible+" AND "+synthetic+" AND EXISTS ("+
   "SELECT 1 FROM token_alert_events a JOIN token_change_events c ON c.id=a.change_event_id "+
   "JOIN token_watchlist_items w ON w.user_id=a.user_id AND w.chain_id=c.chain_id AND w.address=c.address AND w.in_app_alerts=TRUE "+
   "WHERE a.user_id=p.user_id AND a.created_at>NOW()-INTERVAL '24 hours' AND a.created_at>=p.opted_in_at) "+
   "ON CONFLICT(user_id,digest_date) DO NOTHING RETURNING id");
 const claim=await db.begin(async tx=>{
   const rows=await tx.unsafe("SELECT d.id::text AS id,d.user_id,d.attempts,u.email,u.lifecycle_unsubscribe_token FROM token_digest_deliveries d "+
    "JOIN token_digest_preferences p ON p.user_id=d.user_id JOIN users u ON u.id=d.user_id "+
    "WHERE d.status='pending' AND d.scheduled_at<=NOW() AND p.enabled=TRUE AND "+
    eligible+" AND "+synthetic+" ORDER BY d.scheduled_at,d.id FOR UPDATE OF d SKIP LOCKED LIMIT 12");
   if(rows.length)await tx.unsafe("UPDATE token_digest_deliveries SET status='sending',updated_at=NOW() WHERE id=ANY($1::bigint[])",[rows.map(x=>x.id)]);
   return rows;
 });
 let accepted=0,skipped=0,failed=0;
 for(const row of claim){
   try{
    const fresh=await db.unsafe("SELECT p.enabled,u.billing_risk_status,u.subscription_status,u.trial_ends_at,u.plan FROM token_digest_preferences p JOIN users u ON u.id=p.user_id WHERE p.user_id=$1",[row.user_id]);
    const q=fresh[0],canSend=q?.enabled===true&&q.billing_risk_status==="clear"&&
      (q.subscription_status==="active"&&["pro","quant"].includes(q.plan)||
       q.subscription_status==="trialing"&&new Date(q.trial_ends_at).getTime()>Date.now());
    if(!canSend){
     await db.unsafe("UPDATE token_digest_deliveries SET status='cancelled',updated_at=NOW(),last_error='Not opted in or not eligible' WHERE id=$1",[row.id]);skipped++;continue;
    }
    const events=await db.unsafe("SELECT c.address,c.event_type,c.delta_pct,a.created_at FROM token_alert_events a "+
      "JOIN token_change_events c ON c.id=a.change_event_id "+
      "JOIN token_watchlist_items w ON w.user_id=a.user_id AND w.chain_id=c.chain_id AND w.address=c.address AND w.in_app_alerts=TRUE "+
      "JOIN token_digest_preferences p ON p.user_id=a.user_id "+
      "WHERE a.user_id=$1 AND a.created_at>NOW()-INTERVAL '24 hours' AND a.created_at>=p.opted_in_at ORDER BY a.id DESC LIMIT 12",[row.user_id]);
    const usable=events.filter(x=>/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(x.address)));
    if(!usable.length){
     await db.unsafe("UPDATE token_digest_deliveries SET status='cancelled',updated_at=NOW(),last_error='No recent sourced alerts on monitored tokens' WHERE id=$1",[row.id]);skipped++;continue;
    }
    const unsubscribe=app+"/digest/unsubscribe?token="+encodeURIComponent(String(row.lifecycle_unsubscribe_token||""));
    const itemHtml=usable.map(x=>{
      const address=String(x.address);
      const eventType=String(x.event_type||"OBSERVATION").replace(/[^A-Z_]/g,"").slice(0,45).replaceAll("_"," ");
      const n=x.delta_pct===null?null:Number(x.delta_pct);
      const delta=n!==null&&Number.isFinite(n)?n.toFixed(2)+"%":"a pool reporting change";
      const time=new Date(x.created_at).toISOString();
      return '<li style="padding:13px 0;border-bottom:1px solid #24403c"><a style="color:#75f3d3" href="'+app+'/tokens/solana/'+encodeURIComponent(address)+'">'+address.slice(0,8)+'…'+address.slice(-6)+'</a> · '+eventType+' · '+delta+'<br><small>Recorded '+time+' UTC</small></li>';
    }).join("");
    const html='<div style="background:#080e18;color:#e9f8f4;padding:24px;font:14px/1.65 system-ui"><div style="max-width:640px;margin:auto"><h1>SignalForge · Your observed token changes</h1><p>These are reported DEX observations for tokens you explicitly monitored. They are not trading signals, onchain safety checks or guarantees of timely alerts.</p><ul style="padding-left:20px">'+itemHtml+'</ul><p><a style="color:#8ff4d7" href="'+app+'/radar#myRadar">Open private Token Radar</a></p><p style="font-size:12px;color:#95abb6">Source: stored DEX Screener observations. Prices, volumes and liquidity may be stale, incomplete or revised. One digest maximum per UTC day, and only after new events.</p><p style="font-size:12px"><a href="'+unsubscribe+'" style="color:#8ff4d7">Stop token digest emails</a> · In-app alerts remain available.</p></div></div>';
    const textBody="SignalForge source-observed token changes\n\n"+usable.map(x=>String(x.address)+" "+String(x.event_type)+" "+(x.delta_pct===null?"":String(x.delta_pct)+"%")).join("\n")+
      "\n\nSource: DEX Screener observations, not trading advice. Research: "+app+"/radar#myRadar"+"\nStop token digest emails: "+unsubscribe;
    const testEndpoint=Bun.env.NODE_ENV==="test"&&/^http:\/\/127\.0\.0\.1:\d+\/emails$/.test(Bun.env.SF_RESEND_TEST_ENDPOINT||"")?String(Bun.env.SF_RESEND_TEST_ENDPOINT):null;
    const response=await fetch(testEndpoint||"https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json","Idempotency-Key":"signalforge-token-digest-"+row.id},
       body:JSON.stringify({from,to:[row.email],subject:"SignalForge · "+usable.length+" observed token change"+(usable.length===1?"":"s"),html,text:textBody}),signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error("Resend status "+response.status+": "+(await response.text()).slice(0,250));
    const responseBody=await response.json().catch(()=>({}));
    await db.unsafe("UPDATE token_digest_deliveries SET status='accepted',accepted_at=NOW(),provider_message_id=$2,updated_at=NOW(),last_error=NULL WHERE id=$1",[row.id,String(responseBody.id||"").slice(0,100)||null]);
    accepted++;
   }catch(err:any){
    const attempts=Number(row.attempts||0)+1,terminal=attempts>=5,delay=Math.min(360,Math.pow(2,attempts)*15);
    await db.unsafe("UPDATE token_digest_deliveries SET attempts=$2,status=$3,scheduled_at=CASE WHEN $3='pending' THEN NOW()+($4||' minutes')::interval ELSE scheduled_at END,last_error=$5,updated_at=NOW() WHERE id=$1",[row.id,attempts,terminal?"failed":"pending",String(delay),String(err?.message||err).slice(0,800)]);
    failed++;console.error("TOKEN_DIGEST_PROVIDER_ERROR",row.id,attempts,String(err?.message||err).slice(0,100));
   }
 }
 console.log("TOKEN_DIGEST_RUN",JSON.stringify({queued:pending.length,claimed:claim.length,providerAccepted:accepted,skipped,failed,privacy:"NO_CUSTOMER_DATA_IN_LOGS",source:"STORED_DEX_CHANGE_EVENTS"}));
}

try{await refreshTokenWatchlist()}catch(error:any){console.error("RADAR_MONITOR_DEGRADED",String(error?.message||error).slice(0,160))}
if(!apiKey||!from){console.log("LIFECYCLE_WORKER_BLOCKED provider_not_configured; set RESEND_API_KEY and verified RESEND_FROM; queued messages preserved");await db.end({timeout:5});}
else{
 try{await deliverTokenDigests()}catch(error:any){console.error("TOKEN_DIGEST_DEGRADED",String(error?.message||error).slice(0,150))}
 await db.unsafe("UPDATE lifecycle_emails SET status='pending',scheduled_at=NOW(),updated_at=NOW(),last_error='Recovered stale worker claim' WHERE status='sending' AND updated_at<NOW()-INTERVAL '20 minutes'");
 const rows=await db.begin(async tx=>{const due=await tx.unsafe("SELECT q.id,q.user_id,q.email,q.template,q.attempts,u.trial_ends_at,u.subscription_status,u.lifecycle_email_consent,u.lifecycle_unsubscribed_at,u.lifecycle_unsubscribe_token FROM lifecycle_emails q JOIN users u ON u.id=q.user_id WHERE q.status='pending' AND q.scheduled_at<=NOW() ORDER BY q.scheduled_at,q.id FOR UPDATE OF q SKIP LOCKED LIMIT 20");if(due.length)await tx.unsafe("UPDATE lifecycle_emails SET status='sending',updated_at=NOW() WHERE id=ANY($1::bigint[])",[due.map((x:any)=>x.id)]);return due});
 let sent=0,skipped=0,failed=0;
 for(const row of rows){
  try{
   if(row.template!=="welcome"&&(!row.lifecycle_email_consent||row.lifecycle_unsubscribed_at)){await db.unsafe("UPDATE lifecycle_emails SET status='cancelled',updated_at=NOW(),last_error='No active email consent' WHERE id=$1",[row.id]);skipped++;continue}
   if(row.template!=="welcome"&&row.subscription_status!=="trialing"){await db.unsafe("UPDATE lifecycle_emails SET status='cancelled',updated_at=NOW(),last_error='Trial no longer active' WHERE id=$1",[row.id]);skipped++;continue}
   const ev=await db.unsafe("SELECT event_name,COUNT(*)::int AS n FROM product_events WHERE user_id=$1 AND created_at>=NOW()-INTERVAL '30 days' GROUP BY event_name",[row.user_id]);
   const counts:any={};for(const x of ev)counts[x.event_name]=Number(x.n);
   const payload=emailFor(row,{market:counts.market_opened||0,scanner:counts.scanner_run||0,backtest:counts.backtest_run||0},row.lifecycle_unsubscribe_token);
   const resp=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json","Idempotency-Key":"signalforge-lifecycle-"+row.id},body:JSON.stringify({from,to:[row.email],subject:payload.subject,html:payload.html,text:payload.text})});
   if(!resp.ok){const detail=(await resp.text()).slice(0,1200);throw new Error("Resend "+resp.status+": "+detail)}
   const result=await resp.json().catch(()=>({}));
   await db.unsafe("UPDATE lifecycle_emails SET status='sent',sent_at=NOW(),updated_at=NOW(),last_error=NULL WHERE id=$1",[row.id]);sent++;console.log("LIFECYCLE_SENT",row.id,row.template,result.id||"accepted");
  }catch(err:any){
   const attempts=Number(row.attempts||0)+1,terminal=attempts>=5,delay=Math.min(24,Math.pow(2,attempts));
   await db.unsafe("UPDATE lifecycle_emails SET attempts=$2,status=$3,scheduled_at=CASE WHEN $3='pending' THEN NOW()+($4||' hours')::interval ELSE scheduled_at END,last_error=$5,updated_at=NOW() WHERE id=$1",[row.id,attempts,terminal?"failed":"pending",String(delay),String(err?.message||err).slice(0,1500)]);
   failed++;console.error("LIFECYCLE_FAILED",row.id,row.template,attempts,String(err?.message||err));
  }
 }
 console.log("LIFECYCLE_WORKER_DONE",JSON.stringify({claimed:rows.length,sent,skipped,failed}));
 await db.end({timeout:5});
}