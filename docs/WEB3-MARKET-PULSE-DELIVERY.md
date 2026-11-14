# SignalForge first Web3-native Market Pulse — shipped implementation contract

This is a **real Web3-native market observation feature**, NOT a chart-only baseline, spoofed trading terminal or generated plan.

- `/web3` premium public route; direct from landing navigation.
- `GET /api/web3/pulse` fetches real public Polymarket Gamma event markets and Hyperliquid Info `metaAndAssetCtxs` perp markets in parallel. Both are read-only, no keys, no orders.
- 12 source top items per venue, bounded source URL and count, provider observation timestamp, explicit source/failure status; safely rendered with textContent (no HTML injection).
- Prediction volume/liquidity are source reported; perp `openInterestUsdApprox` = markPx × source-reported base OI, labeled estimated. Raw funding not annualized. No fake implied price/profit, users or leverage.
- Existing `/radar` is the real Solana mint/token-research entry for Meme Trenches; no new trending integration claimed until public provider and independent smoke exists.
- Kalshi, Lighter, Aster, Variational remain business/community benchmarks and are not shown as already integrated.
- CI/test: input schema, source offline, invalid external slugs, basic source-only math, API route linked into server, no dashboard fake data.
- Next real work: source-backed contribution to relevant official builder communities; consider Kalshi/Lighter adapters when published API/authority is tested. Do not assert community memberships, public posts, paid users or market performance without external receipts.

Source documentation: https://builders.polymarket.com/ ; https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
