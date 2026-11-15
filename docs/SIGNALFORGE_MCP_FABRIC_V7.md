# SIGNALFORGE MCP FABRIC v7 — shipped architecture and acceptance

Canonical product: THE MARKET IS ALIVE. FORGE WHAT MOVES IT.

## Boundaries

- MCP server: existing Railway signalforge-web Bun service at /mcp, official
  @modelcontextprotocol/server 2.4.0 createMcpHandler, supports current
  2026-07-28 per-request HTTP and SDK-compatible legacy stateless clients.
- MCP client: optional configured external tool discovery and execution from
  the existing customer Agent, not the internal Founder Company OS.
- Existing runMarketResearch, SourceA task queue and receipt hash verifier are
  reused; no second Hyperliquid/Kraken client, job store, SourceA corporate
  executor, payment system or Railway service is created.
- SourceA remains owner of its own MCP Verify code and corporate proof service.
  SignalForge's verifier recomputes its own customer adapter receipt and makes
  no claim that a remote SourceA Verify service signed or executed it.
- No cash, token issuance, customer trading, OAuth impersonation or wallet
  privileges are offered by these MCP tools.

## Current tools

Public read-only market:
market_snapshot, analyze_perps, research_prediction_market,
inspect_solana_token.

Paid customer API key (personal account scope):
create_research_task, get_task_result, verify_research_receipt,
cancel_research_task.

The public tools return source-reported observations with timestamps, original
URLs, limitations and explicitly false independent source verification.
Unavailable sources never become synthetic observations. Customer tools use
the pre-existing API key hash registry, plan, daily quota, tenant scope,
SourceA-compatible durable queue and cancellation/recheck contract.

Private work requires Authorization: Bearer sf_live_<personal-key>.
Keys are generated for eligible signed-in paid/active-trial customers through
the existing /api/api-keys endpoint. The server never accepts a user cookie
as private MCP authorization; bearer key revocation is respected.

## External MCP Client

Operator-pinned environment variables:
SIGNALFORGE_EXTERNAL_MCP_URL
SIGNALFORGE_EXTERNAL_MCP_ALLOWED_HOST
SIGNALFORGE_EXTERNAL_MCP_ALLOWED_TOOLS

All three required; only HTTPS and the identical explicit DNS hostname are
accepted. Default disabled. Calls never forward customer cookies, billing
keys or corporate credentials to the external server. Results are UNTRUSTED
until independently source-verified. Endpoints: /api/agent/external-tools
(GET discovery; POST bounded allowlisted call).

## DeepSeek and ROI

DEEPSEEK_API_KEY enables the official DeepSeek Flash API as an optional
preferred economic model in the existing SignalForge gateway. Model is
deepseek-flash by default, overridable to deepseek-v4-pro by
SIGNALFORGE_DEEPSEEK_MODEL. No credential means source-only.
Provider token counts are logged when a real call occurs.
Estimated dollars are null until both operator-maintained per-million input
and output rates are configured; provider settled billed dollars remain null
without processor/provider billing evidence. No invented costs.

The cross-portfolio UOS-RI and HDIR provider work is independently owned by
Noetfield-Systems/noetfield-hdir; SignalForge does not instantiate a new
Company OS or call HDIR's internal production provider credentials.

## Acceptance

Source tree and compile tests are not sufficient release evidence. The
official SDK v2 independent external acceptance test must:

1. Connect to deployed /mcp over current MCP HTTP and discover tools.
2. Read live Hyperliquid observations with real original source URL.
3. Deny anonymous private calls.
4. Create two disposable customer accounts and two personal API keys.
5. Reject cross-customer task access.
6. Queue read-only customer task; await existing Bun/Postgres worker.
7. Independently recompute the exact matching SourceA-compatible receipt.
8. Delete both temporary accounts. No artificial Genesis Points or sales.

A real paid subscription, real DeepSeek inference, external MCP provider
connection or directory installation is not implied by test acceptance.
