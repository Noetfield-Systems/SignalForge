> **SignalForge 2026-11-14 community and commercialization:** [Independent Web3 research community, growth and first-cash execution](docs/SIGNALFORGE_COMMUNITY_REACHOUT_REVENUE_MASTER_v1.md). This work uses source-backed Polymarket, Hyperliquid and Solana research, retention and opt-in paid subscriptions; it does not include ARQANT's token, AGC or liquidity. Community participation and cash numbers require real externally verifiable evidence.

> **Current market entry — 2026-11-14:** Start from actual Web3 communities, not generic charts: [prediction market research](/web3#prediction), [perp DEX research](/web3#perps), [Solana token investigation](/radar). Source-linked Polymarket + Hyperliquid read-only public observations exist; other benchmark venues are research targets. [Canonical ICP/KPI contract](strategy/ICP_KPI_OPERATING_CONTRACT_v1.json) · [growth/runbook](docs/WEB3_NATIVE_ICP_GROWTH_PLAYBOOK_v1.md). WQRR and settled subscription cash require observed evidence; these are NOT proven results.

> **FOUNDER PRODUCT LOCK — 2026-11-13:** SignalForge is a premium crypto MARKET-INTELLIGENCE and research platform first: candlestick/OHLC terminal, explainable signals, market scanner, token research, backtests, watchlists, Signal Rooms and voluntary memberships. Company OS with 100 defined roles is an **internal operating layer**, not the customer product or a claim of 100 live agents. Read [AGENTS.md](AGENTS.md), [machine-readable product lock](strategy/PRODUCT-IDENTITY-SSOT-v3.json) and [operating master](docs/FOUNDER-PRODUCT-UX-OPERATING-CONTRACT-v3.md) before shipping.

# SignalForge
### Crypto market intelligence · candlestick research · explainable signals · Token Radar · strategy backtesting

[Production application](https://signalforge-web-production.up.railway.app/) · [SignalForge GitHub](https://github.com/Noetfield-Systems/SignalForge)

SignalForge is a read-only crypto market research product with a member community, historical backtesting, a provenance-aware track record and account-based access. **It is not a broker, a trade execution service, a profit guarantee or an investment adviser.**

## M20 operating forecast (planning, not observed revenue)

- [180-day operating plan and Company OS work gates](strategy/M20-180-DAY-OPERATING-PLAN.md)
- [Scenario assumptions](strategy/m20-scenarios.v1.json)
- Recalculate with `bun run forecast` (explicitly illustrative, all verified cash remains unknown).

## One operating company: SignalForge Web3 / Ethereum

- [Company OS operating manual](company-os/OPERATING-MANUAL.md): one managing director, Ethereum/onchain/quant, paper-trading engineering, token research, community, revenue, risk, SRE and independent verifier.
- [100 accountable work-role contracts](company-os/organization.v2.json) across 11 departments; these are defined specialist seats, **not 100 provisioned or independently active AI agents**. Historical 26-role manifest is retained as v1.
- [100-role Company Floor engine](company-os/workforce-floor.ts): source-driven, dependency-linked DISCOVER → DELIVER → REVIEW → VERIFY microtasks. Never self-claims dispatch or independent completion.
- Authenticated `GET /api/company-os/workforce` shares scoped read-only work plans with existing Company OS. Admin-only `/admin/company-floor` and `/api/admin/company-floor` display contracts, proposals and truthful runtime binding unknowns.
- [Deterministic operating engine](company-os/operating-engine.ts): evaluates actual authenticated aggregate inputs and emits prioritized, zero-external-effect WorkPacket **candidates**. Use `GET /api/company-os/operations` with the existing server-to-server Company OS workload key.

A single Sina Founder OS mission M20 remains the source of executive authority and existing Agent Fabric/Company OS owns actual execution, permissions and verification. No new scheduler or parallel agent registry.

## SignalForge-specific autonomous operating plan

- [SignalForge Autonomous Company Execution Master v1](docs/SIGNALFORGE-AUTONOMOUS-COMPANY-EXECUTION-MASTER-v1.md): 11 departments, 100 specialist role prompts, 24-hour bootstrap, event-driven continuation, test/evidence gates, 7/30/90/180-day outcomes.
- [Source-bound prompt/workboard compiler](company-os/signalforge-autonomy.ts) is accessible to the existing Company OS via authenticated `GET /api/company-os/autonomy` and to SignalForge admins via `GET /api/admin/company-autonomy` and `/admin/company-floor`. All output is a **read-only proposal**, not evidence that a model or tool has already executed.
- Existing Agent Fabric, Sina Founder OS, Runway/GitHub Actions and independent verifier remain the **only** task execution path; this change does not install a new runner or promise 100 concurrent model workers.

## Architecture

This repository is now the **canonical SignalForge product source**. It is intentionally separate from the Sina Founder OS / Company OS governance repository. Existing corporate operating infrastructure is reused rather than duplicated.

| Component | Canonical source | Hosting / status |
| --- | --- | --- |
| Web server, research API, authentication, Signal Rooms, Postgres schema, Company OS snapshot | `src/server.ts` | Railway service `signalforge-web` |
| Premium market terminal + Signal Rooms UI | `public/index.html` | served by web app |
| Premium source-aware candlestick landing | `public/welcome.html` | served at `/`, `/welcome` and `/start` |
| Growth and Stripe webhook worker | `services/growth-assets/railway-function.ts` | existing independent Railway Function, source imported |
| Lifecycle email worker | `services/lifecycle-worker/railway-function.ts` | existing independent Railway Function, source imported |
| Portfolio mission, business-priority Goalkeeper, governance and execution | `Noetfield-Systems/sina_founder_os` | Sina Founder OS, not reimplemented here |

**Deployment commissioned:** On 2026-11-10, Railway `signalforge-web` switched from the original compressed Bun Function to the GitHub-backed Docker/Bun source on `main` (commit `0eb762ee46362353135eaa631084c5c692194104`, Railway deployment `2d1cdbc6-ad93-4b9f-b49b-ad5d375abf04`, status SUCCESS). The pre-migration Function and bootstrap remain archived under `compat/` for rollback. Existing domain, PostgreSQL, secrets, growth and lifecycle services were preserved. Customer payment and moderation E2E still require separate evidence.

## Development

Prerequisites: [Bun](https://bun.sh/) and PostgreSQL.

```bash
bun install
# Set DATABASE_URL in your local environment, never commit a credential.
bun run dev
bun run check
bun run test
```

For tests, `NODE_ENV=test DATABASE_SSL=disable` is allowed only with a **disposable local/CI PostgreSQL database**. Test runner refuses any URL not containing `/signalforge_test`. Production always requires database TLS.

The CI workflow builds the Bun runtime and uses an ephemeral PostgreSQL 16 instance to verify real signup, session cookies, posts, comments, likes, reporting, administrator moderation, and the authenticated Company OS aggregate snapshot. No mock users are put into production.

## Deploying via Railway — controlled migration

Existing project: `signalforge-ai`, environment `production`, service `signalforge-web`. Existing domain:
`https://signalforge-web-production.up.railway.app/`.

1. Verify GitHub CI passes and a complete `main` commit is available.
2. In Railway, **stage** changing the existing web service source to `Noetfield-Systems/SignalForge` branch `main`.
3. In the *same* staged patch, set start command `bun run src/server.ts`, Dockerfile `Dockerfile` and healthcheck `/api/health`. Confirm the old source, database, domain, worker services and secrets are preserved. The `railway.json` matches the new runtime.
4. Commit the staged patch. Railway builds from GitHub. Require successful healthcheck and independent read-back of `/`, `/welcome`, `/api/health`, community reads, unauthorized writes, and authenticated Company OS telemetry.
5. Test real user account/signup, cookies, reporting, support and payments separately. Roll back to the previous successful deployment if healthcheck fails or any important request regresses.

**Do not** deploy a second production scheduler, database, agent registry or payment worker as part of the web migration. Avoid destructive database migrations and do not rotate the Company OS service token during a code-only move.

The growth assets and lifecycle worker files are source snapshots; they are **not** auto-deployed by the web service. They retain their current Railway Function configuration until separately migrated and verified.

## Public API and community

- `GET /api/health` — database/engine readiness, read-only operational claim.
- `GET /api/market`, `GET /api/scanner`, `GET /api/strategies`, `GET /api/backtest`, `GET /api/performance` — explainable research and performance; data-mode labels distinguish live public source from demo/fallback.
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` — persistent authenticated sessions.
- `GET /api/community/posts` and `GET /api/community/posts/{id}/comments` — public read.
- `POST /api/community/posts`, `POST /api/community/posts/{id}/comments`, `POST /api/community/posts/{id}/like`, `POST /api/community/posts/{id}/report` — authenticated member actions with bounded limits.
- `GET|POST /api/community/moderation` — moderator/admin only.
- `GET /api/company-os/snapshot` — service-token authenticated, strictly aggregate read-only metrics.

The Company OS snapshot returns only allowlisted aggregate counts. It does not export emails, user profiles or discussion text, and it does not authorize trades or consequential external effects.

## Founder OS / Company OS wiring

```
SignalForge web + PostgreSQL
    └─ GET /api/company-os/snapshot (workload bearer)
       └─ Sina Founder OS signalforge_adapter.py
          ├─ validate scope, timestamp, privacy and numeric aggregates
          ├─ SHA-256 receipt + bounded observation history
          └─ canonical organization_signals + M20-SIGNALFORGE-COMMUNITY
             └─ existing Company OS / Governor / independent verifier
```

Existing Founder OS service settings (not committed): `SIGNALFORGE_METRICS_URL` (exact public HTTPS endpoint) and `SIGNALFORGE_METRICS_TOKEN`; web expects `SIGNALFORGE_COMPANY_OS_KEY`. The original Company OS project is **not** embedded into SignalForge or duplicated here. SignalForge observations are source-reported until independently checked.

## Release and privacy policy

- No invented live users, trades, earnings, backtest accuracy, partner approvals, or paid subscription revenue.
- Source-reported market signals are **not** orders or portfolio performance guarantees.
- Secrets, customer data and production database URLs must remain in Railway Variables; never commit them or print their values.
- Human accounts, Stripe webhooks, moderation and recovery are independently verified before a broad public launch.
- Every significant release needs the GitHub commit, CI result, Railway deployment ID, request-level acceptance evidence and an explicit rollback route.

**Status (2026-11-10):** GitHub-backed application is live on Railway; healthcheck HTTP 200, unauthenticated community writes HTTP 401, non-admin moderation HTTP 403; CI passes on ephemeral PostgreSQL plus Docker build. A post-migration authenticated Company OS snapshot GET was observed as HTTP 200. Independent real customer/billing, full moderator and disaster-recovery journeys are **not yet certified**. See `status/COMMISSIONING-2026-11-10.md`.
