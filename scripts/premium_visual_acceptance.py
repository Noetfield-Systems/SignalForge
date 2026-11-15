"""Visual acceptance for SignalForge public, MCP, research and terminal surfaces.
Renders the actual Bun server in system Chromium. No screenshot-only subjective PASS.
"""
import os
import json
import datetime
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright

BASE = os.environ.get("VISUAL_BASE", "http://127.0.0.1:18180")
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")
SIZES = {"desktop": (1512, 982), "mobile": (390, 844)}
SURFACES = [
    ("/", "SignalForge home", "h1"),
    ("/developers", "MCP developers", "h1"),
    ("/agent", "Research agent", "h1"),
    ("/app", "Market terminal", "#priceChart"),
    ("/terminal-next", "Integrated research terminal", ".chartwrap"),
]
def check():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=CHROME,
                                    args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            for kind, (width, height) in SIZES.items():
                page = browser.new_page(viewport={"width":width,"height":height},
                                        device_scale_factor=1)
                errors = []
                page.on("pageerror", lambda err: errors.append(str(err)[:180]))
                for path, label, selector in SURFACES:
                    if path == "/terminal-next":
                        # Browser fixture is test-only, never a production market-price claim.
                        now = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
                        start = now - 85*3600
                        def market_fixture(route):
                            query = parse_qs(urlparse(route.request.url).query)
                            symbol = query.get("symbol", ["BTCUSD"])[0]
                            baseline = 80000 if symbol == "BTCUSD" else 3000
                            candles = []
                            for j in range(80):
                                op = baseline + j*2
                                candles.append({"time":start+j*3600,"open":op,"high":op+10,
                                                "low":op-8,"close":op+5,"volume":110+j})
                            payload = {"mode":"LIVE_PUBLIC_DATA","fetchedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),
                                       "source":"CI FIXTURE / NOT REAL MARKET DATA",
                                       "summary":{"price":candles[-1]["close"],"change24h":0.3,
                                                  "high24h":baseline+170,"low24h":baseline-10,"rsi":52,"regime":"RANGING"},
                                       "signals":[],"overview":[{"symbol":symbol,"price":candles[-1]["close"],"change24h":0.3}],
                                       "candles":candles}
                            route.fulfill(status=200,content_type="application/json",body=json.dumps(payload))
                        page.route("**/api/market?*",market_fixture)
                    response = page.goto(BASE + path, wait_until="domcontentloaded", timeout=22000)
                    assert response and response.status == 200, (label, "HTTP", response.status if response else None)
                    item = page.locator(selector).first
                    assert item.count() and item.is_visible(), (label, selector, "not visible")
                    dims = page.evaluate("""() => ({w:window.innerWidth,scroll:document.documentElement.scrollWidth,
                      body:document.body.scrollWidth})""")
                    if max(dims["scroll"], dims["body"]) > width + 3:
                        outliers = page.evaluate("""() => [...document.querySelectorAll("*")]
                          .map(el=>({tag:el.tagName,cls:String(el.className||"").slice(0,60),
                            id:el.id||"",left:Math.round(el.getBoundingClientRect().left),
                            right:Math.round(el.getBoundingClientRect().right)}))
                          .filter(e=>e.right>innerWidth+1 || e.left< -1).slice(0,18)""")
                        print("VISUAL_OVERFLOW_ELEMENTS",label,kind,outliers)
                    assert max(dims["scroll"], dims["body"]) <= width + 3, (label, kind, "horizontal overflow",dims)
                    if path == "/" and kind == "desktop":
                        lines = page.locator(".hero h1").evaluate("""el => {
                          const css = getComputedStyle(el); return el.getBoundingClientRect().height / parseFloat(css.lineHeight)
                        }""")
                        assert lines < 2.55, ("home", "orphaned headline", lines)
                        assert page.locator("#candleChart").count() == 1
                    if path == "/developers":
                        assert page.locator("#copyConfig").count() == 1
                        assert page.locator("#createKey").count() == 1
                        assert page.locator("#endpoint").inner_text().startswith("https://")
                        assert "No synthetic live data" in page.content()
                        assert page.locator("a[href='#connect']").first.is_visible()
                    if path == "/agent":
                        assert page.locator("#researchForm").count() == 1
                        assert page.locator("#run").is_visible()
                        assert page.locator("#modelStatus").count() == 1
                        if kind == "desktop":
                            bottom = page.locator("#run").bounding_box()["y"]
                            assert bottom < 950, ("Agent run CTA below 950px on desktop",bottom)
                    if path == "/app":
                        assert page.locator("#priceChart").count() == 1
                    if path == "/terminal-next":
                        assert page.locator("nav[data-sf-nav]").count() == 1
                        assert page.locator("#copyPrompt").is_visible()
                        assert page.locator("#inlineAgentResult").count() == 1
                        assert page.evaluate("!!window.LightweightCharts && !!window.SFMarketChart")
                        page.wait_for_selector("#sfNativeCandleChart canvas",timeout=12000,state="visible")
                        assert page.locator("#chartState").inner_text().startswith("KRAKEN PUBLIC OHLC")
                        if kind == "desktop":
                            page.locator('[data-symbol="ETHUSD"].watchrow').click()
                            page.wait_for_function("document.querySelector('#pairName')?.textContent?.includes('ETH')")
                            page.wait_for_selector("#sfNativeCandleChart canvas",timeout=7000,state="visible")
                            print("FIXTURE_ONLY_NATIVE_CHART_SYMBOL_SWITCH_PASS")

                    # Client scripts must be parseable, exceptions do not become PASS.
                    assert not errors, (label, kind, "client script error", errors[:3])
                    print("VISUAL_GEOMETRY_PASS", kind, label, dims["scroll"], "viewport", width)
                    errors.clear()
                    if path == "/terminal-next":page.unroute("**/api/market?*")
                page.close()
            print("SIGNALFORGE_PREMIUM_CHROMIUM_LAYOUT_ACCEPTED")
        finally:
            browser.close()
if __name__ == "__main__":
    check()
