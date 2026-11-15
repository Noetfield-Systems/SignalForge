/**
 * SourceA-compatible customer task runtime. Uses existing SignalForge Railway Bun
 * service + PostgreSQL; no internal Company OS scheduler or SourceA cloud assumed.
 */
import {compileMarketWorkPacket,buildExecutionArtifactAndReceipt,measuredUsage} from "./sourcea-execution-adapter.ts";

type Db = {unsafe:(sql:string,args?:any[])=>Promise<any[]>};
type Deps = {execute:(prompt:string)=>Promise<any>};
const taskSelect='SELECT id::text,user_id::text AS "userId",prompt,status,attempt_count AS "attempts",created_at AS "createdAt",updated_at AS "updatedAt",finished_at AS "finishedAt",cancel_requested AS "cancelRequested",packet,artifact,receipt,usage,last_error AS "lastError",schedule_id::text AS "scheduleId",agent_job_id::text AS "persistedJobId" FROM sourcea_customer_tasks';
export async function newCustomerTask(db:Db,userId:string,prompt:string,scheduleId:string|null=null){
 const taskId=crypto.randomUUID(),compiled=compileMarketWorkPacket(prompt,taskId);
 if("error" in compiled)return {error:compiled.error};
 const r=await db.unsafe('INSERT INTO sourcea_customer_tasks(id,user_id,prompt,packet,schedule_id) VALUES($1,$2,$3,$4::text::jsonb,$5) RETURNING id::text,created_at AS "createdAt"',[taskId,userId,prompt,JSON.stringify(compiled.value),scheduleId]);
 await db.unsafe("INSERT INTO sourcea_task_events(task_id,event,details) VALUES($1,'QUEUED',$2::text::jsonb)",[taskId,JSON.stringify({skillId:compiled.value.skillId,lane:compiled.value.lane})]);
 return {taskId:r[0].id,status:"QUEUED",packet:compiled.value,createdAt:r[0].createdAt};
}
export async function getOwnedCustomerTask(db:Db,userId:string,taskId:string){
 const r=await db.unsafe(taskSelect+" WHERE user_id=$1 AND id=$2",[userId,taskId]);
 if(!r.length)return null;
 const events=await db.unsafe('SELECT id::text,event,details,created_at AS "at" FROM sourcea_task_events WHERE task_id=$1 ORDER BY id ASC LIMIT 60',[taskId]);
 return {...r[0],events};
}
export async function listOwnedCustomerTasks(db:Db,userId:string){
 const rows=await db.unsafe(taskSelect+" WHERE user_id=$1 ORDER BY created_at DESC LIMIT 40",[userId]);
 return rows.map(r=>({...r,artifact:r.artifact?{schema:r.artifact.schema,sourceMode:r.artifact.sourceMode,sourceCount:r.artifact.sourceCount}:null,receipt:r.receipt?{schema:r.receipt.schema,evaluation:r.receipt.evaluation,receiptHash:r.receipt.receiptHash}:null}));
}
export async function cancelOwnedCustomerTask(db:Db,userId:string,taskId:string){
 const r=await db.unsafe("UPDATE sourcea_customer_tasks SET status='CANCELLED',cancel_requested=true,lease_until=NULL,updated_at=NOW(),finished_at=NOW() WHERE id=$1 AND user_id=$2 AND status IN ('QUEUED','RUNNING') RETURNING id::text",[taskId,userId]);
 if(!r.length)return false;
 await db.unsafe("INSERT INTO sourcea_task_events(task_id,event,details) VALUES($1,'CANCELLED','{}'::jsonb)",[taskId]);
 return true;
}
export async function retryOwnedCustomerTask(db:Db,userId:string,taskId:string){
 const r=await db.unsafe("UPDATE sourcea_customer_tasks SET status='QUEUED',cancel_requested=false,last_error=NULL,lease_until=NULL,updated_at=NOW() WHERE id=$1 AND user_id=$2 AND status IN ('FAILED','CANCELLED') AND attempt_count<2 RETURNING id::text",[taskId,userId]);
 if(!r.length)return false;
 await db.unsafe("INSERT INTO sourcea_task_events(task_id,event,details) VALUES($1,'RETRIED','{}'::jsonb)",[taskId]);
 return true;
}
let workerBusy=false;
export async function drainSourceATasks(db:Db,deps:Deps){
 if(workerBusy)return {skipped:"WORKER_BUSY"};
 workerBusy=true;
 try{
  await db.unsafe("UPDATE sourcea_customer_tasks SET status='FAILED',last_error='WORKER_LEASE_EXPIRED_AFTER_ATTEMPT_LIMIT',lease_until=NULL,finished_at=NOW(),updated_at=NOW() WHERE status='RUNNING' AND lease_until<NOW() AND attempt_count>=2");
  const claim="WITH next AS (SELECT id FROM sourcea_customer_tasks "+
   "WHERE (status='QUEUED' OR (status='RUNNING' AND lease_until<NOW())) AND attempt_count<2 AND cancel_requested=false "+
   "ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1) "+
   "UPDATE sourcea_customer_tasks t SET status='RUNNING',attempt_count=attempt_count+1,started_at=NOW(),"+
   "lease_until=NOW()+INTERVAL '60 seconds',updated_at=NOW() "+
   'FROM next WHERE t.id=next.id RETURNING t.id::text,t.user_id::text AS "userId",t.prompt,t.packet,t.attempt_count AS "attempts",t.started_at AS "startedAt"';
  const rows=await db.unsafe(claim);
  if(!rows.length)return {processed:0};
  const task=rows[0],start=Date.now();
  await db.unsafe("INSERT INTO sourcea_task_events(task_id,event,details) VALUES($1,'RUNNING',$2::text::jsonb)",[task.id,JSON.stringify({attempt:task.attempts})]);
  let result:any=null,artifact:any=null,receipt:any=null,reason:string|null=null;
  try{
   result=await deps.execute(task.prompt);
   const usage=measuredUsage(start,Date.now());
   const done=await buildExecutionArtifactAndReceipt({taskId:task.id,packet:task.packet,result,startedAt:new Date(task.startedAt).toISOString(),finishedAt:new Date().toISOString(),attempt:task.attempts,usage});
   artifact=done.artifact;receipt=done.receipt;
   if(receipt.evaluation.verdict!=="PASS")reason=receipt.evaluation.reason;
  }catch(e:any){reason=String(e?.code||e?.message||"WORKER_EXECUTION_FAILED").slice(0,140)}
  const usage=measuredUsage(start,Date.now()),success=!reason&&receipt?.evaluation?.verdict==="PASS";
  // CAS: cancellation during an in-flight provider fetch wins; no artifact
  // or success receipt is persisted after cancellation.
  const update="UPDATE sourcea_customer_tasks SET status=$3,artifact=$4::text::jsonb,receipt=$5::text::jsonb,"+
   "usage=$6::text::jsonb,last_error=$7,lease_until=NULL,finished_at=NOW(),updated_at=NOW() "+
   "WHERE id=$1 AND status='RUNNING' AND cancel_requested=false AND attempt_count=$2 RETURNING id::text";
  const updated=await db.unsafe(update,[task.id,task.attempts,success?"SUCCEEDED":"FAILED",artifact?JSON.stringify(artifact):null,receipt?JSON.stringify(receipt):null,JSON.stringify(usage),reason]);
  if(updated.length)await db.unsafe("INSERT INTO sourcea_task_events(task_id,event,details) VALUES($1,$2,$3::text::jsonb)",[task.id,success?"SUCCEEDED":"FAILED",JSON.stringify({attempt:task.attempts,reason,observations:result?.evidence?.length||0})]);
  if(updated.length&&success){
   try{
    const journal=await db.unsafe('INSERT INTO agent_jobs(user_id,prompt,tool,status,mode,result) VALUES($1,$2,$3,$4,$5,$6::text::jsonb) RETURNING id::text',[task.userId,task.prompt,result.tool,result.status,result.mode,JSON.stringify(result)]);
    await db.unsafe("UPDATE sourcea_customer_tasks SET agent_job_id=$2 WHERE id=$1",[task.id,journal[0].id]);
   }catch(e){console.error("SourceA task completed but research journal link unavailable",String(e).slice(0,150))}
  }
  return {processed:1,taskId:task.id,status:updated.length?(success?"SUCCEEDED":"FAILED"):"CANCELLED_OR_SUPERSEDED"};
 }finally{workerBusy=false}
}
export async function activateDueSchedules(db:Db){
 const query="WITH due AS (SELECT id FROM sourcea_customer_schedules WHERE active=true AND next_run_at<=NOW() "+
  "ORDER BY next_run_at FOR UPDATE SKIP LOCKED LIMIT 4) "+
  "UPDATE sourcea_customer_schedules s SET next_run_at=NOW()+(s.cadence_minutes*INTERVAL '1 minute'),"+
  'last_queued_at=NOW(),updated_at=NOW() FROM due WHERE s.id=due.id RETURNING s.id::text,s.user_id::text AS "userId",s.prompt';
 const rows=await db.unsafe(query);let count=0;
 for(const row of rows){try{const r=await newCustomerTask(db,row.userId,row.prompt,row.id);if(!("error" in r))count++}catch(error){console.error("Customer schedule dispatch failed",String(error).slice(0,100))}}
 return {scheduled:count};
}
