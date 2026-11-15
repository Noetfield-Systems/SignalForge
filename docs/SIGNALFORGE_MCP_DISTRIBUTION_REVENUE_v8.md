# SignalForge MCP Distribution & Revenue v8

**Mission:** Ship a truthful public developer acquisition path for the already-working MCP Fabric v7. Source: `Noetfield-Systems/SignalForge`, existing Bun/Railway/PostgreSQL. No duplicate scheduler, SourceA cloud executor, or trade permissions.

## Customer-facing deployment
- `GET /developers`: premium market-focused MCP setup page, public config, instructions and live account-scoped API key issuance.
- `GET /server.json` and `GET /.well-known/mcp/server.json`: same official Registry remote-only manifest.
- `POST /mcp`: unchanged eight existing real SDK tools. Four public source-only and four authenticated paid/trial scoped durable research tools.
- `GET /api/admin/mcp-usage`: existing admin role only, seven-day source-observed tool calls by tool/outcome and distinct authenticated accounts. Anonymous calls do **not** establish unique users, and test accounts are excluded.
- Existing `/api/api-keys`: same logged-in eligible account mechanism, now rejects cross-origin requests. API keys appear once in developer UI and are never persisted in browser storage.

## Actual usage measurement
MCP tool callbacks record into additive `mcp_tool_events` only for true tool invocations, not `initialize` or `tools/list`. Columns: user_id (nullable), api_key_id (nullable), tool_name, outcome (SUCCEEDED/FAILED), duration_ms, is_test_account, created_at. No prompts, HTTP authorization headers, IPs or raw API keys are recorded.

Account deletion clears user references; testing with `@signalforge.invalid`/ `@signalforge.test` stays labeled test even after cleanup. Model provider spend, x402 settlement and human identity are **not** derived from request counts.

DB telemetry failures do not change a research response or the user's tool authority.

## Official MCP Registry
- Remote-only `server.json` with `io.github.noetfield-systems/signalforge` namespace and existing live Streamable HTTP URL, without a fabricated npm package.
- GitHub Actions OIDC publication through the official registry publisher. Workflow requires read-back of the actual registry listing before claiming success.
- Publication might fail if organizational GitHub OIDC namespace rights or registry availability are insufficient. Such a failure is confined to discoverability, not to the live MCP Server or paying customer workflows.
- Public metadata is not by itself proof of installation by external users.

## Commercial path
Anonymous researcher -> public MCP tool -> developer page -> SignalForge account -> Pro/Quant entitlement via **existing Stripe** -> one-time personal API key -> owner-scoped durable job and receipts -> seven-day usage readback.

The real Stripe signed webhook and settlement reconciliation remain the only evidence of collected subscription revenue. No sale is reported solely from a visitor, tool call, API key, checkout creation or workflow test.

## Acceptance
1. All unit and Postgres integration tests pass and existing CI remains green.
2. External SDK still discovers and calls live source-backed tools.
3. `/developers` and both registry metadata URLs return HTTP 200 and coherent endpoints.
4. Private tool denies unauthorized and cross-account access (existing v7 E2E).
5. `/api/admin/mcp-usage` denies anonymous requests.
6. Railway readback matches merged SHA and external v8 acceptance passes.
7. Registry listing reported only after official action + independent API readback.
8. Live LLM calls, customer acquisition, x402 and Stripe collection are separate independent goals; do not fabricate.

## Next execution
- With actual model credential available to this venture, enable and measure one real inference; never import a different venture's secret.
- Recruit real public tool users through authentic examples and developer communities.
- Upgrade developer MCP endpoint cost/usage entitlements and paid conversion using real customer/billing readbacks.
- Build x402 only after an actual paid endpoint transaction can be settled and verified.
