> **Founder product identity override (2026-11-13):** SignalForge's PRIMARY CUSTOMER BUSINESS is crypto market intelligence: OHLC candlestick charts, Market Scanner, Solana Token Radar, explainable signals, historical backtesting, saved research, authentic Signal Rooms and optional paid subscriptions. The 100-role Company OS is only the INTERNAL MANAGEMENT AND DELIVERY LAYER for that product. The Noetfield/Sina Company OS may itself be a separate reusable parent-portfolio technology, but its organizational architecture must never replace SignalForge's customer-facing trading research market positioning. Read [product identity lock](../strategy/PRODUCT-IDENTITY-SSOT-v3.json) and [departmental delivery contract](../docs/FOUNDER-PRODUCT-UX-OPERATING-CONTRACT-v3.md). If an execution plan or UI promotes agent/headcount/org structure in place of candles and market research, classify FOUNDER_INTENT_DRIFT and repair the product path.

> **2026-11-13 workforce expansion:** SignalForge now has **100 defined work-role contracts across 11 departments** in [organization.v2.json](./organization.v2.json) and a typed [workforce-floor.ts](./workforce-floor.ts) workstream decomposition. This does **not** mean 100 AI processes, paid employees, authorized executions or verified completed tasks. The existing Sina M20, Agent Fabric, Governor, verifier and scheduler remain authoritative. The admin-only `/admin/company-floor` renders this private projection; real activity requires authenticated canonical dispatch/readback. v1 is historical.

# SIGNALFORGE COMPANY OS — ONE PLATFORM, ONE EXECUTIVE BRAIN

> **Founder OS-first correction, 2026-11-10:** This file describes SignalForge as one **real proving product** operated by the reusable Company OS. The primary technology/product being created is Sina/Company OS itself, which should discover, build, verify, operate, monetize and improve products without repeated Founder prompts. Neither the 100 role contracts nor SignalForge feature work constitute the completion of autonomous OS engineering. Preserve this manual's detailed SignalForge teams and tasks as an example, not as the top-level business or OS architecture. Canonical parent: [Sina OS-first complete rewrite](https://github.com/Noetfield-Systems/sina_founder_os/blob/main/architecture/OS-FIRST-COMPANY-OS-END-TO-END-v2.fa.md), [machine-readable direction lock](https://github.com/Noetfield-Systems/sina_founder_os/blob/main/architecture/OS-FIRST-FOUNDER-INTENT-LOCK-v2.json). Continue using existing M20/Agent Fabric/Runway/Governor/Verifier and unchanged product/legal boundaries.

**Status:** executable read-only decision compiler + typed organization, with the existing Sina Founder/Company OS responsible for dispatch. 2026-11-10.

## 0. A single firm, not a portfolio

Parent: Sina OS (human founder goals, constitutional budget/authority, escalations).
**Exactly one scoped SignalForge operating unit in the existing Company OS:** crypto market intelligence, explainable signals, token research, saved research, community, honest subscriptions and their maintenance. Paper trading and additional EVM intelligence are feature roadmap work until independently verified; they are not the present homepage's main claim.
Six product desks are **feature domains**, not separate legal companies, directors with independent authority, databases or schedulers. SignalForge's only product repository is `Noetfield-Systems/SignalForge`.

Current real source: GitHub-backed Bun web app in Railway `signalforge-ai`, durable PostgreSQL, existing independent growth/lifecycle services and the Sina Founder OS M20 mission. Source is not proof of a paid customer, real trade, chain-indexer or live token.

## 1. The exact hierarchy

```
FOUNDER — SINA OS
  decides immutable strategic objective, limits of authority, money/budgets,
  disputes, external effects, exceptional legal and reputational decisions
                  |
                  v
SIGNALFORGE MANAGING DIRECTOR (one CEO / Goalkeeper)
  prioritizes value and risk; delegates roles; admits only existing Governor-
  eligible work; closes goals only from independent evidence
   |             |            |            |             |              |
 Research    Engineering    Community    Commercial    Trust        Operations
  Head         Head         & Growth      & Customer     Head         & Finance
   |             |            |            |             |              |
 Ethereum     Data Engineer  Member Ops   Billing        Security    SRE
 Onchain      Backend        SEO          Customer       Moderation  Finance
 Tokenomics   Frontend       Lifecycle
 Quant        Paper Trader
              Integration QA
           \\ 
            └── Independent Verifier → reports directly to Sina OS, never CEO.
```

Canonical machine-readable roles: [organization.v2.json](./organization.v1.json). They are **100 defined role contracts**, not 26 continuously running LLM processes, salaried people or evidence that 26 independent remote agents have already been provisioned. The existing Agent Fabric supplies model/task execution on demand. `SPECIFIED_AGENT_FABRIC_BINDING_PENDING` must change to an independently verified binding when the actual worker role has been commissioned.

**Decision hierarchy**, highest authority first:
1. Immutable founder intent, legal/safety and external-money constraints (Sina).
2. Deterministic Goalkeeper and execution gates; **a model vote does not beat these**.
3. SignalForge MD: select the single most important outcome and parallelizable specialist tasks.
4. Department head: prepare task decomposition, tool scopes and acceptance criteria.
5. Specialists: research/code/write tests/draft evidence. Not self-approved production effects.
6. Independent verifier: independently fetch source, deploy, transaction and outcome evidence.
7. MD receives outcome and continues / repairs / escalates; Sina is interrupted only when budget, external money, legal exposure or authority changes.

### Hiring is a runtime process, not a permanently running swarm
- Role definition: role ID, reporting manager, responsibility, tool scopes and forbidden actions.
- Binding: existing Agent Fabric `researcher / engineer / operator / revenue / chief_of_staff` and an approved prompt, routed by function; no new registry.
- Trigger: fresh event, unfinished verified goal, failure, or routine bounded heartbeat.
- Model tier: deterministic evaluator first; inexpensive reasoning/fast model for routine drafting; escalate only on novel ambiguity or contradiction.
- Invocation cost cap: governed per task with global resident budget, no token-burning roundtable on every poll.
- End condition: verified outcome or explicit blocked state. Inactive roles incur no inference cost.

## 2. Six departments, one product lifecycle

| Desk | Does in the real platform | Evidence required | Current vs proposed |
| --- | --- | --- | --- |
| Ethereum / EVM | ETH and EVM network watch, read-only contract risk, gas/chain provenance | verified chain ID, block, timestamp, permitted provider | Proposed read-only module; do not claim it is live |
| Signals / Quant | Explainable setups, indicators, timestamped track record, bias-controlled backtest | data-source mode, candle provenance, strategy replay | Baseline live |
| Paper Trading | Purely simulated orders and risk/position analytics, *never actual exchange orders* | deterministic fills, fee/slippage model, no wallet signing | Proposed |
| Token Intelligence | token supply, distribution, liquidity, vesting, risk and sponsorship disclosure | contract address, source, unknown-risk flags, licensing | Proposed |
| Community & Growth | Signal Rooms, research discussions, credible referrals, user-onboarding loops | authentic member actions, moderation/abuse decisions, cohorts | Base live, advanced analytics proposed |
| Commercial & Operations | Trial, paid subscriptions, Stripe reconciliation, support, SRE | payment/refund ledger, actual collected cash, support events | Baseline exists, full financial acceptance pending |

## 3. Five concurrent continuous company loops — same worker/brain

All loops run as **one standing mission M20 and one resident Sina worker cadence**, not separate bots that replicate a queue or cron.

**A. Data / Reliability loop (up to each existing heartbeat)**
Read authenticated snapshots, schema/age check, market source freshness and incident signals. Flag (data mode != verified live) explicitly; invalid input blocks downstream claims. No inference needed for healthy/no-change periods.

**B. Product / Engineering loop (on new goal or blocked build)**
MD chooses the highest potential commercial fix → engineering head decomposes into code/test/UX tasks → existing Company OS Fabric creates permitted internal tasks → GitHub CI → authorized Railway deployment → independent receipt → back into MD state. A merged PR alone isn't a completed economic goal.

**C. Ethereum / Signals / Token Research loop (source-driven)**
Read BTC/ETH market evidence, EVM chain information only after approved RPC/usage rights, create source-linked research and hypothesis revisions. Quant specialist keeps backtests separate from forward-signal outcome. The onchain analyst highlights manipulation, unknown contract risk and concentration. Paper trading stays fully simulated.

**D. Community / Customer / Growth loop (on authentic activity and report backlog)**
If open reports >0 prioritize human-admin triage. If new signups but no first discussions, fix the researched-first-session experience. If sharing grows but signups don't, change distribution/onboarding. Opt-in only for outbound emails. Do not manufacture community posts or promise future coin prices.

**E. Monetization / Learning loop (on verified Stripe/payment and cohorts)**
Verify cash charged/settled/refunded, entitlement and churn from independent ledger, not trial plan-selection; compute activation and D7 return from eligible human cohorts. Only real behavior changes strategy.

## 4. Actual 24-hour agent operating rhythm (illustrative, not an executed transcript)

- **00:00–06:00**: low-cost telemetry and reliability checks on existing cadence; silence/no model calls when nothing changes. Incident gate escalates instead of writing speculative analyses.
- **06:00**: MD reads most recent eligible real signals; chooses and ranks the top 1–3 tasks based on cash, activation, retention, trust and dependency. No second planning loop.
- **07:00**: research specialists validate new Ethereum/token sources; Data Engineer checks provider provenance; Quant checks historical vs forward labels.
- **08:00–12:00**: backend/frontend/QA work in parallel on *approved internal* drafts with independent code/test artifacts. Risk team runs negative-path tests; no production mutation by the content agent.
- **12:00–15:00**: user-facing growth work from authenticated activity and content reports. Moderator operator triages real reports. No synthetic activity.
- **15:00–18:00**: authorized release window for independently checked revisions; webhook/revenue reconciliation and backup drills have priority if broken.
- **18:00–24:00**: independent evidence review, updated next-work rankings and a short founder cockpit summary. Incomplete work stays open.

These clock times are **a designed routine**, not six independently installed timers, and tasks can run 24/7 only when existing agent runtimes are available and authorized.

## 5. One concrete causal chain, fully typed

Example inputs (hypothetical): 250 **genuine** registered users, 60 source-observed active this week, 12 new signups, 0 posts in seven days, 3 open moderation reports, 24 recorded signals. Paid user and cash reconciliation are still unknown.

1. Existing Sina heartbeat fetches `/api/company-os/snapshot` with a scoped workload bearer; no private user text.
2. SignalForge `GET /api/company-os/operations` accepts the same bearer, validates the **production-only** aggregate and produces deterministic tasks. Open reports win P0, Stripe proof and instrumentation follow, then Ethereum and token research.
3. MD selects `SF-P0-OPEN-REPORTS`, `SF-P0-BILLING-PROOF` and `SF-P0-COHORT-METRICS` as top candidates, *not* as automatically authorized commands.
4. Sina Founder OS's existing M20 mission and scoped strategic intake may admit internal zero-budget WorkPackets; Company OS/Fabric uses the existing `researcher/engineer/operator/revenue` execution role. Independent verifier has no code-writing power over its own verification target.
5. Verification confirms e.g. one restored moderation queue test, Stripe receipt or coded cohort. Company OS ACK/Verifier closes the workstream; Goalkeeper repicks only when evidence proves progress.
6. Nothing here executes a real trade, mints a token, pays a user, buys ads or sends unsanctioned DMs. Missing Governor authority makes those actions blocked, *not* simulated success.

**M20 cadence loop**: Observations → MD priority → deterministic typed work candidates → existing Governor/Company OS → approved Agent Fabric task → evidence → receipt → next highest outcome.

## 6. Deterministic arbitration and acceleration

Order of authority: risk/financial incidents > verified cash leak > activation/retention instrumentation > Ethereum and signal data trust > high-leverage customer utility > polish. Normal priorities in `operating-engine.ts` run from 100 (open reports) to 77 (organic evidence cards), based on real input observations and known missing proof.

**Speed comes from suppressing wasted work**, not running every role every minute:
- No change in validated product facts → no new external action.
- Always keep the 100 specified roles *available* to map to approved tasks; only activate requested specialists.
- Independent evidence mandatory for marking done.
- Data/contract verification can run parallel to product drafts; revenue, token and production external effects stay separately gated.
- One continuous task graph in canonical Sina/Company OS; code work always targets `Noetfield-Systems/SignalForge`.
- Reconcile failed work or dependencies first, then optimize conversion, then expand research modalities.
- Product-side capacity describes at most four proposed scoped strategic streams and eight parallel internal drafts; the existing canonical Company OS must still enforce its own live configuration and resource limits. This is an intentional safety gate, not inability to use many specialists.

## 7. Outcome gates for 7 / 30 / 60 / 90 days

| Window | Work that can actually be assigned | GO criteria | What is not proven by doing it |
| --- | --- | --- | --- |
| D1–7 | canonical role contracts, data/Stripe/restore QA, typed operating board | verified authorized internal task → actual PR/test/receipt | actual sales |
| D8–14 | ETH research card, token metadata provenance, no-wallet paper trade specification | real licensed chain source / testable simulation | live onchain trading |
| D15–30 | share cards, onboarding, community and billing fixes | signup→research cohort measurable, signed micro-charge/refund if permitted | predictable revenue |
| D31–60 | Ethereum and EVM read-only research beta, reliable alerts, retention experiments | authentic return visits and source freshness | forecast trading edge |
| D61–90 | subscription packaging optimization, robust forward-paper trading report | matured paid cohorts with third-party charge evidence; reproducible paper fills | user profitability guarantees |
| D90+ | token intelligence deepening, team research workspaces only after demand | real customer pull + unit economics + source rights | token issuance readiness |

## 8. Costs and business forecast constraints

Current site-listed monthly product prices (not a promise): Pro CAD $29 and Quant CAD $99. The thirty-day trial has no card requirement. If a user chose a paid plan during the trial, it is **not received revenue**.

For a scenario with 100 new registrations/month, 40% completing research and 3–8% of matured trials converting, the *illustrative* monthly cohort may eventually produce only 3–8 retained paying subscribers (assuming full retention) and roughly CAD $118.50–$316 gross modeled MRR at CAD $39.50 assumed plan mix. **It can also generate CAD $0 collected cash.** Cloud, API, verification, refunds, marketing and tax are excluded. No probability is asserted without measured acquisition and settlement data.

**High-speed business goal:** prove one real charge/refund reconciliation, 100 meaningful first actions, genuine community replies and source-linked ETH research before adding new expensive AI prediction models.

## 9. Deploying this component

Source files:
- `organization.v1.json` — exactly one company, agent hierarchy, tool scopes, six desks, invariant policy.
- `operating-engine.ts` — deterministic validator, candidate prioritizer and read-only packet compiler.
- `GET /api/company-os/operations` — authenticated server-only projection from the **existing** aggregate snapshot. Returns no credentials/user profiles or automatic permits.
- `tests/company-os.test.ts` and `tests/integration.test.ts` — role and schema gates, deterministic priority and real-Postgres E2E auth checks.

Existing runtime:
- `sina_founder_os/apps/founder_os/signalforge_adapter.py` — live authenticated intake and receipt.
- `sina_founder_os/portfolio/STRATEGIC-EXECUTION-MISSIONS-v1.json` M20 — parent outcome and canonical Company OS workstreams.
- `sina_founder_os/apps/agent_fabric/company_os_bridge.py` — canonical worker task bindings via existing Agent Fabric.
- No external dispatch is activated by this product repository alone.

### Definition of real completion

**Complete = GitHub SHA + CI green + Railway active revision + scoped authenticated runtime readback + user-relevant behavior + independent receipt**, and separate evidence of cash/traction if the task is commercial.

A submitted plan, named role, generated PR, sourced market signal or simulated trade by itself is **not** business completion.
