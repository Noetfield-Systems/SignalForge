> **Living ICP source override, 2026-11-14:** [Web3 ICP/KPI contract](../strategy/ICP_KPI_OPERATING_CONTRACT_v1.json) and [research-to-revenue runbook](./WEB3_NATIVE_ICP_GROWTH_PLAYBOOK_v1.md) supersede any historic generic chart-first acquisition statement below. Real Web3 native segments: prediction markets, perps, Solana token trenches. Read-only Polymarket and Hyperliquid sources have been implemented at `/web3`; later text that calls them unshipped is historical. WQRR is a TARGET, currently unmeasured, not an invented retention statistic.

# SIGNALFORGE — FOUNDER-LOCKED PRODUCT, UX, BUSINESS & EXECUTION CONTRACT
Version 3.0.0 · 2026-11-13 · Internal source of truth · Owner: Founder

**Rule 0: Do not turn SignalForge's public product into a landing page for Company OS, Paperclip or a fictional 100-agent organization.** SignalForge sells useful crypto-market intelligence and research, not its management structure. Company OS is its internal mechanism for building, maintaining and growing the business.

Canonical machine-readable lock: [PRODUCT-IDENTITY-SSOT-v3.json](../strategy/PRODUCT-IDENTITY-SSOT-v3.json). This document interprets that contract. In a conflict between historical marketing concepts and this contract, preserve the Founder goal and update the historical asset rather than letting it silently redefine the product.

## 1. Business identity: what the customer actually buys

**SignalForge = AI-powered crypto market intelligence & evidence-based research workspace.**

The user has a market question: *What is moving, why might it matter, what is the evidence, how have comparable rules behaved historically, and what will invalidate my thesis?* SignalForge helps answer it through:

- Professional spot OHLC/candlestick research, volume and supported indicators/timeframes.
- Public-market scanner and explainable technical signal criteria.
- Solana Token Radar for source-observed liquidity and DEX market activity.
- Historical strategy backtests with documented trading assumptions.
- Timestamped forward signal track record, kept separate from simulated results.
- Saved research, watchlists, evidence notes and Signal Rooms for authentic members.
- Optional research subscriptions, with voluntary Stripe checkout and genuine entitlements.

**Customer segments:** independent crypto traders, active market researchers, onchain token analysts, Web3 developers, and small professional research teams. A developer inspecting our engineering code is a secondary hiring or partner audience, not the primary above-the-fold market buyer.

**Commercial model:** freely accessible discovery and a strong first research action → relevant reason to create an account → repeat research → opt-in Pro/Quant membership → genuine settled contribution margin. Real value is customer utility; paid clicks, invented users, paper strategy PnL, unchecked checkout redirects, trial selection and agent counts are not revenue.

**Single core activation:** the visitor inspects one actual source-reported market or token, understands at least one specific insight/context field and can continue the research path. Secondary events: authenticated watchlist/research-note creation and meaningful member discussion. Track eligible cohorts, not button-click vanity.

## 2. Founder correction: Web3-native market and community benchmarks (2026-11-13)

**The core market references are NOT TradingView / DEX Screener / Nansen.** Those are secondary tooling and market data comparisons, NOT the ecosystems in which the SignalForge venture must establish authentic standing.

Actual Founder-specified Web3 market categories and named venues (explicit from the supplied market research excerpt):

| Core market | First-party named market references | Product opportunity | Community / distribution work |
|---|---|---|---|
| Prediction markets | **Polymarket, Kalshi** | Event probability, market activity, liquidity, catalyst and resolution intelligence | Builder programs, market researchers, developer forums and event traders |
| Perp DEX | **Hyperliquid, Lighter, Aster, Variational** | Perp open interest, funding dynamics, risk, explainable source-provenance changes | Public API builders, trader communities, educational/source-backed tools |
| Meme coin trenches | **Founder specified category without named venues in that excerpt** | Fast Solana token discovery, attention and liquidity/holder changes | Public creator, meme trader and Telegram communities; genuine source-linked contributions |

**Additional researched meme terminal products (not falsely attributed as prior Founder-confirmed named benchmarks):** pump.fun, Axiom Trade, GMGN.ai, Photon, Trojan. Their market-entry and product parallels are listed in [the source-classified atlas](../strategy/WEB3_NATIVE_MARKET_ATLAS_v1.json).

**The original complete market report path is NOT VERIFIED.** The Investor Memorandum dated November 11 later categorized incumbent tools; do not misstate that latter document as the original Founder Web3 market research. This correction supersedes references in this file and in historical Company OS proposals that treat general chart software as the *core* competitive ecosystems.

**Product rule:** SignalForge is a Web3-native signal/research/community participant. Research the active venues and build authentic useful tools **for their traders, builders and token communities**, not generic chart replicas. Begin with existing public read APIs and operationally reusable source evidence. Event-market radar, perp OI/funding, launch/token radar, source-aware analysis, opt-in community loops are bounded product workstreams—not claims that those features already shipped. Preserve current functional Kraken charts, Solana Radar and subscriptions as baseline components until new features are genuinely delivered.

Technical/UX references **only**, subordinate to the real market: TradingView (candle UI), DEX Screener (pair lookup/data discovery), Nansen/Arkham/Bubblemaps (provenance/holder UI examples). They can inform component design but must NEVER outrank Polymarket/Kalshi/Hyperliquid/Lighter/Aster/Variational/trenches in the SignalForge M20 planner, Company OS prompt compiler or outreach backlog.

**Operating loop:** actual Web3 source/community observation → usable free research artifact → legitimate participation/feedback → product code+tests → independent CI/deploy readback → user return/paid conversion if real → next role-owned WorkPacket. No fictional partners, traction, outgoing messages or financial results.

## 3. UI design and interaction invariants

- Visual identity: Obsidian/Graphite foundation; warm champagne gold for primary CTAs, source-aware mint for favorable or active context; restrained red for negative market moves. High-contrast typography, precise grid, editorial whitespace, professionally dense data panels.
- Landing hierarchy: brand/navigation → "Research every move. Trade with context." → actual sourced candle market desk → product capability blocks → research context → discover/analyze/validate/track/discuss workflow → real plans → conversion.
- The hero terminal is a functional preview, not a screenshot of fictional account balances. BTC/ETH/SOL and 15m/1h/4h controls fetch existing \`/api/market\` with \`mode\` checked. \`DEMO_DATA\` is *never* silently shown as live. If unavailable, the user sees explicit source-unavailable copy.
- Product links must resolve to actual tools: \`/app?view=dashboard|scanner|strategies|backtest|trackrecord|community|models|api|pricing\`, \`/radar\` and \`/app\`. The app router must recognize the allowlist and must not override Stripe billing-return behavior.
- Maintain a professional terminal (candles are the visual focal point) and unify Token Radar styling. Preserve all existing authenticated flows, historical-research caveats, and plan/payment integrity.
- Prefer CSS/SVG and current-source data. No fictitious statistics, fake customer logos, invented partner claims, fake trading performance, claimed 100 live agents, or decorative market prices without clear "illustrative" labeling.
- Responsive breakpoints: wide desktop, tablet, 720px and 460px mobile; navigation is keyboard-operable, interactive chart controls have state, layout doesn't overflow, and reduced-motion is supported.
- Public sitemap: marketing homepage, token radar and meaningful token research pages. Do not expose private Company Floor or admin workstreams to SEO.

## 4. The Company OS belongs INSIDE the business

The 100 roles in \`company-os/organization.v2.json\` form an organizational contract. They are **not** proof of 100 humans or 100 always-on AI processes. Company OS does not replace market product delivery, users, transaction economics or independent outcomes. Existing Sina/Founder OS mission M20, canonical task queue, Agent Fabric, Governor and verifier must be reused. Do not create a shadow scheduler or autonomous executive body per product.

Detailed division ownership:

| Division | Accountable outcome | Atomic work and acceptance evidence | Outbound effects |
|---|---|---|---|
| Executive | Outcome arbitration and fastest useful next task | Rank source-backed goals; WorkPacket has scope, owner, dependency, evidence and cost | Existing Sina/Governor for exceptional authority |
| Research | Market hypothesis and contract/token research integrity | Source & timestamp attached; audited strategy conditions and unknowns | No investment advice/execution promises |
| Product | Professional terminal & complete research journey | Measurable, keyboard/mobile-accessible user journey; link to actual shipped path | App improvements through canonical change route |
| Engineering | Product services and feature releases | Typed API, chart or data code + unit/integration/E2E + rollback | GitHub CI and authorized Railway release |
| Data | OHLC, DEX, freshness, ingestion and cohort correctness | Provenance mode, source contract, idempotent storage, valid candles | No synthetic live feed |
| Growth | Real users, organic reach and retention | Tracked source-qualified activation, opt-in distribution and qualified referral | No fake messages or bulk unauthorized spam |
| Commercial | Plan UX and revenue | Signed Stripe invoice, entitlement, refunds and independent cash reconciliation | Actual payments only through existing secure flow |
| Customer | Effective onboarding and support | User issue → owner → next action → resolved behavior → recorded feedback | Account/customer access requires authorization |
| Trust | Research credibility, privacy, fraud and moderation | Reproducible authorization tests and evidence-backed incident handling | Escalate actual abuse; don't fabricate gates |
| Operations | Reliable platform and contribution-cost control | Working health/readback, source timeout recovery, incident response and costs | Existing services only; no duplicate infra |
| Verification | Independently verify technical and business outcomes | Source SHA + CI + active Railway + user-visible behavior + signed proof where required | Never self-approve or self-certify |

For every actual work item the manager must define \`trigger → owner → atomic action → artifact → CI/acceptance → independent evidence → next action\`. The organizational catalog is an assignment map, not a completed execution ledger.

## 5. Product priority and responsibility routing

1. **Working market research path**: charts source reliably, user chooses symbol and timeframe, scanner is useful, Token Radar reports actual source evidence. Engineering + Data + Product; Research verifies claims.
2. **Conversion of research into a retained workspace**: research-note/watchlist onboarding, Signal Rooms and meaningful member callbacks. Product + Customer + Growth; Trust moderates.
3. **Credible signal and backtest product**: score definitions, data quality, reproducible historical calculation, forward sample separation. Research + Engineering + QA/Verifier.
4. **Revenue collection and retention**: voluntary plans, functioning signed Stripe billing and cancellation, measured retained subscribers and margin. Commercial + Finance + Customer.
5. **Market expansion**: additional network intelligence, richer onchain data and modeled hypothesis evaluation only when implementation/source proof exists. Research + Data + Product.

Routine cosmetic work must not displace critical product reliability or real-user revenue loops. But no new theoretical governance or infrastructure milestone is required to ship legal, scoped, reversible improvements.

## 6. Release acceptance evidence

A launch report requires actual code SHA; green Bun build + PostgreSQL integration suite + Docker image; Railway's active service showing the intended merge SHA; working HTTP for \`/\`, \`/app\`, \`/radar\`, product API; source mode/fallback confirmation; keyboard/mobile smoke where tooling exists. Unavailable browser-screenshot evidence must be disclosed rather than invented. Revenue/activation claims require separate authoritative proof.

**Canonical source of truth:** \`strategy/PRODUCT-IDENTITY-SSOT-v3.json\`. Every Company OS candidate context must include the market-first direction, not an "agents company" sales narrative. Historical 100-role docs remain only internal operations references.
