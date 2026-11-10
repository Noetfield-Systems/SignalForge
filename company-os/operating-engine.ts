/**
 * Single-platform SignalForge Company OS deterministic decision projection.
 *
 * NOT another scheduler / agent registry / governor. The existing Sina OS
 * heartbeat owns dispatch. This module materializes typed, scoped proposals
 * from authenticated, freshly observed product aggregates for one platform.
 * A proposal is never a trading order, a payment, a permit, or proof.
 */
import organization from "./organization.v1.json";
import {evaluateCompanyPolicy, type CompanyMetrics} from "../src/company-os-policy.ts";

export type Snapshot = {
 schemaVersion:string;tenant:string;environment:string;generatedAt:string;
 readOnly:boolean;source:string;
 privacy:{identifiersIncluded:boolean;freeTextIncluded:boolean;syntheticUsersExcluded:boolean};
 users:{total:number;signups7d:number;active7d:number;trials:number;paying:number};
 community:{posts:number;posts7d:number;authors:number};
 moderation:{open:number};
 product:{events7d:number};
 signals:{recorded:number;resolved:number};
 operatingMetrics?:CompanyMetrics;
};
type Role = (typeof organization.agents)[number];
export type ProposedWork = {
 id:string; parent_goal:string; project_id:string; owner_role_id:string;
 owner_department:string; priority_score:number; priority_band:"P0"|"P1"|"P2";
 business_value:string;title:string;objective:string;why_now:string;
 depends_on:string[]; verification:string[]; evidence_state:"INPUT_SOURCE_REPORTED";
 authority:"PROPOSAL_ONLY_EXISTING_GOVERNOR_REQUIRED";resources:{
  budget_usd:0; external_effects_allowed:false;real_trades_allowed:false;
  token_issuance_allowed:false;production_mutation_allowed:false;
 };routing_state:"AWAITING_EXISTING_COMPANY_OS_WORKPACKET";
};
type Candidate = {
 id:string;owner:string;weight:number;business_value:string;title:string;
 objective:string;why:string;deps:string[];verify:string[];
};
const PROJECT="signalforge-market-intelligence";
const GOAL="M20-SIGNALFORGE-COMMUNITY";
const finiteCount=(n:unknown)=>typeof n==="number"&&Number.isSafeInteger(n)&&n>=0&&n<=1_000_000_000;
const roleMap=new Map<string,Role>(organization.agents.map(r=>[r.id,r]));

export function verifySingleCompanyHierarchy():{roles:number;departments:string[];root:string}{
 if(organization.number_of_companies!==1||organization.number_of_product_platforms!==1||
   organization.tenant_project_id!==PROJECT)throw Error("SCOPE_DRIFT");
 if(roleMap.size!==organization.agents.length)throw Error("DUPLICATED_ROLE");
 for(const r of organization.agents){
   if(!r.id||!r.title||!r.department||!r.model_tier||
      r.financial_authority!=="NONE"||r.release_authority!=="GOVERNOR_ONLY"||
      r.evidence_authority!=="NONE")throw Error("ROLE_POLICY_INVALID");
   if(r.id==="independent_verifier"&&r.reports_to!=="sina_founder_os")
      throw Error("VERIFIER_NOT_INDEPENDENT");
   if(r.id==="managing_director"&&r.reports_to!=="sina_founder_os")
      throw Error("FOUNDER_HIERARCHY_BROKEN");
   let n=r,depth=0,visited=new Set<string>();
   while(n.reports_to!=="sina_founder_os"){
     if(++depth>organization.agents.length||visited.has(n.id))throw Error("CYCLIC_ROLE_HIERARCHY");
     visited.add(n.id);
     const parent=roleMap.get(n.reports_to);
     if(!parent)throw Error("MISSING_MANAGER");
     n=parent;
   }
 }
 if(organization.global_nonnegotiables.length<7||organization.operating_continuity.local_scheduler_creation!==false)
   throw Error("UNSAFE_RUNTIME_CONTRACT");
 return {roles:organization.agents.length,
  departments:[...new Set(organization.agents.map(r=>r.department))],
  root:"sina_founder_os"};
}

export function validateSnapshot(input:unknown, now:Date=new Date()):Snapshot{
 if(!input||typeof input!=="object")throw Error("INVALID_AGGREGATE_SOURCE");
 const s=input as Snapshot;
 if(s.schemaVersion!=="1.0.0"||s.tenant!=="signalforge"||
   s.environment!=="production"||s.readOnly!==true||
   s.source!=="SignalForge PostgreSQL aggregate observations"||
   JSON.stringify(s.privacy)!==JSON.stringify({
      identifiersIncluded:false,freeTextIncluded:false,syntheticUsersExcluded:true
   }))throw Error("AGGREGATE_PROVENANCE_REJECTED");
 const ts=Date.parse(s.generatedAt),age=now.getTime()-ts;
 if(!Number.isFinite(ts)||age < -120000||age>600000)throw Error("STALE_AGGREGATE_SOURCE");
 const fields:Array<[unknown,string[]]>=[
 [s.users,["total","signups7d","active7d","trials","paying"]],
 [s.community,["posts","posts7d","authors"]],
 [s.moderation,["open"]],[s.product,["events7d"]],
 [s.signals,["recorded","resolved"]]
 ];
 for(const [obj,keys] of fields){
  if(!obj||typeof obj!=="object"||
    keys.some(k=>!finiteCount((obj as Record<string,unknown>)[k])))
    throw Error("AGGREGATE_NUMERIC_SCHEMA_INVALID");
 }
 if(s.users.active7d>s.users.total||s.users.paying>s.users.total||
  s.users.trials>s.users.total||s.community.posts7d>s.community.posts||
  s.community.authors>s.users.total||s.signals.resolved>s.signals.recorded)
  throw Error("AGGREGATE_INVARIANT_FAILED");
 if(s.operatingMetrics)evaluateCompanyPolicy(s.operatingMetrics);
 return s;
}
const candidate=(id:string,owner:string,weight:number,business_value:string,title:string,objective:string,why:string,verify:string[],deps:string[]=[]):Candidate=>({
 id,owner,weight,business_value,title,objective,why,verify,deps});

export function compileOperatingBoard(raw:unknown, at:Date=new Date()){
 verifySingleCompanyHierarchy();
 const s=validateSnapshot(raw,at);
 const livePolicy=s.operatingMetrics?evaluateCompanyPolicy(s.operatingMetrics):null;
 const todo:Candidate[]=[
 candidate("SF-P0-01","billing_operator",99,"collected_cash",
  "Prove trial → paid → entitlement → refund with independent payment receipts",
  "Reconcile Stripe customer/subscription/payment events, no-card trial expiry, idempotent signed webhooks, cancellations and refunds. Differentiate priced plans, trial selections, MRR and actual settled CAD cash.",
  "Snapshot has no independent payment ledger or cash-settlement proof.",
  ["A real authorized micro-charge and refund (when founder approves) have third-party ledger refs","Webhook signature and idempotent replay verified","Entitlements match signed payment state","Receipt records cash separately from selected trial plan"]),
 candidate("SF-P0-02","lifecycle_growth",96,"activation_retention",
  "Instrument real first research action, trial cohort and day-7 return",
  "Add privacy-minimized canonical product events with human/bot exclusion, signup attribution and cohort denominators; expose only aggregate analytics to Sina OS.",
  "Source counts signups and activity, but cannot yet prove meaningful activation or retention cohorts.",
  ["New-user denominator and first-action numerator independently queryable","D7 eligible-cohort retention computed reproducibly","Synthetic/test users excluded","No customer email or raw message leaves SignalForge"]),
 candidate("SF-P0-RELEASE-RECOVERY","sre_operator",94,"service_trust",
  "Validate backup restore, production rollback, alerting and failure monitoring",
  "Exercise isolated PostgreSQL restore, deploy rollback and rate-limit/failed webhook alerts without creating a second scheduler.",
  "A successful Railway deployment alone is not a tested disaster-recovery plan.",
  ["Restored isolated database has expected data integrity","Rollback drill does not destroy existing user data","Alerts have owner, escalation and reproducible evidence"]),
 candidate("SF-P1-ETH-DATA","ethereum_analyst",83,"core_web3_utility",
  "Add source-verified Ethereum and EVM research views",
  "Validate read-only Ethereum network data, ETH gas trends, verified contract metadata and source freshness. Deliver initial Ethereum research cards with non-advisory disclosures; respect provider licenses.",
  "Ethereum/EVM family is a strategic product capability, not yet established as a live licensed data feed.",
  ["Ethereum metric reports exact provider, block/time and chain ID","RPC/network failures cannot appear as live values","No wallet private keys or onchain writes","At least one independent E2E source verification"]),
 candidate("SF-P1-ONCHAIN-TOKEN","onchain_analyst",80,"token_due_diligence",
  "Build token intelligence and contract-risk research with evidence",
  "Create read-only ERC-20 metadata, supply/concentration/liquidity flags and source-cited risk cards. Review issuance, incentives and sponsored claims as research only.",
  "Token screening requires contract provenance, not a fabricated safety score or token-sale automation.",
  ["Unknown contract risk must show UNKNOWN rather than SAFE","Chain ID and verified contract address required","No issuance, swap, wallet access or pump promotion","False-positive and stale-data tests"]),
 candidate("SF-P1-PAPER-TRADING","paper_trading_engineer",78,"research_retention",
  "Create deterministic simulated trading laboratory with no real orders",
  "Model timestamped entry/exit, fees, spread, slippage, stop and drawdown for synthetic money; distinguish backtest vs forward paper positions.",
  "Trade education and strategy validation can be tested without executing customer money.",
  ["Simulator cannot connect broker or sign blockchain transaction","Replay uses market timestamps and records fees","No claim that paper returns are live realized money","Independent reproducibility test on recorded candles"]),
 candidate("SF-P1-RESEARCH-CARDS","frontend_engineer",77,"organic_growth",
  "Make research cards shareable with falsifiable thesis and provenance",
  "Link ETH/BTC evidence, strategy timestamp, source/mode, invalidation, community discussion and future outcome; generate SEO-safe public pages.",
  "Source-backed research sharing supports discovery and meaningful discussion.",
  ["Public card URL, semantic metadata and accessible mobile UX","Live/stale/demo provenance always visible","Discussion links to exact research revision"]),
 candidate("SF-P1-ABUSE-DEFENSE","moderation_risk",82,"community_trust",
  "Prevent coordinated manipulation, undisclosed promotions and toxic content",
  "Define triage for token pumps, false performance claims, bot accounts, impersonation and paid sponsorship; add queue observability and appeals.",
  "A Web3 community requires fraud-aware moderation before scale.",
  ["Report SLA and manual review state visible","No automated financial advice or mass token promotions","Appeal and audit record available"]),
 ];
 if(s.moderation.open>0){
  todo.push(candidate("SF-P0-OPEN-REPORTS","community_lead",100,"community_trust",
  "Triage real open member reports",
  "Review active moderation queue and correctly escalate harmful or manipulative posts to authenticated administrators; no blind auto-deletions.",
  "Live moderation aggregate reports "+s.moderation.open+" open items.",
  ["All reviewed items carry an authorized moderation decision","No non-admin write access","Independently fetch current open-report count"]));
 }
 if(s.users.signups7d>0&&s.community.posts7d===0){
  todo.push(candidate("SF-P1-COMMUNITY-ACTIVATION","community_lead",90,"activation_retention",
  "Reduce signup → first meaningful discussion friction",
  "Review anonymous-to-signed-in journey, topic prompts and approved onboarding, without fake seeding or automated member posts.",
  "There are genuine new signups but no published posts in the seven-day aggregate.",
  ["Measure post conversion with eligible cohort denominator","No test or synthetic participants counted","Moderator abuse policy active"],
  ["SF-P0-02"]));
 }
 if(s.signals.recorded>0){
  todo.push(candidate("SF-P1-SIGNAL-TRACK-RECORD","quant_researcher",85,"product_credibility",
  "Audit market signal provenance and forward evaluation",
  "Check signal generation, historical timestamps, candle-close assumptions and recorded versus closed evidence; prohibit look-ahead bias and profit guarantees.",
  "SignalForge reports "+s.signals.recorded+" observed signal rows; records are not independent accuracy proof.",
  ["Signal-to-candle reproducibility","Every public performance metric has a denominator","Separate live recorded, paper and backtest claims"]));
 }
 if(s.users.trials>0||s.users.paying>0){
  todo.push(candidate("SF-P1-TRIAL-PATH","customer_success",84,"paid_retention",
  "Improve measurable trial onboarding, billing explanation and cancellation",
  "Expose subscription state and help, first-day tasks and opt-in retention messaging; avoid implying cardless trial equals cash.",
  "Live aggregates include "+s.users.trials+" trial accounts and "+s.users.paying+" source-reported paying accounts.",
  ["All paid claims reconcile to Stripe receipts","Trial and renewal UX independently exercised","No involuntary emails"]));
 }
 if(livePolicy){
  const owners:Record<string,string>={
   "SF-P0-BILLING_RECONCILE":"billing_operator",
   "SF-P0-MODERATION_OVERDUE":"moderation_risk",
   "SF-P0-ACTIVATION_REPAIR":"lifecycle_growth",
   "SF-P0-RETENTION_REPAIR":"customer_success",
   "SF-P0-TRIAL_CONVERSION_REPAIR":"billing_operator"
  };
  for(const rule of livePolicy.decisions){
   const owner=owners[rule.code];
   todo.push(candidate(rule.code,owner,rule.priority,
    rule.code.includes("BILLING")||rule.code.includes("TRIAL")?"collected_cash":"activation_retention",
    "Resolve observed M20 issue: "+rule.code,
    rule.next_action,
    "Server-observed source cohorts: numerator "+rule.numerator+
     (rule.denominator===null?"":", eligible denominator "+rule.denominator)+
     ". Requires independently verified work outcome.",
    ["Use source-bound workstream and exact GitHub SHA",
     "Independently re-fetch product or payment evidence",
     "No live funds, customer actions, external dispatch or financial advice without existing authority"]));
  }
 }
 todo.sort((a,b)=>b.weight-a.weight||a.id.localeCompare(b.id));
 const date=at.toISOString().slice(0,10);
 const proposals:ProposedWork[]=todo.map(t=>{
  const r=roleMap.get(t.owner);
  if(!r||r.id==="independent_verifier")throw Error("INVALID_WORKPACKET_OWNER");
  return {
   id:t.id,parent_goal:GOAL,project_id:PROJECT,owner_role_id:t.owner,
   owner_department:r.department,priority_score:t.weight,
   priority_band:t.weight>=90?"P0":t.weight>=75?"P1":"P2",
   business_value:t.business_value,title:t.title,objective:t.objective,
   why_now:t.why,depends_on:t.deps,verification:t.verify,
   evidence_state:"INPUT_SOURCE_REPORTED",
   authority:"PROPOSAL_ONLY_EXISTING_GOVERNOR_REQUIRED",
   resources:{budget_usd:0,external_effects_allowed:false,real_trades_allowed:false,
    token_issuance_allowed:false,production_mutation_allowed:false},
   routing_state:"AWAITING_EXISTING_COMPANY_OS_WORKPACKET"
  };
 });
 return {
  schema:"signalforge.company-os.operating-board.v1",tenant:PROJECT,
  as_of:at.toISOString(),source_generated_at:s.generatedAt,
  managed_platforms:1,company_operating_team:organization.agents.length,
  managing_director:"managing_director",parent:"sina_founder_os",
  authority:"READ_ONLY_RECOMMENDATIONS_NO_PERMITS",operating_scheduler:"EXISTING_SINA_HEARTBEAT",
  goal:GOAL,operating_state:{
   current_real_users:s.users.total,signups7d:s.users.signups7d,
   active7d:s.users.active7d,community_posts7d:s.community.posts7d,
   open_reports:s.moderation.open,signal_records:s.signals.recorded,
   source_reported_paying:s.users.paying,verified_collected_cash_cad:null,
   meaningful_activation_rate:s.operatingMetrics&&s.operatingMetrics.eligible24h>=100
    ?Number((s.operatingMetrics.activated24h/s.operatingMetrics.eligible24h).toFixed(4)):null,
   d7_retention_rate:s.operatingMetrics&&s.operatingMetrics.eligibleDay7>=100
    ?Number((s.operatingMetrics.returnedDay7/s.operatingMetrics.eligibleDay7).toFixed(4)):null,
   paid_conversion_rate:s.operatingMetrics&&s.operatingMetrics.maturedTrials>=100
    ?Number((s.operatingMetrics.invoicePaidMatured/s.operatingMetrics.maturedTrials).toFixed(4)):null,
   source_reported_policy_issues:livePolicy?livePolicy.decisions.map(x=>x.code):[],
   source_operating_metrics:s.operatingMetrics||null
  },
  constraints:{
   global_scope:"ONE_PLATFORM_WEB3_ETHEREUM_SIGNALS_TOKEN_RESEARCH",
   external_work_needs_existing_governor:true,
   independent_verification_required:true,
   no_new_scheduler:true,no_live_trading:true,no_token_issuance:true
  },
  capacity:{max_proposals_returned:10,max_in_flight_strategic_workpackets:1},
  candidate_count:proposals.length,
  workpackets:proposals.slice(0,10),
  daily_plan_id:GOAL+":"+date,
  epistemic_status:"DATA_OBSERVED_FROM_PRODUCT_BUT_OUTCOME_UNVERIFIED"
 };
}
