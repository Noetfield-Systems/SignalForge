# SignalForge — GitHub-backed production commissioning
Date: 2026-11-10 (UTC) · Product: SignalForge · Project: `signalforge-ai`

## Scope and evidence

| Gate | Outcome | Evidence |
| --- | --- | --- |
| Canonical product source | MERGED | [SignalForge PR #1](https://github.com/Noetfield-Systems/SignalForge/pull/1), commit `0eb762ee46362353135eaa631084c5c692194104` |
| Real PostgreSQL signup/community/moderation/Company OS integration tests | CI PASS | GitHub Actions SignalForge production readiness, `production-contract` |
| Buildable Docker/Bun app | CI PASS | Docker build from `Dockerfile`, native `bun run src/server.ts` |
| Production Railway source | GITHUB-BACKED | `Noetfield-Systems/SignalForge`, `main`, Dockerfile |
| Production deployment | SUCCESS | Railway deployment `2d1cdbc6-ad93-4b9f-b49b-ad5d375abf04` |
| Health | HTTP 200 | `POST /api/health` reached live service (test probe) |
| Anonymous community write | HTTP 401 | `POST /api/community/posts` |
| Non-admin moderation write | HTTP 403 | `POST /api/community/moderation` |
| Company OS aggregate read | HTTP 200 | `GET /api/company-os/snapshot`, authenticated traffic observed after source migration |
| Founder OS portfolio registration | MERGED | [Sina OS PR #155](https://github.com/Noetfield-Systems/sina_founder_os/pull/155), canonical project `signalforge-market-intelligence` and mission M20 |
| Existing database / launch URL / independent workers | RETAINED | Railway service inventory; no replacement Postgres or worker created |

## Operational boundaries

1. This release verifies server/build/authorization contracts, not real-customer conversion or collected cash.
2. The community is user-authored; app metrics are source-reported and do not constitute independent commercial evidence.
3. Existing Founder OS handles prioritization, replay-safe telemetry, WorkPackets and Governor decisions; this repository does not implement a parallel Company OS.
4. No automatic trading, exchange transaction, self-serve financial advice, or real-money disbursement capability is asserted.
5. The previous Railway Function can be recovered using `compat/railway-web-function.tsx` and `compat/railway-function-bootstrap.tsx` or prior Railway deployment `642b3058-253b-4fca-abef-7c5d437f4b8f`.

## Release blockers outside this code migration

- Independent real-customer signup-to-email-to-payment/entitlement/refund evidence
- Human moderation SLA, abuse escalation and privacy/terms acceptance
- External uptime and load testing, alerting, restore exercise and point-in-time database recovery
- Verification Layer signed receipt for user-critical operations where needed
- Revenue attribution and return-user retention from actual cohorts

These are tracked as workstreams under Company OS mission `M20-SIGNALFORGE-COMMUNITY`, not presented as completed.

**Decision:** Source migration commissioned; broad community and billing readiness remains conditional on independent E2E.
