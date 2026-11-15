"""v12 user-first whole-product audit, running against real Bun + disposable PostgreSQL.
No intercepted market APIs, fake customers, fake candles, Stripe charges or trade effects.
Records concrete visible controls/typography, source states and independent screenshots.
"""
import json,os,pathlib
from playwright.sync_api import sync_playwright
BASE=os.environ.get("VISUAL_BASE","http://localhost:18182").rstrip("/")
CHROME=os.environ.get("CHROME","/usr/bin/google-chrome")
OUT=pathlib.Path("artifacts/ui-v11")
OUT.mkdir(parents=True,exist_ok=True)
TARGETS=[
 ("/","live-terminal"),
 ("/app?view=dashboard","app-dashboard"),
 ("/app?view=scanner","scanner"),
 ("/app?view=strategies","strategies"),
 ("/app?view=backtest","backtest"),
 ("/app?view=trackrecord","trackrecord"),
 ("/app?view=community","rooms"),
 ("/app?view=models","models"),
 ("/app?view=api","api"),
 ("/app?view=pricing","plans"),
 ("/agent","agent"),
 ("/radar","radar"),
 ("/web3","pulse"),
 ("/developers","developers"),
 ("/welcome","welcome"),
 ("/start","start"),
 ("/terminal-next","terminal-next"),
 ("/research/00000000-0000-0000-0000-000000000001","research-card"),
]
AUDIT_JS="""() => {
 const style=getComputedStyle(document.body);
 const controls=[...document.querySelectorAll("a[href],button,input,textarea,select")].filter(n=>{
  const r=n.getBoundingClientRect(),s=getComputedStyle(n);
  return r.width>0&&r.height>0&&s.visibility!=="hidden"&&s.display!=="none"&&!n.closest("[hidden]");
 }).map(n=>{
  const r=n.getBoundingClientRect(),s=getComputedStyle(n);
  return {tag:n.tagName.toLowerCase(),name:(n.getAttribute("aria-label")||n.getAttribute("title")||n.innerText||n.value||"").trim().slice(0,90),
   width:Math.round(r.width),height:Math.round(r.height),font:parseFloat(s.fontSize)||0,
   href:n.getAttribute("href")||"",disabled:!!n.disabled};
 });
 return {title:document.title,font:style.fontFamily,viewport:innerWidth,
   docWidth:document.documentElement.scrollWidth,
   buttons:controls.filter(c=>c.tag==="button").length,
   controls:controls.length,
   unlabeledButtons:controls.filter(c=>c.tag==="button"&&!c.name&&!c.disabled),
   smallButtons:controls.filter(c=>c.tag==="button"&&c.height<32&&!c.disabled).slice(0,30),
   tinyInteractiveText:controls.filter(c=>c.font<10&&!c.disabled).slice(0,30),
   missingAnchors:controls.filter(c=>c.tag==="a"&&(!c.href||c.href==="#"||c.href==="javascript:void(0)")),
   pageErrors:[]};
}"""
results=[]
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(headless=True,executable_path=CHROME,args=["--no-sandbox","--disable-dev-shm-usage"])
 try:
  for layout,width,height in [("desktop",1440,900),("mobile",390,844)]:
   context=browser.new_context(viewport={"width":width,"height":height},device_scale_factor=1,
    permissions=["clipboard-read","clipboard-write"])
   for route,name in TARGETS:
    page=context.new_page()
    errors=[]
    page.on("pageerror",lambda err:errors.append(str(err)[:240]))
    response=page.goto(BASE+route,wait_until="load" if name in ("app-dashboard","scanner","strategies","backtest","trackrecord","rooms","models","api","plans") else "domcontentloaded",timeout=30000)
    assert response and response.status==200,("V12_PUBLIC_ROUTE_FAILED",layout,route)
    if name in ("app-dashboard","scanner","strategies","backtest","trackrecord","rooms","models","api","plans"):
     view={"app-dashboard":"dashboard","rooms":"community","plans":"pricing"}.get(name,name)
     page.wait_for_function("""v => {
       const el=document.getElementById("view-"+v);
       return el&&!el.classList.contains("hidden");
     }""",arg=view,timeout=12000)
    page.wait_for_timeout(450)
    audit=page.evaluate(AUDIT_JS)
    audit.update({"surface":name,"route":route,"layout":layout,"pageErrors":list(dict.fromkeys(errors))})
    assert audit["docWidth"]<=width+3,("V12_HORIZONTAL_OVERFLOW",name,layout,audit["docWidth"])
    assert not errors,("V12_JS_ERROR",name,layout,errors)
    assert not audit["unlabeledButtons"],("V12_UNLABELED_BUTTON",layout,name,audit["unlabeledButtons"])
    assert "Manrope" in audit["font"] or "DM Sans" in audit["font"],("V12_FONT_SYSTEM_NOT_APPLIED",layout,name,audit["font"])
    assert audit["controls"]>=1,("V12_NONINTERACTIVE_SCREEN",layout,name)
    if name in ("agent","radar","pulse","developers","welcome","research-card"):
     assert page.locator(".sf-synapse").count()==1,("V12_REAL_MARKET_RAIL_MISSING",layout,name)
    if name=="agent":
     composer=page.locator("#researchForm").bounding_box()
     examples=page.locator(".sf-agent-secondary").bounding_box()
     assert composer and examples and composer["y"]<examples["y"],("V12_FORM_NOT_FIRST",layout)
     assert page.locator("#prompt").is_visible()
     assert page.locator("#run").is_visible()
    if name=="pulse":
     assert page.locator(".sf-source-venue").count()==3,("V12_SOURCE_MATRIX_MISSING",layout)
    if name=="developers":
     assert page.locator("#sfMcpLiveReadback").count()==1
    if name=="research-card":
     assert page.locator("#sfResearchSourceCount").count()==1
    if name in ("app-dashboard","scanner","strategies","backtest","trackrecord","rooms","models","api","plans"):
     assert page.locator(".sf-global-launcher").count()==1,("V12_CMD_MISSING",name)
     if name!="app-dashboard":
      assert page.locator("#view-"+{"rooms":"community","plans":"pricing"}.get(name,name)+" .sf-view-navigation").count()==1,("V12_DEEP_VIEW_NAV_MISSING",name)
    if name=="app-dashboard":
     assert page.locator("#sfLegacyNativeChart").count()==1
     page.wait_for_function("!!window.SFMarketChart",timeout=8000)
     page.wait_for_timeout(800)
     audit["nativeChart"]={
       "modeLabel":page.locator("#feedStatus").inner_text(),
       "nativeVisible":page.locator("#sfLegacyNativeChart").is_visible(),
       "canvasVisible":page.locator("#priceChart").is_visible(),
     }
     assert audit["nativeChart"]["nativeVisible"] or audit["nativeChart"]["canvasVisible"],"V12_NO_MARKET_CHART"
    if name=="plans":
     assert page.locator("[data-subscribe]").count()==2,("V12_STRIPE_PLAN_CTA_LOST",layout)
    results.append(audit)
    if name in ("agent","radar","pulse","developers","rooms","plans","app-dashboard","research-card"):
     page.screenshot(path=str(OUT/("v12-"+name+"-"+layout+".png")),animations="disabled",full_page=(layout=="mobile"))
    print("V12_INTERACTIVE_AUDIT_PASS",layout,name,"controls",audit["controls"],
      "tiny",len(audit["tinyInteractiveText"]),"small",len(audit["smallButtons"]))
    page.close()
   context.close()

  # Private operations remain private. Admin tests use only an isolated local
  # CI database and an explicit test-only admin email configured by the workflow.
  admin_email=os.environ.get("SIGNALFORGE_ADMIN_EMAIL","")
  if admin_email.endswith("@signalforge.test"):
   context=browser.new_context(viewport={"width":1440,"height":900})
   secret="DisposableAudit2026!"
   registered=False
   try:
    signup=context.request.post(BASE+"/api/auth/signup",data=json.dumps(
     {"email":admin_email,"password":secret}),headers={"content-type":"application/json"})
    assert signup.status==201,("V12_CI_ADMIN_SIGNUP_FAILED",signup.status,signup.text()[:200])
    registered=True
    me=context.request.get(BASE+"/api/auth/me")
    assert me.status==200 and me.json().get("user",{}).get("role")=="admin","V12_TEST_ROLE_INVALID"
    for layout,width,height in [("desktop",1440,900),("mobile",390,844)]:
     for path,name in [("/admin/revenue","revenue"),("/admin/company-floor","company-floor")]:
      p=context.new_page()
      p.set_viewport_size({"width":width,"height":height})
      r=p.goto(BASE+path,wait_until="domcontentloaded",timeout=25000)
      assert r and r.status==200,("V12_ADMIN_VIEW_REJECTED",name,r.status if r else None)
      assert p.locator('body[data-sf-surface="internal"]').count()==1
      p.screenshot(path=str(OUT/("v12-"+name+"-"+layout+".png")),animations="disabled")
      a=p.evaluate(AUDIT_JS);a.update({"surface":name,"layout":layout,"private":True})
      assert a["docWidth"]<=width+3,("V12_ADMIN_OVERFLOW",name,layout)
      results.append(a);p.close()
      print("V12_PRIVATE_SURFACE_PASS",layout,name)
   finally:
    if registered:
     cleared=context.request.post(BASE+"/api/account/delete",data=json.dumps({"confirm":"DELETE","password":secret}),
       headers={"content-type":"application/json"})
     assert cleared.status==200 and cleared.json().get("deleted") is True,"V12_ADMIN_TEST_USER_CLEANUP_FAILURE"
    context.close()
    print("V12_ISOLATED_PRIVATE_ACCOUNT_PURGED")
 finally:
  browser.close()
(OUT/"v12-surface-audit.json").write_text(json.dumps(results,indent=2),encoding="utf8")
print("V12_COMPLETE_USER_UI_AUDIT_PASS",len(results),"screens")
