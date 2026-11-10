# SignalForge · M20 operating plan and scenario forecast
**Version:** 2026-11-10 / 180 days · **Authority:** founder-approved portfolio goal; planning artifact, not a permit or a deployed Company OS policy.

## 0. Reality boundary and measurable goal

- Product runs at [signalforge-web-production.up.railway.app](https://signalforge-web-production.up.railway.app/) from `Noetfield-Systems/SignalForge` GitHub / Railway, using Bun, PostgreSQL, growth and lifecycle worker sources.
- Its market intelligence, backtest, user trial, referral, Signal Rooms and aggregated Company OS snapshot exist in source. M20-SIGNALFORGE-COMMUNITY is already in `Noetfield-Systems/sina_founder_os/portfolio/STRATEGIC-EXECUTION-MISSIONS-v1.json`.
- Company OS telemetry is **read only and source-reported**. The Founder OS intake creates an `organization_signals` event; `company_os_dispatch=GOVERNED_HANDOFF_REQUIRED` means real engineering execution still needs an authorized WorkPacket/Governor handoff. Never claim a proposed backlog auto-ran.
- **Unknown baselines**: human activations and 7-day retention, independently verified paid subscriptions, refunds, collected cash, CAC, cloud costs, conversion rates. No invented numbers.
- Source-listed prices: Pro CAD $29/month and Quant CAD $99/month; annual plans CAD $290 and CAD $990. A 30-day no-card trial exists. During trial, `stripeCheckout` saves intended plan and does not evidence a successful charge.

**North-star:** verified active research contributors + retained paying subscribers + collected net cash, with explicit denominators, provenance and independent evidence. Never use fictitious user engagement or market win-rate.

## 1. Target customer and product wedge

### Who it serves first
Crypto-focused individual analysts and curious, research-oriented retail users who want to understand price data, compare a falsifiable hypothesis, test strategy assumptions and discuss the evidence. Later, small research communities and educators seeking shared workspaces (without individualized trade advice).

### Product promise
**From market movement → structured, source-linked thesis → discussion → timestamped outcome → personal research workflow.** Do not build a second TradingView chart clone or generic Telegram pump channel.

### Proposed future release surfaces
1. **Evidence Card**: ticker, observation timestamp, data source/mode, strategy conditions, invalidation, backtest caveats, fixed permalink, share metadata and a linked Signal Room discussion. Differentiate research from real executed returns.
2. **My Research Desk**: saved market views, watchlists, alerts, note history, first-session tutorial and clear trial status.
3. **Signal Rooms V2**: discussion reply notifications, useful-evidence reactions, report/moderation SLA, verified-time-stamp/edited state, conflicts-of-interest disclosure and no profit leaderboards.
4. **Public intelligence pages**: searchable evergreen explanation of strategy templates (SEO) with dynamic data freshness and licensing check before data redistribution.
5. **Teams experiment**: shared research notebooks and seats only after at least three real teams express measurable willingness to pay.

## 2. 180-day delivery sequence

| Priority | Time | WorkPacket proposal | Acceptance evidence | Owner |
| --- | --- | --- | --- | --- |
| P0 | Days 1–7 | `SF-P0-01` audit end-to-end trial → checkout → signed Stripe webhook → entitlements → refund; check exact no-card trial behavior | Approved small real payment & reversal, webhook idempotence, entitlement/ledger reconciliation, privacy-safe receipt | Revenue + Verification |
| P0 | Days 1–7 | `SF-P0-02` define typed analytics and instrument acquisition → registration → first research action → 7-day retention | Production event evidence with unique human accounts; no bot/test traffic counted | Product + Growth |
| P0 | Days 1–10 | `SF-P0-03` QA auth/CSRF/content/report/appeal and user-facing Terms/privacy/community standards | Real manual browser E2E, admin triage and report disposal, no unauthenticated mutation | Risk + Customer |
| P0 | Days 1–14 | `SF-P0-04` backups, restore rehearsal, rollback and uptime alerts | Restore from verified backup in isolated environment and rollback drill | Engineering + Verification |
| P1 | Days 8–21 | `SF-P1-01` publish evidence-card URLs with source stamps and original-invalidation fields | Crawlable live page, social share preview, correct data-mode/research disclaimer | Product + Growth |
| P1 | Days 15–30 | `SF-P1-02` 3-step signup onboarding + watchlist + one authentic community interaction | >=100 real signups in experiment before measuring activation gate | Product + Customer |
| P1 | Days 15–35 | `SF-P1-03` source-attributed referrals with anti-abuse controls and no cash-equivalent points | Unique permitted referrals, bounded incentive costs, attributable signup records | Growth + Risk |
| P1 | Days 20–45 | `SF-P1-04` consent-aware lifecycle and research digest | Verified opt-in/unsubscribe paths, no unsolicited sends | Customer + Growth |
| P2 | Days 31–60 | `SF-P2-01` research discussion quality/return-loop improvements | 7-day return of consenting users; meaningful replies; unresolved reports <24h | Product + Community |
| P2 | Days 45–90 | `SF-P2-02` subscription pricing/packaging comparison and cancel/reactivate | >=100 expired trials for rate analysis, at least one independently verified charge/refund cycle | Revenue + Verification |
| P3 | Days 90–180 | `SF-P3-01` research team workspace + B2B outreach after approved evidence | >=3 real teams willing to evaluate and price interviews, no fake enterprise traction | Product + Commercial |
| P3 | Days 90–180 | `SF-P3-02` data/API licensing and paid usage contracts | Provider-permitted commercial usage, customer tenancy tests and metered entitlement receipts | Product + Risk |

There is **no automatic promise** that all work will finish on those dates; if P0 is blocked, downstream stages stay gated. These are explicit target windows, not observed execution.

## 3. Company OS daily operating loop — proposed, not yet commissioned end-to-end

1. **Observe:** the existing Founder OS poll accepts only fresh, authenticated aggregate metrics from SignalForge and stores SHA-256 snapshot receipts. A separate event ledger is needed to measure cohorts rather than simply `active7d` presence.
2. **Diagnose:** Goalkeeper prioritizes *economic impact, customer safety, activation, retention and cash receipts* over feature volume; compares all active ventures using the same policy.
3. **Admit:** an M20 goal produces a typed, tenant-scoped candidate WorkPacket with `goal_id`, owner, evidence, budget and acceptance criteria; the Governor decides what is authorized. This document does not create authority.
4. **Execute:** Company OS dispatches approved coding/research work through **existing** Paperclip/Motor/Runway/runtime, GitHub PR and Railway deployment; no duplicate scheduler, worker queue or agent registry.
5. **Verify:** independent verification retrieves source SHA, CI, deployed revision, real HTTP/UX behavior and receipt. Deployed code or passing mocks alone do not certify users/payments.
6. **Learn/replan:** outcomes feed back into M20 and portfolio cockpit; unresolved approvals are escalated only when consequential.

### Concrete simulated weekday (illustrative values, not a claim)
- **09:00:** 120 people viewed a public BTC Evidence Card; 11 signed up; 6 used a watchlist; 2 joined a discussion; no verified payment.
- **09:05:** M20 compares signup activation (6/11) with the prior eligible cohort; with fewer than 100 participants, labels sample too small instead of asserting conversion confidence.
- **10:00:** five posts are reported; if any reports remain unreviewed >24h, moderation is ranked above new market AI-model experiments.
- **11:30:** an authorized product worker prepares a better first-run onboarding PR, tests, and demo. Independent verifier checks actual browser completion; only then release.
- **18:00:** new snapshot, M20 scorecard and evidence links summarize what moved and which gates are blocked; founder sees only consequential decisions.

## 4. Decision rules for an agent-operated business

These are proposed **thresholds to implement only once event quality is demonstrated**, not live automated conditions.

| If observed (minimum sample) | Proposed deterministic policy | What NOT to do |
| --- | --- | --- |
| Payment webhook signature or ledger mismatch (any instance) | P0 block billing claims, isolate failed event and create reconciliation work | Never infer revenue from `trialing` or selected plan |
| Community report unreviewed >24h | Escalate moderation, freeze suspect promotions until reviewed | Never auto-publish deceptive hype |
| >=100 fresh real registrations and <35% perform a research action within 24h | Prioritize onboarding and create A/B experiment work | Do not build more strategies before fixing activation |
| >=100 eligible new-user cohorts and week-1 return <20% | Fix recurring utility: watchlist, reminder with opt-in, research digest | Do not inflate DAU with bot page loads |
| >=100 matured trials and independently verified trial→paid <3% | Investigate plan value, checkout and onboarding friction | Do not change Stripe pricing or charge users without scope |
| >=3 qualified research teams wanting collaboration | Consider scoped team-seat beta | Do not create an enterprise roadmap from vanity leads |
| Market data source degraded or commercial redistribution not licensed | Fall back to clearly labeled stale/demo mode or disable derived feature | No silent substitution or fabricated freshness |
| No material change in verified metrics | Continue highest-ranked unfinished work in existing Company OS plan | Do not create a new mission or scheduler every poll |

**Measurement definitions:** `activation24h` = registered human accounts completing >=1 meaningful source-validated research action / new human registrations; `week1_return` = humans returning for meaningful actions on day 7±1 / first-week eligible signups; `trial_to_paid` = matured trial cohort with verified paid Stripe subscription / matured unique trials. `net_cash` is collected & settled charges less refunded amounts, fees and taxes according to ledger; do not confuse it with gross MRR.

## 5. Scenario forecasts and business assumptions

Machine-readable assumptions: [`m20-scenarios.v1.json`](./m20-scenarios.v1.json); deterministic calculator: [`scripts/forecast.ts`](../scripts/forecast.ts) with unit tests.

**Not a statistical prediction:** there is no measured acquisition/conversion baseline in this plan. Three hypothetical paths at day 90 and day 180 reflect different acquisition and conversion assumptions. The first 30 days of new users can generate **zero paid receipts** if the free 30-day trial is not monetized early. A selected paid plan during trial is not a charged subscription.

Pricing mix assumption: 85% Pro at CAD 29 / 15% Quant at CAD 99 ⇒ blended CAD 39.50 per modeled monthly paying subscriber. Paid headcount = round(matured trial users × trial-to-paid × effective paid-retention). Gross modeled MRR = paying × CAD 39.50; cash and profit remain **unknown**.

| Day | Case | Total new signups | Matured trials | Trial→paid | Retained paying model | Gross modeled MRR (CAD) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 90 | Conservative | 180 | 90 | 3% | 2 | $79 |
| 90 | Base | 650 | 400 | 5% | 17 | $671.50 |
| 90 | Stretch | 2,200 | 1,500 | 8% | 102 | $4,029 |
| 180 | Conservative | 900 | 650 | 3% | 16 | $632 |
| 180 | Base | 3,500 | 2,800 | 6% | 134 | $5,293 |
| 180 | Stretch | 12,000 | 9,000 | 9% | 648 | $25,596 |

Not modeled: cloud/model costs, annual billing/discount mix, support, marketing spend, refunds, tax, failed charges, chargebacks, churn variation or regulatory compliance cost. Report margins **only** after measuring these.

## 6. Growth without purchasing fake traction

**Search → Evidence Card → discussion → signup → watchlist → opt-in reminder → retained researcher.** Each share link carries source and market provenance. Optional referral rewards should unlock bounded product utility, **not tokens, guaranteed monetary returns or extra unlimited trial days**. Credible social distribution starts with market education and outcomes, not pump groups.

Potential partnerships with research newsletters or licensed data vendors require explicit permission, commercial licensing and fact-based advertising. The premium moat is timestamped reasoning + structured disagreement + verified product operations, not a claimed predictive advantage.

## 7. Portfolio reuse and risk boundaries

SignalForge can teach the OS about product onboarding, retention, payments, customer support and controlled rollout. EarnLoop remains a distinct advertiser-funded rewards experiment; BuildRelay a separate member-collaboration venture. **Do not mix SignalForge's subscription revenue with EarnLoop reward liabilities or BuildRelay points.** Each venture has separate tenant/mission/ledger; shared execution/governance/verification layers only.

Canadian securities guidance (CSA/CIRO Staff Notice 31-369, 2025-12-11) says posts, promotion and individualized suggestions can cross registration boundaries. No simulated performance, copy trading, investment guarantees, undisclosed sponsored coins or auto-execution should be part of the initial loop. Every external advice/marketing initiative needs risk review.

## 8. Success/failure decisions at 30/90/180 days

- **D30:** Show proof for real sign-up→research→conversation and payment/refund/restore flow. If payment can't be verified, mark revenue NOT PROVEN and focus on checkout correctness.
- **D90:** If activation <35% or week-1 retention <20% with adequate sample, focus on product-market fit, not AI model sprawl. If >=100 matured trials and trial→paid <3%, test pricing/onboarding rather than manufacturing users.
- **D180:** Expand B2B/API only when repeat engagement + paid retention + data licensing are substantiated. If not, freeze major expansion and reuse the Company's existing optimization loop for the narrow wedge.

**Completion proof requirement for every item:** source revision, tests, authorized execution, deployed artifact (if applicable), user-visible effect, independent verification receipt, rollback, next measured business outcome.

---
**Planning authority:** This file is an operational design artifact for M20. It does not mutate Stripe, schedule jobs, message users, trade assets, create external accounts, or automatically dispatch Company OS work. The canonical M20 mission and its Governor conditions remain in `sina_founder_os`.
