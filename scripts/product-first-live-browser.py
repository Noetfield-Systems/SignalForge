"""Independent live SignalForge v10 product-first root acceptance.

No route fixtures. Tests the already deployed Railway product. Screenshots
are actual remote content; assertions distinguish provider-supplied data from
source-unavailable states. No synthetic customers, models or trades.
"""
import json
import os
import pathlib
import time
import urllib.request
from playwright.sync_api import sync_playwright

BASE=os.environ.get("SIGNALFORGE_LIVE_BASE","https://signalforge-web-production.up.railway.app").rstrip("/")
CHROME=os.environ.get("CHROME","/usr/bin/google-chrome")
ART=pathlib.Path("artifacts/product-first-live")
ART.mkdir(parents=True,exist_ok=True)

def text(path):
    with urllib.request.urlopen(BASE+path,timeout=20) as resp:
        assert resp.status==200,(path,resp.status)
        return resp.read().decode("utf-8")

# Deployment rollouts are asynchronous; never mistake the previous landing for v10.
for attempt in range(24):
    try:
        home=text("/")
        health=json.loads(text("/api/health"))
        if 'id="agentPrompt"' in home and 'if(location.pathname==="/")viewPane("agent")' in home and health.get("database")=="connected":
            print("V10_LIVE_ROOT_AND_DATABASE_READY",attempt+1)
            break
    except Exception as exc:
        print("V10_LIVE_READBACK_PENDING",type(exc).__name__)
    time.sleep(5)
else:
    raise AssertionError("V10_ROOT_NOT_ROLLED_OUT_TO_RAILWAY")

assert 'id="chartSVG"' in home and "/assets/lightweight-charts.js" in home
assert "The market is alive." not in home,"Slide-deck marketing still served at root"
assert "The market is alive." in text("/welcome"),"Original brand marketing was lost"
assert 'id="view-community"' in text("/app"),"Original paying customer terminal was replaced"
assert 'id="engineChoice"' in text("/agent"),"Dedicated Agent workspace lost"

with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True,executable_path=CHROME,args=["--no-sandbox","--disable-dev-shm-usage"])
    try:
        for kind,width,height in [("desktop",1512,982),("mobile",390,844)]:
            page=browser.new_page(viewport={"width":width,"height":height},device_scale_factor=1)
            errors=[]
            page.on("pageerror",lambda e:errors.append(str(e)[:200]))
            response=page.goto(BASE+"/",wait_until="domcontentloaded",timeout=30000)
            assert response and response.status==200,("ROOT_ROUTE",response.status if response else None)
            assert page.locator("#pairName").is_visible()
            assert page.locator("#agentPrompt").is_visible(),"Free first-use question must be immediately actionable"
            assert page.locator('[data-pane="agent"].active').count()==1,"Agent pane was not first"
            assert page.locator("#inlineAgentResult").count()==1
            assert page.locator('a[href="/developers"]').count()>0
            assert page.locator('a[href="/app?view=community"]').count()>0
            assert page.locator("#chartSVG").count()==1
            page.wait_for_function("""() => {
              let status=document.querySelector('#feedStatus')?.textContent||'';
              return status.includes('SOURCE OBSERVED')||status.includes('DEMO / FALLBACK')||status.includes('SOURCE UNAVAILABLE');
            }""",timeout=35000)
            mode=page.locator("#feedStatus").inner_text().strip()
            if mode=="KRAKEN / SOURCE OBSERVED":
                page.wait_for_selector("#sfNativeCandleChart canvas",state="visible",timeout=15000)
                assert page.locator("#chartState").inner_text().startswith("KRAKEN PUBLIC OHLC")
                print("V10_LIVE_KRAKEN_RENDER_PASS",kind)
            else:
                assert mode in ("DEMO / FALLBACK","SOURCE UNAVAILABLE"),("UNTRUSTWORTHY_FEED",mode)
                print("V10_EXPLICIT_PROVIDER_OUTAGE",kind,mode)
            if kind=="mobile":
                agent=page.locator(".rightpane").bounding_box()
                chart=page.locator(".center").bounding_box()
                assert agent and chart and agent["y"]<chart["y"],"Mobile Agent must appear ahead of chart"
                page.locator("#sfNavToggle").click()
                assert page.locator("#sfNavToggle").get_attribute("aria-expanded")=="true"
                assert page.locator("#sfTerminalGlobalNav").is_visible()
                page.locator("#sfNavToggle").click()
            # Check the actual remote research path from this same integrated root.
            page.locator("#agentPrompt").fill("Inspect Hyperliquid BTC funding and open interest")
            page.locator("#copyPrompt").click()
            page.wait_for_function("""() => {
             const out=document.querySelector('#inlineAgentResult');
             return out && !out.hidden && (out.textContent.includes('SOURCE OBSERVED') ||
              out.textContent.includes('SOURCE UNAVAILABLE') || out.textContent.includes('RESEARCH UNAVAILABLE'));
            }""",timeout=35000)
            result=page.locator("#inlineAgentResult").inner_text()
            assert "SOURCE OBSERVED" in result or "SOURCE UNAVAILABLE" in result,("RESEARCH_NOT_ACCEPTED",result[:200])
            if "SOURCE OBSERVED" in result:
                assert page.locator("#inlineAgentResult a[href^='https://app.hyperliquid.xyz/']").count()>0
            overflow=page.evaluate("() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth})")
            assert max(overflow["scroll"],overflow["body"])<=width+3,("HORIZONTAL_OVERFLOW",kind,overflow)
            assert not errors,("JS_ERRORS",kind,errors)
            page.screenshot(path=str(ART/f"production-v10-{kind}.png"),full_page=(kind=="mobile"),animations="disabled")
            print("V10_REAL_REMOTE_BROWSER_ACCEPTED",kind,"market_mode=",mode,"research=",
                "SOURCE_OBSERVED" if "SOURCE OBSERVED" in result else "SOURCE_UNAVAILABLE")
            page.close()
    finally:
        browser.close()
print("V10_REMOTE_PRODUCT_FIRST_ACCEPTED_NO_FIXTURES")
