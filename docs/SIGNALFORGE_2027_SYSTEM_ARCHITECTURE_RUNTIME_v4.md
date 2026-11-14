# SIGNALFORGE 2027 — SYSTEM ARCHITECTURE + DUAL AGENT RUNTIME v4
**Document type:** executable architecture design (planned). **Source baseline:** Bun/TypeScript Railway web app in src/server.ts; public/index.html, welcome.html, token-radar.html; existing PostgreSQL; existing growth/lifecycle workers; Company OS via the existing Founder OS. This document does not assert that new components exist in production.

## 1. Architectural north star
Adopt a modular monolith first, isolate untrusted code and financial actions at boundaries, then separate services based on observed cost/load. Keep current deployment, auth, billing and DB. Add typed interfaces, well-scoped tables/queues, and route-based feature toggles without replacing working product paths.

~~~text
FIRST-PARTY SURFACES
Web Market Terminal / Mobile Web / Signal Rooms / Forge Studio
              |  Web Chat | Telegram | CLI | other permissioned channels
              v
Identity, session, tenant, rate limit, entitlement, per-feature authorization
              |
    +---------+----------------+--------------------+
    |                          |                    |
Market Data + Provenance   Customer Agent Core   Community + Economy
Kraken/Polymarket/        Router, planner,       posts, comments, rooms,
Hyperliquid/Solana        skills, memory, jobs   points, quests, referral
    |                          |                    |
    |                       Tool Gateway             |
    |              +-----------+-----------+        |
    |              |           |           |        |
    |        Research APIs   Sandbox    Connect/    |
    |                                    Trade      |
    |                                    Adapter    |
    +----------------------+-----------------------+
                           v
                Artifact + Evidence Store
                 market observations, links,
                 job steps, receipts, revisions
                           |
                  Alerts / Publish / API
                           |
            Stripe + Metering + x402 optional
                           |
          Independent telemetry & reconciliation
-------------------- TENANT / AUTHORITY BOUNDARY --------------------
Existing Sina Founder OS → Company OS → Governor → Agent Fabric
→ scoped GitHub PR / tests → Railway deployment → independent verifier
Internal operator uses separate keys, grants and work packets.
~~~

## 2. Separate the two runtimes explicitly
| Dimension | Company OS (internal) | Market Agent Runtime (customer) |
| --- | --- | --- |
| Owner | Founder, scoped venture operators | Signed-in end user or approved team owner |
| Objective | Build, QA, deploy, support, grow SignalForge | Answer research requests, build personal tools, execute consented tasks |
| Dispatcher | Existing canonical Sina/Company OS/Governor/Agent Fabric | New customer-specific conversation/workflow coordinator |
| Identities | WorkPacket + agent/role IDs | user_id, tenant_id, delegated connector ID |
| Secrets | GitHub/Railway/Stripe server secrets via existing runner | NEVER internal keys; user-specific vault references |
| Money authority | Owner-controlled budget and approved deployment | Per-user wallet/venue authorization, scope, amount cap and expiry |
| Evidence | commit SHA, CI, deployment SHA, receipt | market source, script trace, task artifact, order/tx receipt |
| Data isolation | Business operational context | Strict row-level user isolation and scoped file/skill ownership |
| Scheduling | Existing canonical internal scheduler only | Customer jobs in product-local queue with separate permissions |
| Status claim | actual dispatched job only | actual task execution only |

Do not route customer tasks through the internal founder governance agent prompt, and do not let publicly installed Skills read internal operating data.

## 3. Customer Agent components
**A. Intent Router:** deterministic classification first: observe/research, save/alert, simulate, create widget, consume paid API, connected order, transfer/claim. For ambiguous market identifiers resolve symbol+venue+chain before any consequential action. Model choice is behind adapter; provider and prompt versions logged.
**B. Tool Registry:** typed contract for every tool: tool_id, version, input JSON schema, output schema, source mode, permission scope, estimated cost, timeout, data-classification, audit event. Initial read-only tools wrap existing market, scanner, strategies, backtest and web3 pulse. New registry must call actual implemented APIs; never emit invented numbers.
**C. Research Planner:** short bounded multi-step plans with max tool calls, concurrency, per-request cost ceiling, retries and circuit breakers. LLM cannot self-grant scopes.
**D. Evidence Builder:** every factual result attaches source_url/provider, symbol, chain, observed_at, fetched_at, source_mode, stale threshold, method and uncertainty; card may include counter-thesis and invalidation conditions. Unsupported observations display "unknown".
**E. Durable User Memory:** preferences, saved theses, followed markets, notification rules, opt-in contextual memories and reset/export/delete. Memory is not authorization to place trades.
**F. Job Scheduler:** server-side queued tasks for alert/watchlist/report workflows, with job_id, next_run, owner, retry/backoff, budget spent, execution receipt and cancellation. Do not install a second internal Company OS scheduler.
**G. Artifact/File Space:** scoped markdown/JSON/research cards/widget manifests with ownership, revisions, dedupe, retention and export.
**H. Skill/Widget Runtime:** approved declarative widgets first; any user code in network-restricted ephemeral sandbox, CPU/time/storage limits, no inherited credentials, signed manifest and optional explicit network capability allowlist. Distinguish owner editing from third-party install.
**I. Model Gateway:** OpenAI-compatible providers where appropriate, cheap router for metadata tasks, elevated model only for complex synthesis; cost attribution per tenant and job; respect rate limits. Model generated text is evidence *annotation*, never source of price truth.

## 4. Contract-first tool examples
~~~json
{
  "tool_id": "market.perps.snapshot",
  "version": "1.0",
  "effect": "READ_ONLY",
  "input": {"venue": "hyperliquid", "symbols": ["BTC", "ETH"]},
  "output": {"sources": [{"provider":"hyperliquid","observed_at":"ISO-8601","mode":"SOURCE_OBSERVED"}], "rows":[]},
  "cost_usd_cap": 0.02,
  "permissions": ["research:read"]
}
~~~
Tools to implement/wrap in order: market.events.research; market.perps.snapshot; token.solana.inspect; candles.kraken.query; scanner.run; strategy.backtest; thesis.create/update; alert.schedule/cancel; card.publish; widget.compile. A trade order is a separate effectful tool and cannot be implemented by re-labeling a read-only tool.

## 5. Execution ladder (do not conflate)
L0 PUBLIC_RESEARCH: anonymous supported source data, reproducible results; no wallet.
L1 USER_WORKSPACE: account saving, opt-in notification and private automated reports.
L2 SIMULATE: paper fills with modeled fees/slippage, repeatable strategy snapshots; explicit simulated label.
L3 CONNECTED_READ: OAuth/API permission for balances/positions and exchange history (read-only).
L4 USER_SIGNED_ORDER: supported provider, owner-confirmed order preview, idempotency key, platform/product eligibility checks, signed request, acknowledged status, reconciliation. Trade stays under user's external venue account; do not claim SignalForge becomes a broker.
L5 DELEGATED_BOUNDED: optional later user policy for time/amount/instrument restrictions, independent kill/pause, expiry and every execution receipt, after actual provider+jurisdiction readiness and E2E proven failure handling.
L6 PLATFORM EXCHANGE: NOT in this amendment: would require separate business model, jurisdictional analysis, custody and regulatory treatment.
Fail-closed only for effectful finance; research/free community work continues independently.

## 6. Trade architecture, broker connectors and correctness
All orders flow via a single connector interface:
- Quote/read source; venue credentials reference; jurisdiction/provider capability; instrument chain; qty and currency; expiry.
- Deterministic preflight: fresh quote, user intent, min/max notional, balance, fee + slippage estimate, sanctions/eligibility as applicable, rate limits, price impact.
- Present order preview showing side, size, venue, route, estimated costs, execution mode. Explicit signed authorization except within separately granted bounded delegation.
- Exactly-once business semantics using request_id + idempotency key and durable append-only order event ledger; on retry query venue status before resubmit.
- Store signed order receipt, external order ID or tx hash, fill events, fees, cancellations, reversals and timing. Support partial fills and stale orders; mark unknown status as unresolved, never "success".
- Model outputs cannot sign transactions; users or constrained connectors do that.
- Separate quote feed and execution feed; a research signal never silently becomes a market order.
Adapters: read-only Polymarket/Hyperliquid first; compatible trade bridges subject to actual permission and coverage. Bankr may be an OPTIONAL adapter after its commercial API license terms are reviewed; do not build all finance through Bankr.

## 7. Data model, tenancy and event taxonomy
Extend existing PostgreSQL via additive migrations; don't rewrite auth/billing.
Suggested tables and keys:
- sf_agent_sessions(id, tenant_id, user_id, channel, created_at, status)
- sf_agent_messages(id, session_id, role, content_ref, model, tokens_in/out, source_mode)
- sf_agent_jobs(id, tenant_id, owner_id, kind, status, schedule, budget_cents, spent_cents, cancel_at)
- sf_agent_steps(id, job_id, tool_id, input_digest, output_digest, source_ref, execution_status)
- sf_research_artifacts(id, tenant_id, owner_id, visibility, market_ref, thesis, falsifier, source_set_hash, version)
- sf_market_observations(id, venue, instrument, chain_id, source_mode, observed_at, fetched_at, payload_hash)
- sf_widget_manifests(id, owner_id, version, template_type, permissions, review_status, usage_count)
- sf_wallet_links(id, owner_id, provider, address_or_external_id, scopes, expires_at, revoked_at)
- sf_order_intents(id, owner_id, provider, instrument, qty, side, cap, status, idempotency_key)
- sf_order_events(id, order_intent_id, provider_order_ref, type, amount, fee, received_at, receipt_hash)
- sf_rewards_ledger(id, owner_id, program, event_id, delta_points, source_receipt, status)
- sf_referrals(id, referrer_id, referee_id, campaign_id, qualification_state, uniqueness_hash)
- sf_token_allocations(id, owner_id, class, snapshot_id, amount, claim_status) **only once chain/eligibility defined**
- sf_entitlement_usage(id, tenant_id, feature, quantity, external_payment_ref, cost, status).
Every event has immutable server timestamp, owner/tenant, authorization reference and provider provenance. Unique constraints for payout claims, payment events, referral credit and order submissions.

## 8. API surface extension (paths are proposals, not shipped routes)
Read/command: POST /api/agent/sessions; POST /api/agent/sessions/:id/messages; GET /api/agent/jobs; POST /api/agent/jobs/:id/cancel; POST /api/research/artifacts; GET /r/:slug; POST /api/alerts; GET /api/skills; POST /api/studio/widgets; GET /api/rewards/me; GET /api/referrals/me; GET /api/token/manifest.
Connected finance: POST /api/connectors/venue/link; POST /api/orders/preview; POST /api/orders/authorize; GET /api/orders/:id; POST /api/orders/:id/cancel. Never place a live order via GET.
Billing: reuse existing Stripe signed webhook/price-to-tenant checks; introduce usage meter, provider cost and x402 receipt reconciler only when external integrations exist.
Internal Company OS continues service-token aggregate read endpoints; do not export user prompt bodies or wallets to internal public dashboards.

## 9. Quality, perf and readiness targets (targets, not current SLAs)
- Anonymous first trusted source result p95 < 4 sec where source available; chat first evidence p95 < 8 sec for short tasks.
- Tool invocation max 5 on free standard task; cap per-job dollars and periodic budget. Retry with idempotency.
- Useful daily return rather than constant push; notifications opt-in, local quiet hours, unsubscribe and digest.
- 99.9% availability aspirational post-hardening; actual uptime must be observed.
- Version each prompt, skill, API connector, data source and model. Preserve reproducibility and user export.
- Security tests: prompt injection through market notes, cross-tenant leaks, arbitrary skill privilege escalation, over-billing, repeated webhook and order retry, delayed stale quotes, token Sybil, double reward, failed payment and unsubscribe.
- No fabricated "smart money" identity, win rate, live price, profit, transaction, agent invocation or account.

## 10. Architecture migrations
M0 contract/test fixture for source modes and tool schemas, add provenance table.
M1 market-agent read-only chat as modular source routes; maintain all legacy endpoints and UI.
M2 saved memory/research card + alerts, first-party telemetry and rate limit.
M3 declarative widgets + isolated sandbox only if necessary, typed external provider adapter.
M4 paper-trade and order-event schema.
M5 connected read and bounded user-signed orders after actual provider/region support.
M6 optional x402/paid Skill directory and token claim after separate economics/chain readiness.
Each step carries additive migration, test, deploy SHA, health and rollback route.

## 11. Source references
Existing repository: https://github.com/Noetfield-Systems/SignalForge
Bankr runtime: https://docs.bankr.bot/agent/overview/
Bankr App SDK sandbox constraints: https://docs.bankr.bot/apps/sdk/
Bankr plugin direction: https://docs.bankr.bot/skills/overview/
FINTRAC perimeter: https://fintrac-canafe.canada.ca/msb-esm/msb-eng
CSA trading platform description: https://www.securities-administrators.ca/investor-tools/crypto-assets/buying-and-selling-crypto-assets/
