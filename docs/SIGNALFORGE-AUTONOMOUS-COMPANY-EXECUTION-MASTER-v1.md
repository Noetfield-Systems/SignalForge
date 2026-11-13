# SIGNALFORGE AUTONOMOUS COMPANY — EXECUTION MASTER v1.0

**Scope**: SignalForge only · Project \`signalforge-market-intelligence\` · Founder OS strategic mission \`M20-SIGNALFORGE-COMMUNITY\` · 2026-11-13.

This is an implementation extension to the **existing** Founder product SSOT:
\`strategy/PRODUCT-IDENTITY-SSOT-v3.json\`; operating reference:
\`docs/FOUNDER-PRODUCT-UX-OPERATING-CONTRACT-v3.md\`; machine-readable role hierarchy:
\`company-os/organization.v2.json\`. Product identity, other venture boundaries and legal/entity ownership remain unchanged.

## 0. Non-negotiable outcome

Run **one SignalForge business** through its existing Sina Founder OS → Company OS → AgentOS/Agent Fabric → Runway/GitHub/Railway → independent verification path, with a persistent goal and *internally generated new prompts* for each bounded action. The Founder should inspect four times per day; the Company should continue execution and research between inspections. **Without another prompt from the Founder** does not mean **without prompts**.

SignalForge's customer product: source-aware crypto candlestick charts, market scanner, token liquidity research, explainable signals, reproducible backtests, market research notes, genuine Signal Rooms and voluntarily paid Pro/Quant memberships. Never pivot the consumer homepage into a 100-agent organization dashboard.

**Truth boundary**: 100 recorded role contracts and 11 departments are NOT 100 instantiated model runtimes. Machine-generated prompts and workboard proposals are NOT actual external agent dispatches, app code releases, payments, human users or signed proof. No live broker trading or digital-asset transfers are in the current SignalForge product contract.

## 1. Reuse the systems that exist

| Layer | Existing source of truth | Sole job for SignalForge |
|---|---|---|
| Permanent goal, founder authority | Sina Founder OS / \`M20-SIGNALFORGE-COMMUNITY\` | Store business intent, allowed operations, market-first ranking; never change mission when a short task closes |
| Executive & allocation | Existing Company OS executive / Governor | Choose best next opportunity from real observations; admit an approved WorkPacket with true source/ref/owner/budget |
| Specialization & reporting | \`company-os/organization.v2.json\`, existing AgentOS registry | 100 roles in 11 departments; allow event-driven use of their specialist prompts |
| Prompt Compiler | Existing Agent Fabric \`company_prompt_cycle.py\`, plus SignalForge-scoped input contracts | Convert goal+source+prior result+review into *next specialist prompt*; preserve lineage |
| Persistent execution | Existing Agent Fabric \`tasks\`/\`runs\`/Company OS bindings | Track claim/lease, provider call, artifact, review and continuation without duplicate jobs |
| Coding/tools | Runway, Motor, GitHub Actions and existing SignalForge repo | Real code patch, tests, PR, service release and HTTP check; not merely standalone unimported JS modules |
| Verification | Independent Verifier & existing readback workflow | Source SHA, CI, deployed SHA, product behavior, signable proof. A second LLM's opinion does NOT qualify |
| Product analytics | SignalForge PostgreSQL source aggregates | Human activation, retention, source freshness, signed billing/settlement and support feedback |
| Founder view | Existing authenticated \`/admin/company-floor\` | Four reviews a day: what *actually* ran, what changed, what passed, what is next, what is blocked |

**No parallel scheduler, AgentOS fork, customer database, Company OS queue or verification system.** WorkPacket admission and Tool permissions remain with canonical existing services. Use the existing 30-minute GitHub Company OS delivery schedule as one existing execution pulse. Add capacity only when source-backed work requires it.

## 2. First implementation in this repository

A product-scoped planner is now available in \`company-os/signalforge-autonomy.ts\`. It reads the **same** authenticated, freshness-validated \`compileOperatingBoard()\` used by the Company Floor. It emits:
- one accountable, source-linked **department head mission** for each of 11 departments;
- all 100 explicit **role-level Prompt Compiler inputs**, manager relations and atomic duties;
- candidate stage graph from \`compileWorkforceFloor()\`, with explicit Discover → Deliver → Review → Verify links;
- product identity, Project/M20 scope, source observation time and source-observed vs verified distinction;
- zero parallel schedulers, zero newly claimed provider executions and zero fictitious revenue/completions.

Authenticated routes:
- \`GET /api/company-os/autonomy\` — existing SignalForge server-to-server Company OS key only.
- \`GET /api/admin/company-autonomy\` — authenticated administrative account only.
- \`/admin/company-floor\` — executive product-specific visual surface; shows 11 current missions and compiled prompts.

**What this does not yet do**: these GETs do not submit arbitrary AgentOS tasks; they do not replace the existing Governor admission decision. A read-only proposal cannot be labelled an actual run. The existing Agent Fabric prompt cycle and work delivery endpoints own that next integration.

## 3. Technical contract — one durable chain

\`\`\`text
M20(goal_version, founder_authority, business objective)
  ↓ product observation (tenant-bound, freshness <= 10 min)
OperatingBoard(snapshot_hash, cohort evidence, workstreams)
  ↓ executive scoring and department choice
WorkPacket(goal_id, workstream_id, manager_role, worker_role,
           input_refs, acceptance, max_cost, required_tools, expiry)
  ↓ existing Governor accepts / records a canonical decision
PromptCompiler(goal + immutable project + role + evidence + prior result)
  ↓ existing Agent Fabric claims and leases task
Specialist agent (provider or Runway coding worker)
  ↓ artifact_ref + sha + tests + source refs + measured cost
Manager/Critic prompts (another model result, never VERIFIED)
  ↓ ACCEPT_FOR_INDEPENDENT_CHECK | REPAIR | RESEARCH_MORE
Independent Verifier (external GitHub/Railway/DB source readback)
  ↓ verified receipt or rejected reason
Outcome reconciliation (product impact and cost, never fabricated)
  ↓ next WorkPacket selected from SAME M20 goal and existing backlog
REPEAT even if individual worker crashes/restarts.
\`\`\`

### Prompt envelope fields

\`\`\`json
{
  "schema": "signalforge.agent-execution-prompt.v1",
  "company_project": "signalforge-market-intelligence",
  "parent_goal": "M20-SIGNALFORGE-COMMUNITY",
  "goal_revision": 3,
  "workstream_id": "<canonical-existing-bound-id>",
  "parent_task_id": "<existing-fabric-task-id>",
  "role_id": "<one-of-100-existing-roles>",
  "manager_role_id": "<existing-reports_to>",
  "phase": "DISCOVER|DELIVER|REVIEW|VERIFY|REPAIR",
  "observation_timestamp": "<source-observed-timestamp>",
  "source_refs": ["<bounded-existing-evidence-reference>"],
  "previous_result_sha256": "<real-provider-run-hash-or-null>",
  "acceptance_tests": ["<reproducible-test>"],
  "tools_allowed": ["<existing-authorized-tool>"],
  "external_effects_authorized": false,
  "budget_from_existing_authority": "<authorized-limits>",
  "result_requires": ["artifact_ref", "output_sha256", "next_action", "cost", "failure_reason"]
}
\`\`\`

The actual Prompt Compiler may assemble the complete text with this envelope and the latest source output. Its result is stored in the existing Fabric \`tasks\`/\`runs\` tables. **Never use a self-reported signature or model confidence as an execution receipt.**

## 4. The 11 simultaneous organizational missions

These are 11 **management workstreams**, not 11 concurrent paid models promised to be running at all times. Each manager uses specialists already defined in the 100-role registry.

| Dept | Head role ID | Work in first 24 hours | Real finish criteria | What the manager assigns next |
|---|---|---|---|---|
| Executive (3) | \`managing_director\` | Reconcile M20 existing task state and blocked handoffs | Accepted WorkPackets with owners, actual task IDs and receipts | Reprioritize on verified outcome or provider failure |
| Research (12) | \`head_research\` | Check Kraken OHLC, Solana token evidence, backtest assumptions | One source-stamped research artifact and defect/refinement ticket | Verify hypothesis against fresh data; hand to Data/Product |
| Product (10) | \`head_product\` | Trace landing → candle → research → save → return | Reproducible browser trace and bounded next UX PR | Test activation change; select next measured user friction |
| Engineering (20) | \`head_engineering\` | Fix first source-backed P0 product defect or integration gap | Tests+PR+CI+deployed SHA where authorized | Follow verifier feedback to repair/next highest-priority bug |
| Data (12) | \`head_data\` | Measure data freshness, cohort instrumentation and false-live risk | Source comparison, anomaly tests and real event definitions | Improve source reliability and customer-facing evidence |
| Growth (12) | \`head_growth\` | Build useful shareable source-linked content and activation funnel | Traceable research landing/SEO artifact and *real* users if obtained | Investigate strongest organic acquisition channel |
| Commercial (9) | \`head_commercial\` | Audit trial/checkout/webhooks/cancel/refund and member value | Signed webhook, real entitlement and independent cash evidence when available | Target actual observed pricing-to-paid drop-off |
| Customer (7) | \`head_customer\` | Classify real onboarding/support failures | Customer problem → accountable owner → tested resolution | Feed recurring friction to Product and update help content |
| Trust (7) | \`head_trust\` | Find highest-evidence auth, moderation or performance claim defect | Reproduction + test or specific customer-protecting fix | Recheck and close only after evidence |
| Operations (6) | \`head_operations\` | Read Railway/CI/DB/provider status and cost | Incident record or successful source-linked service readback | Retry stale queue safely, reclaim dead lease, improve cost |
| Verification (2) | \`independent_verifier\` | Audit actual source/output/CI/active service revision, independently | Receipt referencing true external source evidence | Return failed work to builder; publish verified outcome only |

Workers across divisions must not ask Founder for routine prompt wording, product requirements already in M20 or decisions already delegated. They may research and ask their accountable manager. Founder only gets truly consequential scope/budget/financial authority decisions; unrelated departments continue.

## 5. Scheduling: four founder reviews, continuous work

**Vancouver checkpoints**: 00:00, 06:00, 12:00, 18:00 local. These times are *for Founder inspection*, NOT an AgentOS execution schedule. Existing resident worker and canonical scheduler determine real execution frequency. An external reminder is neither needed nor wanted.

Each inspection must distinguish:
- source observations (users/markets/trials/support) with timestamp and source;
- actual model calls and output hashes, not roster count;
- changed code SHA, CI pass, deployment SHA, tested product behavior;
- independently verified vs peer-reviewed vs missing receipts;
- cost, usage, recovered work and failure reasons;
- new emitted prompt linked to the preceding result and unchanged M20;
- ranked next WorkPacket and exact exceptional Founder decision, if any.

Suggested operational SLA (targets until measured): median result→next-prompt < 2 minutes, queue replay idempotent after restart, recoverable worker leases < 10 minutes, source freshness explicit, no PII in prompt logs, zero false revenue/trade claims. Do not invent metrics where no observation exists.

## 6. 0–24 hours: proven domino, not 100 green agent badges

0–2 h: inspect existing decision-bound M20 WorkPackets and actual provider quota; select one independently reproducible customer/product issue; compile 11 department head prompts, retain the rest as standby roles.

2–6 h: run first *real* specialist task from existing Fabric, not from manually generated chat text; obtain output hash and actual provider run; compile next peer-review and repair prompts. In parallel, Engineering prepares a specific source fix.

6–12 h: make a real bounded code change, run Bun, PostgreSQL integration and Chromium smoke; independent source readback of candidate + active Railway revision. If no actual WorkPacket can be admitted, report exact owner/binding/decision deficiency instead of fabricating execution.

12–24 h: reconcile user/source/payment/incident evidence, issue next action to the proper role under the same M20 identity; independently prove **two sequential work cycles** and a real product/code effect, or expose the last broken link with cause.

### Admission and continuation tests

A. M20 project cannot become Earnloop, BuildRelay or another venture.  
B. 100 defined roles must map to 11 real departments and hierarchy is acyclic.  
C. 11 manager prompts must identify M20, source window, exact artifact and required acceptance.  
D. A source change can change priority without rewriting Founder goal.  
E. Peer review/repair never implies independent completion.  
F. Model quota exhaustion defers one task while other valid work can be handled.  
G. No double execution for the same workstream/phase under replay/restart.  
H. GitHub generated module is *not* a live product feature until integrated into the real application and deployed.  
I. A verified SHA alone does not count users, revenue, market signal win rate or cash settlement.  
J. If no canonical admitted WorkPacket is present, the system must show an honest “not dispatched” state, not a fake execution log.

## 7. Days 2–7: product and operating reality

Engineering/Data: finish source freshness, meaningful activation event stream, basic billing event correctness, auth/regression and recoverability.  
Product/Customer: first-use journey and saved research/watchlist.  
Research: explainable signal evidence, historical vs forward sample distinction and token research validity.  
Growth: real-source research pages and authentic discovery channels.  
Commercial: opt-in checkout and independently proven payment/entitlement lifecycle.  
Operations/Verification: close WorkPacket -> code -> CI -> Railway -> independent receipt -> next WorkPacket, track costs.

No department may report a fabricated subscriber or a paid subscription from a selected trial plan.

## 8. Days 8–30: retention and genuine acquisition

Deliver public research Evidence Cards, source-stamped permalinks, useful SEO snippets, opt-in digest/lifecycle and a three-step onboarding to one *real* source-linked research action. Instrument actual signup→research→saved note and eligible day-7 return. Start share/referral paths only with explicit attribution and abuse checks.

Initial hypotheses (NOT measured outcomes): activation24h ≥35% only when >=100 real eligible registrations; D7 return >=20% at adequate mature cohorts; independently verified billing and cancellation before paid-conversion claims. Smaller samples remain exploratory and do not create a fake statistical gate against shipping improvements.

## 9. Days 31–90: premium utility and settled economics

Improve reproducible backtesting and forward signal track record; paper simulation of fees/slippage **without placing real orders**; richer Solana/EVM source-linked token intelligence; research journal, watchlist reminders and meaningful Signal Rooms discussions.

Measure Pro CAD $29 and Quant CAD $99 plan usage, trial→paid from matured cohorts, real collected/refunded cash and provider costs. Do not call hypothetical MRR cash. Iterate pricing/features using observed conversion, not fabricated demand.

## 10. Days 90–180: validated expansion

Evaluate Research Team Workspace only after actual teams request it. Evaluate licensed API usage, multi-chain data and advanced wallet/holder visualization only when source rights and actual providers exist. Expand AgentOS slots only when per-result cost and queue pressure justify it; 100 role contracts do not mean 100 simultaneous paid model calls.

Scale the SignalForge company with the *same* existing Company OS; do not launch another scheduler, trading exchange, token program or portfolio-wide agent organization under SignalForge.

## 11. Failure handling / avoid artificial stops

| Failure event | Correct handling in existing OS |
|---|---|
| Provider quota or missing optional model | Persist already-compiled prompt; retry on existing worker heartbeat; route independent tasks to available workers |
| One department lacks triggered work | Keep role ready; seek authentic product evidence; continue other departments |
| Existing Company OS decision has no valid binding | Record exact decision/bridge deficiency and request canonical rehydration; never forge permission or use shadow queue |
| Task output malformed | Create source-sha-bound peer critique/repair prompt; bounded retries and actionable error |
| GitHub CI fails | Requeue same engineering workstream with actual logs; don't create an unrelated project |
| Unmerged generated library file | Integrate in real product through reviewed PR, user path and test; no unverified feature claim |
| Railway deploy failure | Existing release/recovery worker compares active SHA and restores prior healthy revision if authorized |
| Unsupported user statistics | State UNKNOWN, retain source provenance and improve instrumentation |
| Model critic says READY | Send to independent verifier; do not claim CI, settlement or release by model assertion |
| External financial/token/customer effects | Use the relevant existing access controls and audit receipts; continue unrelated lawful tasks |

## 12. Source and exit criteria

Current implementation is **not** a claim of fully autonomous company operation. The company already has an authoritative mission, role catalog, product/data APIs, Agent Fabric queue, internal prompt compiler and scheduled code-delivery job. This update makes the SignalForge-specific management/role prompt plan machine-readable and inspectable.

The next operational proof MUST be:
1. an admitted M20 WorkPacket existing in the canonical Company OS;
2. recorded real provider execution with output hash;
3. internally generated next prompt recorded as another task;
4. a real tested product change integrated in SignalForge code;
5. independently verified GitHub/CI/Railway/product readback;
6. a **second** actual M20 WorkPacket started from reconciled outcome, all without a new Founder message.

Only after items 1–6 pass do we say “the SignalForge autonomous company completed its first real two-cycle operating domino.” The 11 departments can then be scaled from measured queue and outcome throughput rather than invented staff counts.
