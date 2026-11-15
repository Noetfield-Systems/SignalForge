# SignalForge × Bankr — Verified competitive implementation matrix

**Mission:** M20-SIGNALFORGE-COMMUNITY · **Date:** 2026-11-14 · **Nature:** Public documentation benchmark, not an endorsement or a claim of copied code.

**Primary public references:**
- https://docs.bankr.bot/agent/overview/
- https://docs.bankr.bot/features/overview/
- https://docs.bankr.bot/agent-api/overview/
- https://docs.bankr.bot/token-launching/overview/
- https://docs.bankr.bot/x402-cloud/overview/
- https://docs.bankr.bot/llm-gateway/overview/

Bankr publicly describes a shared multi-surface Agent runtime, persistent workspace, scheduled automations, crypto wallet, code sandbox, extensible Skills, payment-capable tools, paid API hosting and metered model access. Its token-fee-to-compute mechanism is contingent on actual token trading and fee collection; SignalForge must not adopt "self-funding" as an unverified profitability assumption.

## Decision matrix

| Verified Bankr capability | User value | Technical and distribution mechanism | Revenue path | SignalForge equivalent / gap | SignalForge original advantage | Priority / acceptance |
| --- | --- | --- | --- | --- | --- | --- |
| Natural-language commands | One interface rather than ten forms | Agent routes text to tools across Web/social/CLI | Subscription and metered compute | SF27 source-router research beta shipped to main, model-led reasoning not yet verified | Explicit market evidence and falsifiable claims | P0: provenance tests and live Agent proof |
| Persistent agent, memory and files | Continue work across sessions | User-state store, durable filesystem, conversation tools | Recurring membership | Owner-scoped research jobs and theses; conversation memory/files missing | Thesis timeline and invalidation over time | P0/P1: reopen across sessions, tenant isolation |
| Multi-surface agent | Research from web and messaging | One user identity and shared job state | Acquisition/retention | Web-first Agent beta; Telegram/CLI not claimed | Identical source receipts on any channel | P1/P2: authenticated Telegram link + same job IDs |
| Agent API and jobs | Reliable programmable execution | Jobs, status, cancellation, rate limits | API usage | Read-only synchronous API now; queue/cancel absent | Market-aware typed tools, source freshness policy | P1: durable job state, cancellation tests |
| Wallet and multi-chain trading | Execute compatible onchain commands | Wallet per user, signer, provider adapters | Trading/service fees | No live trading; optional wallet path specified | Explicit separation of evidence, simulation and provider receipts | P2/P3: exact user-signed order, reconciliation |
| Scheduling/DCA/TWAP | Automate recurrent tasks | Scheduler, trigger, market tools | Subscription/execution fees | Existing internal lifecycle worker; customer automation not shipped | Source-aware thesis invalidation monitor | P1: user opt-in monitor, run receipt, cancel |
| Sandbox and Skills | Extend workflows with code | Isolated code/file environment, skill registry | Usage/creator economics | Forge Studio specified, not live | Peer-reviewed research templates and reproducible widgets | P2: publish/install/run with scope and sandbox |
| Market research | Explore technical and token information | Venue and price/social adapters | Core product conversion | Kraken, Polymarket, Hyperliquid and Solana live adapters already present | Cross-venue source-linked market reports | P0: real source evidence or explicit outage |
| x402 paid endpoints | Agents buy API output per request | HTTP 402 payment requirements and settlement | Pay-per-request | Developer API exists; x402 not live | Individually auditable research query receipt | P2: verified settlement + metered delivery |
| Unified LLM gateway | One API for models + tracked usage | Provider router, credits and failover | Consumption margin | Model catalogue exists; no verified customer model gateway | Explicit compute budget per market research job | P1: provider keys, cost log, fallback, quotas |
| Token launching | Creator can deploy and collect protocol-defined fees | Supported chain launcher + token/fee routing | Trading-dependent launch fees | SignalForge token plan is unratified, no mint/sale/claims | Independent utility in research, contributor economy | P3: testnet contract/claims and real signer evidence before live |
| Community/syndication | Viral discovery and sharing | Twitter/X, Telegram, Farcaster, referrals | Acquisition/creator fees | Signal Rooms and beta shareable Research Card | Evidence-first peer reputation, return-to-retest loop | P1: attributable qualified readers, author follow-up |

## Architecture choice

Build **one market-first customer runtime** (authenticated research, memories, typed tools, metering, automations and eventually permitted venue actions), separate from the **existing internal Founder OS / Company OS**. The customer runtime never receives internal service tokens.

**First connected hero workflow:** Market Pulse → ask a question → source-backed Agent response → private source snapshot/thesis → public Research Card if explicitly published → return later to compare changes. This is the differentiation to prioritize over a generic all-in-one chat clone.

## Current implementation truth

The read-only Agent milestone was merged through PR #105. Its bounded deterministic router, /agent UI, owner-scoped research history, private theses and explicit publishable research cards are source changes; production verification remains separately recorded in live checks. This beta **does not yet include frontier-model inference, conversation threads, recurring user automations, Skills commerce, wallet execution, x402 payment processing or token minting**.

## Unit-economic constraint

Service revenue, token-sale proceeds, treasury inventory, trading volume, creator liabilities and off-chain points are different ledgers. An agent cannot claim its compute is self-funding until collected net revenue or net fee income exceeds actual metered compute, payment, source, infrastructure and operational costs.

## Benchmark maintenance rule

Reverify the live public Bankr docs and SignalForge release SHA before changing this matrix. Features must be labeled specified, implemented, CI-tested, deployed, user-authorized and settled separately. Do not copy Bankr branding, protected code or creative assets.
