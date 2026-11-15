/**
 * SignalForge v6: owned retention/entitlement contracts. No duplicated company OS.
 * Stripe authority is exclusively the existing signed SignalForge billing flow.
 */
export type CustomerPlan="explorer"|"pro"|"quant";
export function agentEntitlements(plan:unknown,trialing=false){
 const tier:CustomerPlan=plan==="pro"?"pro":plan==="quant"?"quant":"explorer";
 return {schema:"signalforge.customer-entitlements.v1",tier,trial:trialing,
  sourceResearchPerDay:tier==="explorer"?12:120,modelResearchPerDay:tier==="explorer"?0:trialing?3:tier==="pro"?15:40,
  activeSchedules:tier==="explorer"?1:tier==="pro"?5:10,
  savedMemories:tier==="explorer"?5:20,watchlistEnabled:true,
  forgeMonitors:tier==="explorer"?1:tier==="pro"?5:10,
  enabledModelClasses:tier==="explorer"?[]:tier==="pro"?["economy"]:trialing?["economy"]:["economy","balanced"],
  sourceOnlyFree:true,checkoutPath:"/app?view=pricing"};
}
type Db={unsafe:(sql:string,args?:any[])=>Promise<any[]>};
export async function getCustomerEntitlements(db:Db,userId:string){
 const r=await db.unsafe("SELECT CASE WHEN billing_risk_status<>'clear' THEN 'explorer' WHEN subscription_status='active' THEN plan WHEN subscription_status='past_due' AND billing_current_period_end>NOW() THEN plan WHEN subscription_status='trialing' AND trial_ends_at>NOW() THEN 'quant' ELSE 'explorer' END AS plan,subscription_status,trial_ends_at FROM users WHERE id=$1",[userId]);
 const u=r[0];const trial=!!(u?.subscription_status==="trialing"&&u.trial_ends_at&&new Date(u.trial_ends_at).getTime()>Date.now());
 return agentEntitlements(u?.plan,trial);
}
export async function customerQuota(db:Db,userId:string,type:"source"|"model"){
 const entitlement=await getCustomerEntitlements(db,userId);
 const limit=type==="source"?entitlement.sourceResearchPerDay:entitlement.modelResearchPerDay;
 const q=type==="source"?
  "SELECT COUNT(*)::int AS n FROM sourcea_customer_tasks WHERE user_id=$1 AND created_at>=date_trunc('day',NOW())":
  "SELECT COUNT(*)::int AS n FROM sourcea_customer_tasks WHERE user_id=$1 AND updated_at>=date_trunc('day',NOW()) AND (usage->>'modelCalls')::int>0";
 const r=await db.unsafe(q,[userId]);
 const consumed=Number(r[0]?.n||0);
 return {eligible:consumed<limit,consumed,limit,reset:"UTC_MIDNIGHT",entitlements:entitlement};
}
export async function createCustomerConversation(db:Db,userId:string,title:string){
 const name=String(title||"Market investigation").trim().slice(0,100)||"Market investigation";
 const rows=await db.unsafe('INSERT INTO agent_conversations(user_id,title) VALUES($1,$2) RETURNING id::text,created_at AS "createdAt"',[userId,name]);
 return rows[0];
}
export async function ownsConversation(db:Db,userId:string,conversationId:string){
 if(!/^[0-9a-f-]{36}$/.test(conversationId))return false;
 const r=await db.unsafe("SELECT 1 FROM agent_conversations WHERE id=$1 AND user_id=$2",[conversationId,userId]);
 return r.length>0;
}
export async function conversationHistory(db:Db,userId:string,conversationId:string){
 const owned=await ownsConversation(db,userId,conversationId);if(!owned)return null;
 const rows=await db.unsafe('SELECT id::text,prompt,status,artifact,receipt,created_at AS "createdAt",updated_at AS "updatedAt" FROM sourcea_customer_tasks WHERE user_id=$1 AND conversation_id=$2 ORDER BY created_at ASC LIMIT 70',[userId,conversationId]);
 return rows.map(r=>({id:r.id,prompt:r.prompt,status:r.status,analysis:r.artifact?.sourceObservation?.intelligence?.output?.analysis||null,
  sourceCount:r.artifact?.sourceObservation?.evidence?.length||0,receiptHash:r.receipt?.receiptHash||null,createdAt:r.createdAt,updatedAt:r.updatedAt}));
}
export async function customerMemoryContext(db:Db,userId:string,conversationId:string|null){
 const r=await db.unsafe('SELECT note FROM agent_research_memories WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5',[userId]);
 const q=conversationId?await db.unsafe("SELECT prompt FROM sourcea_customer_tasks WHERE user_id=$1 AND conversation_id=$2 AND status='SUCCEEDED' ORDER BY created_at DESC LIMIT 3",[userId,conversationId]):[];
 return [...r.map(x=>"User-saved research context: "+String(x.note).slice(0,220)),...q.map(x=>"Previous question: "+String(x.prompt).slice(0,220))];
}
export async function customerNotificationFeed(db:Db,userId:string){
 return db.unsafe('SELECT n.id::text,n.task_id::text AS "taskId",n.schedule_id::text AS "scheduleId",n.title,n.summary,n.source_links AS "sourceLinks",n.created_at AS "createdAt",n.seen_at AS "seenAt" FROM agent_market_notifications n WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT 50',[userId]);
}
export async function recordMarketNotification(db:Db,task:{userId:string;id:string;scheduleId?:string|null},result:any,compare:(a:any,b:any)=>any){
 if(!task.scheduleId||result?.status!=="SOURCE_OBSERVED")return null;
 // A completed scheduled run is the in-app delivery; no email send is claimed.
 const before=await db.unsafe("SELECT artifact FROM sourcea_customer_tasks WHERE user_id=$1 AND schedule_id=$2 AND status='SUCCEEDED' AND id<>$3 ORDER BY finished_at DESC LIMIT 1",[task.userId,task.scheduleId,task.id]);
 if(!before.length)return null;
 const prior=before[0]?.artifact?.sourceObservation;
 const delta=compare(prior,result);
 if(delta.status!=="COMPARISON_AVAILABLE"||!(delta.changes||[]).some((x:any)=>x.metrics?.some((m:any)=>m.delta!==0)))return null;
 const links=[...new Set((result.evidence||[]).map((e:any)=>e.sourceUrl).filter((u:any)=>typeof u==="string"&&u.startsWith("https://")))].slice(0,5);
 const rows=await db.unsafe('INSERT INTO agent_market_notifications(user_id,task_id,schedule_id,title,summary,source_links) VALUES($1,$2,$3,$4,$5,$6::text::jsonb) ON CONFLICT(task_id) DO NOTHING RETURNING id::text',
  [task.userId,task.id,task.scheduleId,"Your monitored market source changed","One or more matched source-reported numeric observations changed since the previous successful scheduled run. Open the research artifact to inspect the before/after values.",JSON.stringify(links)]);
 return rows[0]?.id||null;
}
