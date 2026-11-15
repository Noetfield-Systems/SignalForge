# SIGNALFORGE v12 — USER-FIRST UX AUDIT & REPAIR RECEIPT

**2026-11-15 · Scope:** existing public route templates, nine nested /app views, private admin surfaces, mobile and desktop. This is an implementation-linked audit. See PR #123 and `scripts/sf-v12-experience-audit.py` for independent browser evidence.

## Original defects verified against v11 screenshots and source

| Area | Concrete user-visible problem | v12 engineering correction |
|---|---|---|
| Cross-page identity | Five different headers; inconsistent typefaces/sizing, repetitive oversized copy | One Manrope / Space Grotesk / Plex Mono scale, source-state grammar and responsive plate system in existing `sf-ui.css` |
| Radar mobile | Global nav wraps into three rows above another global bottom dock | Desktop nav hidden on mobile; existing tested product dock is the mobile router |
| Market terminal parity | `/app` still used bespoke Canvas even though `/` had TradingView | Shared real-source-gated Lightweight Charts; original canvas only as provider/unavailable fallback |
| Agent activation | Prompt examples and link bars precede the real Research form | Source-composer above optional examples, with exact existing API, sessions, tasks and Forge forms preserved |
| Marketplace/venue story | Pulse headline and not-yet-connected venue names look like an aspirational catalog | Explicit Polymarket/Hyperliquid/Solana connected-source matrix and separate research targets; actual source states remain dynamic |
| Research artifacts | Public Research Card looked like an empty static note with no visible evidence count | Actual public evidence count, original venue labels and meaningful invalid/unavailable response |
| Developer portal | Registry badge static even when publication could be unavailable | Actual served `/server.json` readback with explicit unavailable state |
| Cross-view discoverability | Scanner, strategies, backtest, models, rooms, API and plans felt like isolated applets | Compact links to existing real workflows inside every `/app` research view |
| Pricing | Two independent renderers own the same `#view-pricing`, causing orphaned Growth Assets Stripe controls; uncaught TypeError in Playwright | Preserve Growth Assets billing/annual toggle/lead/referral UI when loaded; preserve original core fallback when unavailable; restore contextual navigation |
| Outdated chrome | Primary app footer still claimed version v0.2 | Removed obsolete label |
| Mobile density | Large sidebar/card/navigation before a primary task | Compact hero and nav, top-of-page source strip, real mobile dock; 390px checks in E2E |

## Product features explicitly retained
- Kraken public OHLC, source integrity labels, native chart and honest fallback.
- Scanner, strategies, backtests, track record, model/router source availability.
- Private Agent task, evidence, memory, Forge Monitor, source-linked receipts.
- Solana Radar real mint lookup, watchlists, research notes and alerts.
- Web3 Polymarket and Hyperliquid public source adapters; no fabricated venue data.
- Community moderation/composer and public source-based research cards.
- MCP tool contracts, registry/server readback, private scoped access.
- Existing account flow, consent, Stripe checkout, trial, annual toggle, referral and lead intake.
- Admin Revenue Control and Company Floor read-only boundaries.

## Acceptance matrix
- **Public routes:** /, /terminal-next, /welcome, /start, /app, /agent, /radar, /web3, /developers, /research/:id.
- **Nested pages:** dashboard, scanner, strategies, backtest, trackrecord, community, models, api, pricing.
- **Private:** /admin/revenue and /admin/company-floor — verify sign-in/role using disposable CI user only.
- **Viewports:** 1440×900 and 390×844; no overflow or uncaught JS errors.
- **Interaction:** source-aware charts, command menu/dock, all pricing owners, free signup, private Community composer, task/Forge presence, full test account deletion.
- **Evidence artifacts:** `artifacts/ui-v11/v12-*.png` and `artifacts/ui-v11/v12-surface-audit.json` uploaded by existing CI.

## Truth boundaries
Screenshots and page QA do not prove paid customers, active paid entitlements, live LLM inference, token minting, exchange order execution or source freshness beyond reported provider evidence. Production is accepted only at the exact merged SHA with Railway successful deployment and independent external readback.
