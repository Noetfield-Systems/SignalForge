/**
 * SignalForge 100-role Company OS workcells.
 * An organizational seat is a role contract, NOT a resident agent or worker.
 * Runtime execution remains with the existing Sina Founder OS / Company OS /
 * Agent Fabric / independent verifier; never create a parallel scheduler here.
 */
import org from "./organization.v2.json";
import type {ProposedWork} from "./operating-engine.ts";

const PROJECT = "signalforge-market-intelligence";
const STAGES = ["DISCOVER","DELIVER","REVIEW","VERIFY"] as const;
const roleById=new Map(org.agents.map(r=>[r.id,r]));
const teamById=new Map(org.departments.map(d=>[d.id,d]));
type Packet = Pick<ProposedWork,"id"|"owner_role_id"|"owner_department"|"priority_score"|"title"|"objective"|"why_now"|"verification"|"project_id"|"authority"|"routing_state">;
export type OperatingBoard = {tenant:string;goal:string;as_of:string;source_generated_at:string;workpackets:Packet[];operating_state:unknown;candidate_count:number};
export function verifyWorkforceContracts(){
  if(org.tenant_project_id!==PROJECT||org.headcount_target_roles!==100||org.agents.length!==100||
    org.number_of_companies!==1||org.number_of_product_platforms!==1||
    org.operating_continuity.local_scheduler_creation!==false)throw Error("INVALID_COMPANY_SCOPE");
  if(roleById.size!==100||new Set(org.departments.map(d=>d.id)).size!==org.departments.length)throw Error("DUPLICATE_ROLE_OR_DEPARTMENT");
  for(const dept of org.departments){
    const members=org.agents.filter(r=>r.department===dept.id);
    if(!members.length||members.length!==dept.role_count)throw Error("DEPARTMENT_CAPACITY_MISMATCH");
  }
  for(const role of org.agents){
    const contract=role.operating_contract;
    if(!contract||!contract.atomic_task||!contract.deliverable||
      !Array.isArray(contract.acceptance_criteria)||contract.acceptance_criteria.length<2||
      contract.current_binding!=="NOT_VERIFIED"||
      contract.activation!=="EVENT_DRIVEN_EXISTING_COMPANY_OS_ONLY"||
      role.financial_authority!=="NONE"||role.release_authority!=="GOVERNOR_ONLY"||
      role.evidence_authority!=="NONE")throw Error("INVALID_ROLE_CONTRACT");
    const seen=new Set<string>();let node=role;
    while(node.reports_to!=="sina_founder_os"){
      if(seen.has(node.id))throw Error("CYCLIC_MANAGEMENT_CHAIN");
      seen.add(node.id);
      const parent=roleById.get(node.reports_to);
      if(!parent)throw Error("MISSING_MANAGER_"+node.id);
      node=parent;
    }
    if(role.department==="verification"&&role.reports_to!=="sina_founder_os")
      throw Error("VERIFIER_NOT_INDEPENDENT");
  }
  return {roles:100,departments:org.departments.length,independent_review_roles:org.agents.filter(r=>r.department==="verification").length};
}
function compactRole(r:typeof org.agents[number]){
 return {
  id:r.id,title:r.title,department:r.department,reports_to:r.reports_to,
  functional_unit:r.functional_unit,task_template_id:r.operating_contract.task_template_id,
  atomic_task:r.operating_contract.atomic_task,deliverable:r.operating_contract.deliverable,
  acceptance_criteria:r.operating_contract.acceptance_criteria,
  runtime_binding:"NOT_INDEPENDENTLY_VERIFIED",
  executor_class:r.operating_contract.fabric_role,
  evidence_owner:r.operating_contract.evidence_owner
 };
}
function selectReviewer(owner:string,department:string){
 const selectors=department==="engineering"||department==="product"||department==="data"
  ?["qa_engineer","appsec_specialist"]
  :department==="commercial"||department==="growth"||department==="customer"
  ?["finance_analyst","research_integrity"]
  :["research_integrity","qa_engineer"];
 return selectors.find(x=>x!==owner&&roleById.has(x))||"independent_verifier";
}
export function compileWorkforceFloor(board:OperatingBoard){
 verifyWorkforceContracts();
 if(board.tenant!==PROJECT||board.goal!=="M20-SIGNALFORGE-COMMUNITY"||
    !Array.isArray(board.workpackets)||board.workpackets.length>30||
    !Number.isFinite(Date.parse(board.as_of))||
    !Number.isFinite(Date.parse(board.source_generated_at)))
   throw Error("INVALID_COMPANY_WORKBOARD");
 const jobs=[] as Array<Record<string,unknown>>;
 const summary=[] as Array<Record<string,unknown>>;
 for(const packet of board.workpackets){
   if(!packet.id.startsWith("SF-")||packet.project_id!==PROJECT||
      packet.authority!=="PROPOSAL_ONLY_EXISTING_GOVERNOR_REQUIRED"||
      packet.routing_state!=="AWAITING_EXISTING_COMPANY_OS_WORKPACKET"||
      !roleById.has(packet.owner_role_id)||
      packet.owner_role_id==="independent_verifier"||
      packet.owner_role_id==="release_verifier"||
      !Number.isFinite(packet.priority_score))
     throw Error("UNTRUSTED_WORKPACKET");
   const role=roleById.get(packet.owner_role_id)!;
   const peer=selectReviewer(role.id,role.department);
   const stages=[
     {step:"DISCOVER",role:role.id,task:"Inspect authenticated product observation and scoped repository evidence for: "+packet.title,done_when:"Source, measurement window and affected function are reproducible"},
     {step:"DELIVER",role:role.id,task:packet.objective,done_when:role.operating_contract.deliverable+"; "+role.operating_contract.acceptance_criteria[0]},
     {step:"REVIEW",role:peer,task:"Reproduce acceptance conditions, adverse cases and regressions for: "+packet.title,done_when:"Independent of the builder: evidence-backed test report and failure classification"},
     {step:"VERIFY",role:"independent_verifier",task:"Independently compare source SHA, CI, deployed SHA and product outcome for: "+packet.title,done_when:"Verified signed receipt from canonical independent verifier only"}
   ] as const;
   let prior:string|null=null;
   for(const item of stages){
    const id=packet.id+":"+item.step;
    jobs.push({
      id,parent_workpacket:packet.id,project_id:PROJECT,department:role.department,role_id:item.role,
      stage:item.step,task:item.task,done_when:item.done_when,
      depends_on:prior?[prior]:[],state:"PROPOSED_NOT_DISPATCHED",priority_score:packet.priority_score,
      evidence_state:"SOURCE_REPORTED_UNVERIFIED",authority:"EXISTING_COMPANY_OS_ADMISSION_REQUIRED",
      execution_target:"EXISTING_AGENT_FABRIC_OR_INDEPENDENT_VERIFIER",external_effects_authorized:false
    });
    prior=id;
   }
   summary.push({id:packet.id,title:packet.title,department:role.department,owner:role.id,
     priority:packet.priority_score,stage_count:STAGES.length,state:"PROPOSED_NOT_DISPATCHED",
     evidence_state:"SOURCE_REPORTED_UNVERIFIED"});
 }
 const departments=org.departments.map(d=>{
   const roles=org.agents.filter(r=>r.department===d.id);
   return {id:d.id,defined_seats:roles.length,
    accountable_head:roles.find(r=>r.id==="managing_director"||r.id==="independent_verifier"||r.id.startsWith("head_"))?.id
     ||roles[0].reports_to,
    pending_workstreams:summary.filter(w=>w.department===d.id).length,
    runtime_agents_bound:null,role_contracts:roles.map(compactRole)};
 });
 return {
  schema:"signalforge.company-os.workforce-floor.v2",
  project_id:PROJECT,parent_goal:board.goal,
  as_of:board.as_of,source_generated_at:board.source_generated_at,
  org:{defined_roles:org.agents.length,departments:departments.length,companies:1,
   verified_live_agents:null,verified_completed_tasks:null,
   claimed_human_employees:0,role_contracts_not_running_agents:true,
   execution_runtime:"EXISTING_SINA_COMPANY_OS_AGENT_FABRIC",
   scheduler:"EXISTING_SINA_HEARTBEAT",
   verified_runtime_binding_state:"NOT_YET_INDEPENDENTLY_READ_BACK"},
  capacity:{max_parallel_internal_drafts:org.operating_continuity.max_parallel_internal_drafts,
   max_in_flight_scoped_strategic_packets:org.operating_continuity.max_unverified_strategic_workpackets_per_company,
   source_observed_workpacket_candidates:board.candidate_count,
   admitted_workpackets:null,active_workpackets:null,independently_verified_workpackets:null},
  workstreams:summary,
  microtasks:jobs,
  department_workcells:departments,
  operating_state:board.operating_state,
  constraints:{no_parallel_scheduler:true,no_new_queue:true,no_fake_employee_claims:true,
   existing_governor_controls_effects:true,independent_verification_required:true,
   no_trade_or_money_issuance_from_this_projection:true},
  next_connection:"CANONICAL_COMPANY_OS_DISPATCH_AND_INDEPENDENT_READBACK_REQUIRED"
 };
}
