# SIGNALFORGE 2027 — SOURCEA EXECUTION ADAPTER v5

**Status:** implementation tracked in PR #108; production behavior and user adoption require live readback. **Identity:** SignalForge remains the market research product. SourceA remains an independent reusable execution/proof source. Sina Founder OS/Company OS remains the internal operator.

## Source inspection / factual ownership

- Read SourceA `AGENTS.md`, `repo-policy.json` and `graph-out/GRAPH_REPORT.md`. The graph was generated **2026-07-09** and is not a current index of all modern SourceA files; no full-repo rebuild is claimed.
- SourceA `packages/executive-control-plane-v0/src/hash.ts` (blob `3cfa38be34a9cc98c5749333c61905c49354a5de`) contains canonical sorted-key SHA-256 hashing. The portable algorithm is adapted in `src/sourcea-execution-adapter.ts`.
- SourceA `packages/executive-control-plane-v0/src/kernel.ts` (blob `8aedd6fee71ceb83d896e0a17dab0f20c31cede5`) defines EvidenceReceipt/WorkPacket completion and rejects unverified completion. SignalForge ports the evidence-required semantics without copying the corporate kernel or its authority state.
- `packages/mcp-sourcea-verify/src/tools.ts` has a **MOCK_ONLY** fallback when no actual receipt is supplied. It must never be represented as a production independent execution provider. This adapter does not call that fallback.
- `Noetfield-Systems/sourcea-boot` is a Python boot/preflight validation package. Its policy/provider/receipt/queue checks are useful for CI and operators but are **not** a network executor or persistent job scheduler. It is not imported into Bun.
- SourceA's Forge Core and Graph Studio implementations have internal/local and specialized routes, not a verified customer-safe remote API. Therefore first release uses an **existing SignalForge Bun + PostgreSQL executor**, not an assumed SourceA cloud service.

## Owned boundaries

| Owner | Capability |
| --- | --- |
| SignalForge | Customer authentication/session, market sources, private tasks, Postgres, community, Stripe, consumer interface, token and financial authority |
| SourceA portable contract | Stable task/output schema, evidence-required acceptance, SHA-256 artifact and receipt integrity, bounded skill manifest |
| Sina Founder OS | Internal engineering WorkPackets, GitHub/release operations, agent-company execution, private service credentials |
| Existing Railway | `signalforge-web` task pump, `Postgres`; no new scheduler cluster or duplicate Company OS |

## First vertical

1. Authenticated user enters a market question on `/agent`.
2. `POST /api/agent/tasks` compiles `sourcea.signalforge-workpacket.v1`, assigns UUID, persists `QUEUED` and a timeline event, returns HTTP 202.
3. Existing Bun web process polls PostgreSQL using `FOR UPDATE SKIP LOCKED`. A 60-second lease and max two attempts survive process failure without duplicate concurrent claims.
4. Whitelisted SignalForge research tool queries live read-only Kraken, Polymarket, Hyperliquid or Solana source data. Failed upstreams return explicit failure, never simulated source as live evidence.
5. Evidence-required evaluator checks tool scope, unchanged prompt, source URLs and observation timestamps. It accepts only fresh `SOURCE_OBSERVED` results.
6. Original source observation is persisted as a versioned research artifact, with canonical packet/artifact hashes and tamper-evident execution receipt. A separate pure verifier recomputes the digest without using a trusting completion flag.
7. Successful research is also written into existing `agent_jobs` so private theses and publishable Research Cards continue working.
8. `GET /api/agent/tasks/{id}` returns user-owned timeline, artifact, receipt, usage; `GET /api/agent/tasks/{id}/verify` checks the stored content again.
9. User can cancel queued/running requests. In-flight cancellation suppresses persistence and the success receipt even if the upstream request completes. A failed or canceled task can be retried within the hard attempt budget.
10. Opt-in `/api/agent/schedules` records hourly/daily/weekly prompts using the same existing task pump; disabling an individual schedule requires only the owning user.

## UX

The product UI remains SignalForge branded. `/agent` exposes Ask SignalForge, private Task Timeline, historical Task List, Research Artifact Viewer, Receipt Inspector, Source Recheck and Automation Builder. It retains the public anonymous research path and existing price/subscription, Signal Rooms and market pages.

## Runtime truth and costs

- **Runtime:** `SIGNALFORGE_LOCAL_READONLY`; no SourceA cloud executor, remote SourceA signer, GPT frontier-model inference or user trade permission is implied.
- **Receipt:** integrity digest, not a signature. Valid digest establishes that artifact and WorkPacket match the stored receipt and were evaluated against the declared source policy. It does **not** independently verify upstream venue data or prove external order execution.
- **Usage:** wall-time milliseconds, source tool call count and model call count are recorded; no model call means zero model-charge USD. Provider-billed amounts, infrastructure allocation and settled cost are `null` until independently itemized, not fabricated as zero.
- **Scope:** tasks, schedule reads/actions, receipt reads and replay all require user session and owner ID. Existing internal Company OS service-token authority is never provided to customers.
- **Avoided work:** No complete SourceA monorepo copy, fake cloud task dispatch, new Railway service, cloned scheduler, wallet connection or token activity.

## Acceptance and evidence

- Unit tests: `tests/sourcea-execution.test.ts`.
- Disposable PostgreSQL tests: `tests/sourcea-tasks.integration.test.ts`, covering owner isolation, wrong origin, cancellation, replay bounds, artifact tamper, receipt checking, schedules and history.
- Existing `bun run check`, `bun run test`, Docker build and GitHub CI must all succeed before merge.
- Independent live readback must confirm the actual production commit, public `/agent`, private auth-denial, supported source, task lifecycle and proof checking using a temporary isolated account. No self-test customer counts as a genuine paying member.
- No claim of full 2027 architecture or actual SourceA remote execution is made from a successful source build alone.

## Open dependencies

A full current SourceA graph rebuild, verified remote SourceA API connector and PyPI `sourcea-boot` invocation against the customer's chosen project are separate optional deliverables. Pay-per-run, true compute cost allocation, developer Skill sandbox, user trading and onchain token economy require their own receipts and cannot be marked live from this adapter.
