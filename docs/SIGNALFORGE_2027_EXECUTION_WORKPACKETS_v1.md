# SIGNALFORGE 2027 — IMPLEMENTATION MISSION, PARALLEL WORKPACKETS, TESTS & READBACK v1
**Status:** deployable backlog and Agent contract. No PR merge, deployment, user activation, payment or onchain transaction is implied by this document. Date 2026-11-14.
**Canonical owner:** SignalForge M20 under Sina Founder OS → Company OS Governor → Agent Fabric/WorkPacket → GitHub branch → tests → reviewed merge → Railway deploy/readback → independent verification. Reuse existing infrastructure; no new scheduling authority.

## 0. Branch claim and mission law
Before any coding agent edits files: load AGENTS.md, strategy/PRODUCT-IDENTITY-SSOT-v4.json, master amendment and this manifest; read latest main. Claim a uniquely scoped work item from the canonical Company OS dispatcher, including mission_id, workstream_id, owner role, dependency, file ownership, acceptance, exact base SHA and lease/expiry. Branch naming: feat/sf27-{workstream}-{short-job}-{issue-id}. If overlapping files or database migration conflict, manager establishes ordered ownership or flags conflict before edits. No two agents may claim the same live lease. A branch claim is not an assertion that a worker is running.
Isolated branches: develop/test/push; PR includes diff, known issues, test output and changed API/migration; no direct production overwrite. Merge order determined by dependencies, not arbitrary agent finish time. CI runs against tested combined SHA; rollback and migration compatibility required. Require independent verifier for CLAIMED_COMPLETE. Auto-merge only if branch policies and tests permit. Owner-signed financial/onchain effects remain separate.
Deliverables must specify: INPUT source → ACTION → ARTIFACT → TEST → DEPLOY/PROVIDER receipt → OUTCOME metric → NEXT ACTION.
Keep GitHub tasks, CI and Railway authoritative; static Company Floor rows are not evidence of running agents.

## 1. Workstreams that can run in parallel
| ID | Owner | Scoped changes / deliverable | Existing dependency | Acceptance |
| --- | --- | --- | --- | --- |
| SF27-01 | Product/UX | Terminal+Agent integrated design, mobile routes, functional navigation | current working /app, /web3, /radar | screenshots/browser E2E, no dead CTA, a11y, existing UI not broken |
| SF27-02 | Data/Research | Source-backed normalized Polymarket/Hyperliquid/Solana tool contracts and freshness | src/server.ts, web3 source, market integrity | schema tests, provider citation/timestamp, outage labeling |
| SF27-03 | Customer Runtime | typed research Agent Router, provider/model adapter, read-only tool runner, per-user job trace | SF27-02 schemas | real source output + response, rate/cost caps, cross-tenant test |
| SF27-04 | Persistence | saved theses, artifact versioning, memory opt-in, scoped file ownership | auth/Postgres baseline | additive migration + auth denial tests + reopen proof |
| SF27-05 | Alerts | opt-in scheduled monitors, dedupe and unsubscribe | SF27-02 / SF27-04 | real triggered event, clear delivery receipt, cancellation test |
| SF27-06 | Community/Growth | Research Cards, source replies, qualified referral + proof-based quest points | existing Signal Rooms/auth | no fake people, idempotent reward, consent, anti-sybil tests |
| SF27-07 | Studio/Skills | vetted templates, manifest, permissioned research widgets | SF27-02 / SF27-03 read-only tools | widget runs, test case, published listing with actual approval |
| SF27-08 | Commercial | Pro/Quant real entitlements, usage cost metering, API payment adapter skeleton | existing Stripe workers; SF27-03 | signed paid invoice, settled report, cancel/refund, cost ledger |
| SF27-09 | Trade Simulation | paper fills and source-linked journal, order intent schema, provider adapter interfaces | market source/integrity and SF27-04 | deterministic fill/slippage test, SIMULATED badges, no real orders |
| SF27-10 | Connected Finance | read-only account and later user-signed trade connector | SF27-09; actual provider contract/capability | proof of consent/scope/revoke, real provider ack and reconciliation before "live" |
| SF27-11 | Token/Economics | points, token whitepaper candidate, allocations, legal/chain/product mapping | SF27-06; source access | points ledger and QA now; chain/sale separate signoff and receipts |
| SF27-12 | Independent QA | CI, source checks, security, deploy/rollback and public status | every workstream | SHA+CI+Railway+browser+payment/onchain when applicable |
No named WorkPacket is "DONE" until corresponding live provider records/readback exist.

## 2. First 72 hours: implementation priority
**P0-A (source and UX):** prove current /app, /web3, /radar, signup, research sources and signup→save routes. Preserve old endpoints. Repair broken flows immediately.
**P0-B (research agent):** expose three bounded source-only actions for real Polymarket event, Hyperliquid funding/OI, Solana pool research; emit source, timestamps and mode; agent answers one user prompt in-app.
**P0-C (retention):** create a source-aware research artifact and saved thesis with owner scope; add one source-specific share URL.
**P0-D (commercial):** verify one existing real Pro/Quant checkout path through signed webhook and processor readback; no invented revenue.
**P0-E (growth):** add meaningful first free task and a real, traceable nonfinancial referral link/credit flow, not a token sale waitlist.
These are prioritized deliverables; timelines are goals, not proof.

## 3. P1/P2/P3 launch phases
**Days 4–14:** agent chat streaming/workflow traces; read-only tools; save and share thesis; cohort events; one monitor; three authentic venue-specific research examples; pricing and cancellation tests; private alpha invite.
**Days 15–30:** opt-in Telegram notification with user linking; source-backed Rooms improvements; qualified referral ledger; initial proof-based quest board; mobile UI; basic Studio templates; first real paying cohort experiment.
**Days 31–60:** paid/usage metering, stable research API with source limits and customer receipts; multiple monitor templates; widget publishing and revision controls; simulated trading journal; meaningful builder participation.
**Days 61–90:** integrated paper-trade view, connected read-only account where supported, provider contract evaluation for user-authorized execution, paid builder endpoint pilot, production cost/retention/readback; optional token sale legal+technical packaging in separate independent workstream.
**90–180 days:** genuine execution connectors if all actual dependencies and approvals exist; multi-provider data coverage; marketplace creator settlement; mature token distribution/claim only once the finalized approved chain/offer exists. None of these may hold up unrelated software/Research/Community growth.

## 4. Data migrations and rollout
Migration numbers additive and centrally assigned. No dropping existing tables or weakening signed Stripe evidence. Feature flags:
SF_AGENT_READ_ONLY, SF_ARTIFACTS, SF_ALERTS, SF_STUDIO, SF_QUEST_POINTS, SF_REFERRALS, SF_PAPER_TRADING, SF_CONNECT_READ_ONLY, SF_LIVE_EXECUTION, SF_TOKEN_CLAIMS, SF_TOKEN_SALE.
Production defaults are disabled for nonexistent live features; enable read-only features as they pass QA. Financial effects have independent server checks; hiding a button is not permission control.
The internal Company OS integration remains service-token authenticated and aggregate-only; customer tasks must not receive internal credentials.

## 5. Acceptance suites
T01 Source provenance and freshness across all existing and new providers; no DEMO_DATA passed as LIVE.
T02 Anthropic/OpenAI-provider independent model adapters are configurable and tests mock providers; outputs do not invent market fields.
T03 Prompt injection from market descriptions/research replies cannot grant tools or trigger orders.
T04 Cross-tenant tests for message, memory, file, artifact, reward ledger, referral and wallet links.
T05 Recurring job idempotency, timed cancellation, suppressed duplicate notification, retry and cost cap.
T06 Reward fraud: self-referral, duplicated proof, cooldown bypass, multiple wallets, same event/quest double counting.
T07 Payment: invalid Stripe signature, replayed invoice, wrong price ID, refund, cancellation and entitlement expiry.
T08 Trade: paper/live labels; quote expiry; wrong chain; stale symbol; failed provider; retry after unknown status; partial fills; revocation.
T09 Token: cap, vesting, balance arithmetic, claim replay and merkle double-claim, treasury signing; no mainnet until explicitly authorized.
T10 UI: mobile 360px+, keyboard, RTL-safe where localized, no fictitious price/partner/cash fields, functioning deep links and disabled unshipped CTAs.
T11 Deployment: GitHub CI, active production commit, healthcheck, live unauthenticated public routes and authenticated flows; rollback rehearsed.
T12 Commercial: real user research, qualified WQRR, confirmed paid charge, actual variable cost; no model/test records count as customers.

## 6. Decision rights and automation
L0 discover/analyze/source-check automatically; L1 implement and test scoped code automatically; L2 create PR, publish authorized research and community posts within real account scope; L3 spend bounded provider compute and trigger existing pipeline as granted; L4 issue real token, move funds, deploy LP or execute orders only through actual signer/provider authority and applicable venue/regional conditions.
Do not ask Founder twice for already recorded product objectives or for every reversible design decision. Do not treat normal market/commercial risk as a reason to stop. Do not fabricate external grants or approvals.
A task may proceed while other independent workstreams await a real integration, bank approval, or token sale decision.

## 7. Runtime and release verification schema
For each merged release write:
- mission/workpacket identifier and exact original input;
- claimed branch lease/owner, base SHA, head SHA, PR link;
- tests run plus code coverage/known exclusions;
- code review and independent verifier identity;
- Railway deployment service/environment, active SHA and health;
- user path tested and actual external provider status;
- product metric observed vs target;
- any real cash/chain receipt reference only if collected/confirmed;
- outstanding issues, owner and next source event.
No "launched", "active AI workforce", "paid subscribers", "minted tokens", "live trading" or "user acquisition" claims from planning rows.

## 8. Milestone dashboard
M0 current source+auth+payments baseline verified (evidence, not assumption).
M1 real Agent answers one live-source question in Terminal (3 lanes).
M2 real user saves and later reopens sourced thesis.
M3 real opted-in alert triggers and can be revoked.
M4 real source-linked public Research Card is shared and opened by another person.
M5 first independently verified paid Pro/Quant settlement with cost allocation.
M6 one independently operated third-party widget/skill with non-owner usage.
M7 points/referral idempotent ledger and actual qualified human activation.
M8 deterministic paper-trade and reconciled user-read venue connector.
M9 live user-signed trade where supported with provider receipt and eligibility.
M10 token economic policy selected, issuer/chain/rights and audit package signed.
M11 actual token deployed with verified contract and public explorer.
M12 eligible claim/sale/LP executed with independent receipts and user-facing disclosures.
Stages M9-M12 are independently gated by actual authority; M1-M8 can be released earlier.

## 9. Cost/budget protocol
Per-market-request cost estimate and hard quota; per-model inference spend; daily job cap per user and budget tier; subscription gross contribution; upstream provider cost alerts and error rate. Any experimental third-party provider should be behind adapter/flag and removable, avoid platform lock-in.
Build initial free utility with existing endpoints to minimize burn; monetize only actual valuable incremental recurring workflows.

## 10. Final master execution instruction for coding agent
"Load v4 Founder Product Identity and all v4 amendment docs before proposing any changes. Preserve currently working research, Company OS and Stripe paths. Claim one mission-scoped branch lease, implement and test bounded real functionality, open PR, verify integrated production source and metrics. Prioritize first real sourced Agent task, saved research, authentic user retention and first settled payment. Build points/referral/token readiness in parallel; do not call a point a live token, do not call a proposed connector a live trade, do not claim a worker ran until canonical dispatcher and CI receipts exist. If blocked on a real financial/region/provider dependency, progress all other independent workstreams. Continue until verifiable product artifacts exist."
