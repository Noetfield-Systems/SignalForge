"""SignalForge v11: real-browser, real-PostgreSQL cross-surface UI/UX acceptance.
No exchange/API fixtures and no synthetic financial effects. Temporary account is deleted.
Tests functional navigation and user flows instead of screenshot-only green badges.
"""
import os, pathlib, json, uuid, re
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

BASE=os.environ.get("VISUAL_BASE","http://localhost:18182").rstrip("/")
CHROME=os.environ.get("CHROME","/usr/bin/google-chrome")
ART=pathlib.Path("artifacts/ui-v11")
ART.mkdir(parents=True,exist_ok=True)

PUBLIC=[
 ("/","home","workspace","#agentPrompt"),
 ("/welcome","marketing","marketing","h1"),
 ("/start","start","marketing","h1"),
 ("/terminal-next","terminal-v2","workspace","#pairName"),
 ("/app","legacy-app","terminal","#view-dashboard"),
 ("/agent","agent","agent","#researchForm"),
 ("/radar","radar","radar","#search"),
 ("/web3","market-pulse","pulse","#prediction"),
 ("/developers","developers","developers","#copyConfig"),
 ("/research/00000000-0000-0000-0000-000000000001","public-card","research-card","#summary"),
]
INTERNAL=[
 ("/admin/revenue","revenue-control","internal","#cards"),
 ("/admin/company-floor","company-floor","internal","#notice")
]
APP_VIEWS=["dashboard","scanner","strategies","backtest","trackrecord","community","models","api","pricing"]

def unique_errors(errors):
 return list(dict.fromkeys(errors))[:8]

with sync_playwright() as playwright:
 browser=playwright.chromium.launch(headless=True,executable_path=CHROME,
  args=["--no-sandbox","--disable-dev-shm-usage"])
 try:
  for layout,width,height in [("desktop",1440,900),("mobile",390,844)]:
   context=browser.new_context(viewport={"width":width,"height":height},
    device_scale_factor=1,permissions=["clipboard-read","clipboard-write"])
   for path,name,surface,selector in PUBLIC:
    page=context.new_page()
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)[:220]))
    response=page.goto(BASE+path,wait_until="domcontentloaded",timeout=25000)
    assert response and response.status==200,(layout,name,"HTTP",response.status if response else None)
    assert page.locator(selector).count()>0,(layout,name,"MISSING_PRIMARY",selector)
    assert page.locator(f'body[data-sf-surface="{surface}"]').count()==1,(layout,name,"UNIFIED_SURFACE_MISSING")
    if surface!="internal":
     page.wait_for_function("!!window.SFUI?.openCommand",timeout=7000)
     page.keyboard.press("Control+k")
     modal=page.locator(".sf-command-backdrop")
     assert modal.is_visible(),(layout,name,"COMMAND_PALETTE_NOT_OPENED")
     page.locator("#sf-command-search").fill("rooms")
     results=page.locator(".sf-command-items a[href='/app?view=community']")
     assert results.count()==1,(layout,name,"SIGNAL_ROOMS_NOT_SEARCHABLE")
     assert results.is_visible()
     page.keyboard.press("Escape")
     assert modal.is_hidden(),(layout,name,"COMMAND_PALETTE_NOT_CLOSED")
     if layout=="mobile":
      dock=page.locator(".sf-mobile-dock")
      assert dock.is_visible(),(layout,name,"DOCK_HIDDEN")
      assert dock.locator("a").count()==4 and dock.locator("button").count()==1
      minimum=dock.locator("button").bounding_box()
      assert minimum and minimum["height"]>=44,(layout,name,"TOUCH_TARGET_TOO_SMALL")
      dock.locator("button").click()
      assert modal.is_visible(),(layout,name,"DOCK_ALL_TOOLS_INERT")
      page.keyboard.press("Escape")
    else:
     assert page.locator(".sf-global-launcher").count()==0,(layout,name,"INTERNAL_OVERLAY")
    # Existing page scripts may load asynchronously. Check after a brief bounded settle.
    page.wait_for_timeout(450)
    assert not errors,(layout,name,"PAGE_JS_EXCEPTION",unique_errors(errors))
    size=page.evaluate("""() => ({
      inner: innerWidth, doc: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    })""")
    assert max(size["doc"],size["body"])<=width+3,(layout,name,"HORIZONTAL_OVERFLOW",size)
    if name in ("home","agent","legacy-app","radar","market-pulse","developers","public-card"):
     page.screenshot(path=str(ART/(name+"-"+layout+".png")),animations="disabled",full_page=(layout=="mobile"))
    print("V11_SURFACE_PASS",layout,name,"width",width)
    page.close()

   # Nine actual internal application views, not just the parent /app page.
   for view in APP_VIEWS:
    page=context.new_page()
    response=page.goto(BASE+"/app?view="+view,wait_until="load",timeout=30000)
    assert response and response.status==200,("APP_VIEW_HTTP",view)
    page.wait_for_function("""v => {
      const target=document.getElementById("view-"+v);
      return target && !target.classList.contains("hidden") &&
       document.querySelector('[data-view="'+v+'"]')?.classList.contains("active");
    }""",arg=view,timeout=12000)
    assert page.locator("#view-"+view).is_visible(),("APP_VIEW_NOT_VISIBLE",view)
    if layout=="mobile":
     assert page.locator(".sf-mobile-dock").is_visible()
    if view in ("community","pricing","backtest","scanner","api"):
     page.screenshot(path=str(ART/("app-"+view+"-"+layout+".png")),animations="disabled")
    print("V11_APP_VIEW_PASS",layout,view)
    page.close()
   context.close()

  # Actual account flows: source-of-truth PostgreSQL and explicit test cleanup.
  context=browser.new_context(viewport={"width":1440,"height":900})
  p=context.new_page()
  p.goto(BASE+"/app",wait_until="load")
  p.locator("#sideJoin").click()
  assert p.locator("#authModal.open").is_visible(),"SIGNUP_MODAL_INERT"
  email="ui-v11-"+uuid.uuid4().hex[:12]+"@signalforge.test"
  password="BrowserTestPass!2026"
  try:
   p.locator("#authEmail").fill(email)
   p.locator("#authPassword").fill(password)
   with p.expect_response(lambda r: "/api/auth/signup" in r.url,timeout=14000) as completed:
    p.locator("#authSubmit").click()
   signup_response=completed.value
   print("V11_SIGNUP_HTTP",signup_response.status)
   assert signup_response.status==201,("BROWSER_SIGNUP_REJECTED",signup_response.status,signup_response.text()[:350])
   p.wait_for_function("document.querySelector('#authModal')&&!document.querySelector('#authModal').classList.contains('open')",timeout=10000)
   signed=context.request.get(BASE+"/api/auth/me")
   assert signed.status==200
   account=signed.json().get("user")
   assert account and account["email"]==email,("SIGNUP_NOT_PERSISTED",account)
   print("V11_REAL_POSTGRES_BROWSER_SIGNUP_PASS")
   p.goto(BASE+"/app?view=community",wait_until="load")
   p.wait_for_function("!document.querySelector('#view-community').classList.contains('hidden')",timeout=9000)
   assert p.locator("#roomNew").is_visible(),"COMMUNITY_ACTION_NOT_VISIBLE"
   p.locator("#roomNew").click()
   assert p.locator("#roomComposer").is_visible(),"COMMUNITY_COMPOSER_NOT_WORKING"
   p.locator("#roomClose").click()
   print("V11_AUTHENTICATED_ROOM_COMPOSER_PASS")
   p.goto(BASE+"/agent",wait_until="domcontentloaded")
   p.wait_for_timeout(700)
   assert p.locator("#forgeForm").count()==1
   assert p.locator("#customerTasks").count()==1
   assert p.locator("#v6Workspace").count()==1
   print("V11_AGENT_FORGE_TASK_MEMORY_COMPONENTS_PRESENT")
  finally:
   # End-to-end deletion, not merely a logout or orphaned seeded user.
   response=context.request.post(BASE+"/api/account/delete",
    data=json.dumps({"confirm":"DELETE","password":password}),
    headers={"content-type":"application/json"})
   assert response.status==200,("TEST_ACCOUNT_CLEANUP_FAILED",response.status,response.text()[:500])
   assert response.json().get("deleted") is True
   print("V11_TEST_ACCOUNT_INDEPENDENTLY_PURGED")
   p.close();context.close()
 finally:
  browser.close()
print("SIGNALFORGE_V11_ALL_SURFACES_AND_USER_JOURNEYS_PASS")
