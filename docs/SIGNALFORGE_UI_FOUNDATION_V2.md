# SignalForge Product UI Foundation v2

Implement a connected research terminal and agent workspace without a second runtime, queue, market adapter or billing engine.

## Actual owners and reusable modules

- Chart renderer: TradingView Lightweight Charts 5.2.1, locally served by the existing Bun server. Library notice and link visibly retained. Candles, volume and MA20/50 originate from the existing /api/market and are validated for finite OHLC, sorted time and coherent highs/lows.
- Shared navigation: public/sf-ui.js, six canonical product routes, current-state aria semantics, horizontal/vertical/compact responsive layouts. Consumed by Terminal Next, Agent, Radar, Web3 Pulse, Developer Portal, marketing and existing App.
- Shared presentation: public/sf-ui.css owns cross-page semantic brand tokens, navigation, source mode indicators, chart canvas and keyboard focus.
- Inline research: existing POST /api/agent/research (bounded deterministic customer Source agent); result including real source URLs appears in the terminal Agent pane. Full /agent continues persistent authenticated research.
- Customer queue, SourceA-compatible receipts, Stripe and PostgreSQL remain unchanged. No invented market data, agent outputs, paper trading or order permission.

## Real user-facing improvement

/terminal-next displays the actual locally bundled chart engine, source-linked market status, source-fed watchlist, existing strategy observations and an actual callable source research panel rather than a clipboard-only button. An unconfigured or unavailable venue explicitly lacks valid live chart candles; synthetic fallbacks cannot masquerade as source observation.

Existing /app remains functional and independently routed. It is not replaced until parity tests for login, view routing, subscription, research, strategies, backtest and community pass.

## Why not immediately embed OpenCharts?

The OpenCharts project is a useful UI design reference, but its npm component package is not yet released. Its in-browser paper-trading engine replays historical market candles with shifted timestamps; these are not a live Kraken or Hyperliquid trading feed. Use the official lightweight chart primitive and the existing SignalForge data backend first. Extract compatible component ideas only without importing the demo-paper runtime or incompatible React build.

## Acceptance and proof boundaries

- Bun build, production Docker build, and full unit/integration suite pass.
- Real Chromium on 1512x982 and 390x844 captures five product surfaces; no horizontal overflow, page JS exceptions or unusable core controls.
- Fixture-only browser market API responses must render a native Lightweight Charts canvas, validate BTC to ETH switching, and preserve attribution.
- Fixture-only Agent endpoint responses must exercise a real fetch and render escaped/source-linked evidence.
- These fixture tests prove UI wiring, NOT real customer engagement, paid subscriptions, actual market prices from CI fixtures or externally verified data.
- Production success requires Railway exact-commit deployment and live market endpoint response after merge.
- Automated geometry checks do not prove a subjective design score; human benchmark comparisons remain necessary.

## Follow-up implementation, not a launch blocker

Migrate remaining legacy layout islands and the original App view router into the same shared Shell while retaining functional parity, then expose comparable responsive screenshots against Bankr and Hyperliquid. Add reusable watchlist, token evidence and source state widgets using the existing market adapters. Do not copy third-party trademarks or imply execution permissions.
