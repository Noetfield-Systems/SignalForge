import {expect,test} from "bun:test";
import identity from "../strategy/PRODUCT-IDENTITY-SSOT-v3.json";
import company from "../company-os/organization.v2.json";

const landing=await Bun.file(new URL("../public/welcome.html",import.meta.url)).text();
const terminal=await Bun.file(new URL("../public/index.html",import.meta.url)).text();
const radar=await Bun.file(new URL("../public/token-radar.html",import.meta.url)).text();
const delivery=await Bun.file(new URL("../scripts/company-os-delivery.py",import.meta.url)).text();
const policy=await Bun.file(new URL("../AGENTS.md",import.meta.url)).text();

test("Founder business identity is market intelligence, not an agent organization landing",()=>{
 expect(identity.schema).toBe("signalforge.product-identity.v3");
 expect(identity.primary_business).toContain("crypto market intelligence");
 expect(identity.company_os.non_customer_facing_by_default).toBe(true);
 expect(identity.company_os.defined_roles).toBe(100);
 expect(identity.reference_benchmarks.map(x=>x.name)).toEqual(["TradingView","DEX Screener","Nansen","Arkham","Bubblemaps"]);
 expect(identity.market_ui_rules.some(x=>x.includes("Company OS"))).toBe(true);
 expect(company.founder_product_contract).toBe("strategy/PRODUCT-IDENTITY-SSOT-v3.json");
 expect(company.agents).toHaveLength(100);
 for(const role of company.agents){
  expect(role.operating_contract.product_identity_contract).toBe(company.founder_product_contract);
  expect(role.operating_contract.primary_business).toBe("CRYPTO_MARKET_RESEARCH");
  expect(role.operating_contract.public_marketing_headcount_authorized).toBe(false);
 }
});
test("Public landing has real OHLC integration, research journey and full working links",()=>{
 expect(landing).toContain('id="candleChart"');
 expect(landing).toContain('data-symbol="BTCUSD"');
 expect(landing).toContain('data-symbol="ETHUSD"');
 expect(landing).toContain('data-symbol="SOLUSD"');
 expect(landing).toContain('data-interval="15"');
 expect(landing).toContain('data-interval="60"');
 expect(landing).toContain('data-interval="240"');
 expect(landing).toContain("/api/market?symbol=");
 expect(landing).toContain('data.mode!=="LIVE_PUBLIC_DATA"');
 expect(landing).toContain("sourceUnavailable");
 expect(landing).toContain('href="/radar"');
 for(const view of ["dashboard","scanner","strategies","backtest","trackrecord","community","pricing"]){
  expect(landing).toContain("/app?view="+view);
 }
 expect(landing).toContain("@media(max-width:720px)");
 expect(landing).toContain("prefers-reduced-motion");
 expect(landing).not.toContain("100 specialized agents");
 expect(landing).not.toContain("100 Agents");
});
test("Terminal deep links resolve to real views; current product data/security flows retained",()=>{
 for(const view of ["dashboard","scanner","strategies","backtest","trackrecord","community","models","api","pricing"]){
  expect(terminal).toContain('id="view-'+view+'"');
  expect(terminal).toContain('data-view="'+view+'"');
 }
 expect(terminal).toContain('supported=["dashboard","scanner","strategies","backtest"');
 expect(terminal).toContain('id="priceChart"');
 expect(terminal).toContain("function renderPricing()");
 expect(terminal).toContain("billing");
 expect(radar).toContain("Know what the");
});
test("Internal code-delivery context loads Founder product lock; consumers never receive workforce secret",()=>{
 expect(delivery).toContain('FOUNDER_PRODUCT_IDENTITY_LOCK_INVALID');
 expect(delivery).toContain('FOUNDER PRODUCT CONTRACT');
 expect(delivery).toContain('strategy/PRODUCT-IDENTITY-SSOT-v3.json');
 expect(policy).toContain("Company OS is the INTERNAL operating staff");
 expect(company.operating_continuity.local_scheduler_creation).toBe(false);
});

test("premium landing inline javascript parses and tablet navigation has a keyboard-sized breakpoint",()=>{
 const inline=landing.match(/<script>([\s\S]*?)<\/script>/);
 expect(inline).not.toBeNull();
 expect(()=>new Function(inline![1])).not.toThrow();
 expect(landing).toContain("@media(min-width:721px) and (max-width:950px)");
 expect(landing).toContain('aria-expanded="false"');
 expect(landing).toContain('id="mainNav"');
});

test("v4 editorial hierarchy gives the working market chart priority on landing and terminal",()=>{
 expect(landing).toContain("SIGNALFORGE / EDITORIAL MARKET INTELLIGENCE");
 expect(landing).toContain('class="hero-artline"');
 expect(landing).toContain('class="hero-summary"');
 expect(landing).toContain('class="stage-heading"');
 expect(landing).toContain('class="stage-foot"');
 expect(landing).toContain("grid-template-columns:repeat(12,minmax(0,1fr))");
 expect(landing).toContain(".feature:first-child{grid-column:span 7");
 expect(landing).toContain("background:#e8e6dd");
 expect(landing).toContain("font-family");
 expect(landing).toContain("IBM+Plex+Mono");
 expect(landing).toContain("Instrument+Sans");
 expect(landing).toContain("max-width:460px");
 expect(landing).toContain("@media(max-width:460px)");
 expect(terminal).toContain("SIGNALFORGE V4");
 const chart=terminal.indexOf('class="grid contentgrid"');
 const stats=terminal.indexOf('class="grid stats"');
 const guide=terminal.indexOf('class="sf-research-path"');
 expect(chart).toBeGreaterThan(0);
 expect(stats).toBeGreaterThan(chart);
 expect(guide).toBeGreaterThan(stats);
 expect(terminal).toContain("height:460px");
});
test("v4 delivery source uses actual API and prevents a decorative fake-live market",()=>{
 expect(landing).toContain('data.mode!=="LIVE_PUBLIC_DATA"');
 expect(landing).toContain("sourceUnavailable");
 expect(landing).toContain("No verified live public candles available");
 expect(landing).toContain("Only verified public OHLC is plotted as live");
 expect(landing).toContain('id="candleChart"');
 expect(landing).toContain('aria-live="polite"');
 for(const href of ["/app?view=dashboard","/app?view=backtest","/radar"]){
  expect(landing).toContain('href="'+href+'"');
 }
});
