/**
 * SignalForge internal, noncash Genesis Points and source-backed Signal Rooms.
 * Records observable product participation, NOT proof of distinct human identity.
 * No token rights, treasury balance, monetary value, referral cash or yield.
 */
import {verifyExecutionReceipt} from "./sourcea-execution-adapter.ts";
type Db={unsafe:(sql:string,args?:any[])=>Promise<any[]>};
export const GENESIS_LEDGER_SCHEMA="signalforge.genesis-noncash-ledger.v1";
export function eligibleResearcher(email:unknown,role:unknown){
 if(role!=="user"||typeof email!=="string")return false;
 const v=email.trim().toLowerCase();
 return v.includes("@")&&!v.endsWith("@signalforge.invalid")&&!v.endsWith("@signalforge.test")&&!v.endsWith("@example.com")&&!v.endsWith("@example.org")&&!v.endsWith(".test")&&!v.endsWith(".invalid");
}
export async function awardObservedResearchParticipation(db:Db,userId:string,taskId:string){
 const row=await db.unsafe('SELECT t.packet,t.artifact,t.receipt,t.status,u.email,u.role,u.referred_by::text AS "referredBy" FROM sourcea_customer_tasks t JOIN users u ON t.user_id=u.id WHERE t.id=$1 AND t.user_id=$2',[taskId,userId]);
 if(!row.length||row[0].status!=="SUCCEEDED"||!eligibleResearcher(row[0].email,row[0].role))return {awarded:false,reason:"NOT_GENUINE_ELIGIBLE_RESEARCH_ACTIVITY"};
 const t=row[0],source=t.artifact?.sourceObservation;
 if(source?.status!=="SOURCE_OBSERVED"||!(await verifyExecutionReceipt(t.packet,t.artifact,t.receipt)).valid)return {awarded:false,reason:"SOURCE_RECEIPT_NOT_VALID"};
 const row1=await db.unsafe("INSERT INTO signalforge_genesis_points(user_id,source_user_id,event_key,points,reason) VALUES($1,$2,$3,10,'FIRST_SOURCE_RESEARCH') ON CONFLICT(event_key) DO NOTHING RETURNING id::text",[userId,userId,"research-first:"+userId]);
 if(!row1.length)return {awarded:false,reason:"ALREADY_RECORDED"};
 if(t.referredBy&&t.referredBy!==userId){
  const refer=await db.unsafe("SELECT email,role FROM users WHERE id=$1",[t.referredBy]);
  if(refer.length&&eligibleResearcher(refer[0].email,refer[0].role)){
   await db.unsafe("INSERT INTO signalforge_genesis_points(user_id,source_user_id,event_key,points,reason) VALUES($1,$2,$3,25,'QUALIFIED_REFERRED_RESEARCH') ON CONFLICT(event_key) DO NOTHING",[t.referredBy,userId,"qualified-referral:"+userId]);
   await db.unsafe("INSERT INTO signalforge_genesis_points(user_id,source_user_id,event_key,points,reason) VALUES($1,$2,$3,5,'QUALIFIED_REFERRAL_WELCOME') ON CONFLICT(event_key) DO NOTHING",[userId,userId,"referral-welcome:"+userId]);
  }
 }
 return {awarded:true,points:10,reason:"FIRST_SOURCE_RESEARCH",cashValue:null,tokenIssued:false,humanIdentityVerified:false};
}
export async function genesisHistory(db:Db,userId:string){
 const r=await db.unsafe('SELECT id::text,points,reason,created_at AS "createdAt" FROM signalforge_genesis_points WHERE user_id=$1 ORDER BY created_at DESC LIMIT 80',[userId]);
 const earned=r.reduce((n,x)=>n+Number(x.points||0),0);
 const qualifiedReferralCount=r.filter(x=>x.reason==="QUALIFIED_REFERRED_RESEARCH").length;
 return {schema:GENESIS_LEDGER_SCHEMA,points:earned,qualifiedReferralCount,events:r,
  unit:"NONCASH_INTERNAL_POINTS",convertibleToCash:false,transferable:false,tokenIssued:false,claimOpen:false,marketValue:null,treasuryEffect:false,
  evidenceTier:"ACCOUNT_ACTIVITY_AND_SOURCE_RECEIPT_NOT_HUMAN_IDENTITY_VERIFIED"};
}
export async function publishVerifiedResearchToRooms(db:Db,userId:string,taskId:string){
 const rows=await db.unsafe('SELECT t.id,t.agent_job_id::text AS "agentJobId",t.packet,t.artifact,t.receipt,t.status FROM sourcea_customer_tasks t WHERE t.id=$1 AND t.user_id=$2',[taskId,userId]);
 if(!rows.length)return {status:404,error:"RESEARCH_TASK_NOT_FOUND"};
 const task=rows[0],source=task.artifact?.sourceObservation;
 if(task.status!=="SUCCEEDED"||!task.agentJobId||source?.status!=="SOURCE_OBSERVED")return {status:409,error:"SOURCE_RESEARCH_NOT_READY"};
 const verified=await verifyExecutionReceipt(task.packet,task.artifact,task.receipt);
 if(!verified.valid)return {status:409,error:"RECEIPT_INTEGRITY_INVALID"};
 const existing=await db.unsafe("SELECT id::text AS id FROM community_posts WHERE agent_task_id=$1 AND user_id=$2",[taskId,userId]);
 if(existing.length)return {status:200,postId:existing[0].id,alreadyPublished:true};
 const rate=await db.unsafe("SELECT COUNT(*)::int AS n FROM community_posts WHERE user_id=$1 AND created_at>NOW()-INTERVAL '1 hour'",[userId]);
 if((rate[0]?.n||0)>=6)return {status:429,error:"COMMUNITY_HOURLY_POST_LIMIT"};
 const original=(source.evidence||[]).filter((e:any)=>typeof e.sourceUrl==="string"&&e.sourceUrl.startsWith("https://")).slice(0,2);
 if(!original.length)return {status:409,error:"SOURCE_LINK_MISSING"};
 const card=await db.unsafe("INSERT INTO agent_public_cards(user_id,job_id) SELECT $1,id FROM agent_jobs WHERE id=$2 AND user_id=$1 AND status='SOURCE_OBSERVED' ON CONFLICT(user_id,job_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING id::text",[userId,task.agentJobId]);
 if(!card.length)return {status:409,error:"RESEARCH_CARD_UNAVAILABLE"};
 const title="Source research · "+String(original[0].label||"Market observation").slice(0,110);
 const sources=original.map((e:any)=>String(e.venue)+" · "+String(e.observedAt||"time unavailable")+" · "+String(e.sourceUrl)).join("\n");
 const body=("SignalForge source-linked market research. "+String(source.summary||"").slice(0,420)+
  "\n\nOriginal evidence:\n"+sources+"\n\nResearch Card: /research/"+card[0].id+
  "\n\nProvider-reported, not independently verified. No trade was executed.").slice(0,2200);
 const inserted=await db.unsafe('INSERT INTO community_posts(user_id,title,body,category,agent_task_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(agent_task_id) DO UPDATE SET agent_task_id=EXCLUDED.agent_task_id RETURNING id::text AS id',[userId,title,body,"research",taskId]);
 return {status:201,postId:inserted[0].id,cardPath:"/research/"+card[0].id,sourceCount:original.length,scope:"PUBLIC_OPT_IN_SIGNAL_ROOMS",cashValue:null};
}
