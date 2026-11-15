"""Independent production-only Chromium acceptance. No route interception or fixture.
Run against the deployed real public SignalForge terminal, not a local build.
"""
import os, time, json, shutil, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.getenv("BASE","https://signalforge-web-production.up.railway.app").rstrip("/")
OUT=Path(os.getenv("SCREENSHOT_DIR","artifacts/live-terminal"))
OUT.mkdir(parents=True,exist_ok=True)

def get_json(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={"Accept":"application/json","User-Agent":"SignalForge-ExternalAcceptance/1.0"}),timeout=25) as r:
  assert r.status==200,(url,r.status)
  return json.load(r)

def preflight():
 last=None
 for retry in range(35):
  try:
   with urllib.request.urlopen(BASE+"/assets/sf-market-chart.js",timeout=14) as r:
    code=r.read(20000).decode("utf-8")
    if r.status==200 and "SFMarketChart" in code:return
  except Exception as ex:last=str(ex)[:180]
  time.sleep(4)
 raise AssertionError(("Production not upgraded to shared native chart",last))

preflight()
api=get_json(BASE+"/api/market?symbol=BTCUSD&interval=60")
assert isinstance(api,dict)
assert isinstance(api.get("mode"),str) and bool(api["mode"]),("Missing provider provenance mode",api.get("mode"))
print("PRODUCTION_PUBLIC_KRAKEN_REPORTED_MODE",api.get("mode"),"candles",len(api.get("candles") or []))

with sync_playwright() as p:
 chrome=os.getenv("CHROME") or shutil.which("google-chrome") or shutil.which("chromium")
 browser=p.chromium.launch(headless=True,executable_path=chrome,args=["--no-sandbox","--disable-dev-shm-usage"])
 try:
  for device,(width,height) in (("desktop",(1512,982)),("mobile",(390,844))):
   page=browser.new_page(viewport={"width":width,"height":height},device_scale_factor=1)
   failures=[]
   page.on("pageerror",lambda error:failures.append(str(error)[:250]))
   response=page.goto(BASE+"/terminal-next",wait_until="domcontentloaded",timeout=30000)
   assert response and response.status==200,("Terminal route unavailable",device,response.status if response else None)
   assert page.locator("#chartSVG").count()==1
   assert page.locator("#inlineAgentResult").count()==1
   assert page.locator("nav[data-sf-nav]").count()==1
   assert page.evaluate("Boolean(window.SFMarketChart && window.LightweightCharts)"),"TradingView locally served chart module did not load"
   page.wait_for_function("""() => {
    const state=document.querySelector('#feedStatus')?.textContent||'';
    return state.includes('SOURCE OBSERVED')||state.includes('DEMO / FALLBACK')||state.includes('SOURCE UNAVAILABLE')
   }""",timeout=25000)
   source=page.locator("#feedStatus").inner_text()
   if "SOURCE OBSERVED" in source:
    page.wait_for_selector("#sfNativeCandleChart canvas",state="visible",timeout=14000)
    assert "SOURCE BARS" in page.locator("#chartState").inner_text()
    print("LIVE_NATIVE_TRADINGVIEW_CANVAS_SOURCE_PASS",device)
   else:
    assert page.locator("#chartState").inner_text().startswith("PUBLIC SOURCE UNAVAILABLE"),("Unsafe fallthrough",device)
    print("LIVE_SOURCE_OUTAGE_NONFABRICATED_PASS",device,source)
   dims=page.evaluate("() => ({width:innerWidth,scroll:document.documentElement.scrollWidth})")
   assert dims["scroll"]<=width+3,("Live mobile horizontal overflow",device,dims)
   assert page.locator('a[href="https://www.tradingview.com/"]').count()>=1
   assert not failures,("Uncaught client JS errors",device,failures)
   page.screenshot(path=str(OUT/f"production-terminal-{device}.png"),full_page=True)
   print("PRODUCTION_REAL_CHROMIUM_SCREENSHOT",device,source,dims)
   if device=="mobile":
    page.locator("#sfNavToggle").click()
    assert page.locator("#sfNavToggle").get_attribute("aria-expanded")=="true"
    assert page.locator('#sfTerminalGlobalNav a[href="/agent"]').is_visible()
   page.locator('[data-pane="agent"]').click()
   page.locator("#agentPrompt").fill("Inspect Kraken BTC OHLC and current market structure")
   page.locator("#copyPrompt").click()
   page.wait_for_function("() => document.querySelector('#inlineAgentResult')?.textContent?.includes('SOURCE OBSERVED') || document.querySelector('#inlineAgentResult')?.textContent?.includes('SOURCE UNAVAILABLE')",timeout=25000)
   assert page.locator("#inlineAgentResult").is_visible()
   print("PRODUCTION_REAL_SOURCE_AGENT_PANEL_PASS",device)
   page.close()
 finally:
  browser.close()
print("SIGNALFORGE_EXTERNAL_LIVE_TERMINAL_BROWSER_ACCEPTED")
