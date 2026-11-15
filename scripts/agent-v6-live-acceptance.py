#!/usr/bin/env python3
"""Independent production acceptance: SignalForge v6, two sessions, owned market monitor."""
import json
import os
import secrets
import sys
import time
import uuid
from http.cookiejar import CookieJar
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener

BASE=os.environ.get("BASE","https://signalforge-web-production.up.railway.app").rstrip("/")
PASSWORD="LiveV6#"+secrets.token_urlsafe(15)
EMAIL="sf-v6-live-"+uuid.uuid4().hex[:15]+"@signalforge.invalid"
def session():return build_opener(HTTPCookieProcessor(CookieJar()))
client=session()
account=False
def req(opener,path,body=None,method="GET"):
    data=json.dumps(body).encode() if body is not None else None
    headers={"Accept":"application/json"}
    if data is not None:headers["Content-Type"]="application/json"
    r=Request(BASE+path,data=data,headers=headers,method=method)
    try:
        with opener.open(r,timeout=30) as response:
            raw=response.read(200000)
            if response.headers.get("Content-Type","").startswith("application/json"):
                return response.status,json.loads(raw)
            return response.status,raw.decode(errors="replace")
    except HTTPError as e:
        raw=e.read(80000)
        try:j=json.loads(raw)
        except Exception:j={"error":raw.decode(errors="replace")[:100]}
        return e.code,j

def assert_eq(code,value,expected):
    assert code==expected,(code,str(value)[:330])
    return value
def wait_task(opener,task_id):
    for _ in range(40):
        code,task=req(opener,"/api/agent/tasks/"+task_id)
        assert code==200,(code,task)
        if task["status"] in ("SUCCEEDED","FAILED","CANCELLED"):
            assert task["status"]=="SUCCEEDED",task.get("lastError",task["status"])
            return task
        time.sleep(1.5)
    raise AssertionError("Timed out awaiting existing SignalForge customer worker")
try:
    for _ in range(25):
        code,page=req(client,"/agent")
        if code==200 and 'id="modelAnalysis"' in page and 'id="forgeForm"' in page:
            break
        time.sleep(4)
    else:raise AssertionError("v6 UI not yet deployed")
    print("V6_LIVE_PREMIUM_WORKBENCH_PASS")
    code,gateway=req(client,"/api/agent/gateway")
    assert code==200 and gateway["schema"]=="signalforge.model-gateway.v1",(code,gateway)
    print("V6_LIVE_GATEWAY_CONFIGURATION", "CONFIGURED" if gateway["configured"] else "UNCONFIGURED_SOURCE_ONLY")
    assert_eq(*req(client,"/api/agent/conversations"),401)
    code,signup=req(client,"/api/auth/signup",{"email":EMAIL,"password":PASSWORD,"emailConsent":False,"marketingSource":"synthetic_ci_smoke"},"POST")
    assert code==201,(code,signup)
    account=True
    code,quota=req(client,"/api/agent/entitlements")
    assert code==200 and quota["entitlements"]["sourceResearchPerDay"]>0,(code,quota)
    code,memory=req(client,"/api/agent/memories",{"note":"Research BTC funding trends with source citations and observe changes over time."},"POST")
    assert code==201,(code,memory)
    code,watch=req(client,"/api/watchlist",{"symbol":"BTCUSD"},"POST")
    assert code==200 or code==201,(code,watch)
    prompt="Inspect Hyperliquid BTC funding and open interest"
    code,started=req(client,"/api/agent/tasks",{"prompt":prompt,"engine":"source"},"POST")
    assert code==202 and started["engine"]=="DETERMINISTIC_SOURCE_ONLY",(code,started)
    conv_id=started["conversationId"]
    first=wait_task(client,started["taskId"])
    assert first["artifact"]["sourceObservation"]["status"]=="SOURCE_OBSERVED"
    assert first["usage"]["modelCalls"]==0
    code,verified=req(client,"/api/agent/tasks/"+started["taskId"]+"/verify")
    assert code==200 and verified["valid"] is True,(code,verified)
    print("V6_LIVE_REAL_HYPERLIQUID_TASK_RECEIPT_PASS")
    code,logout=req(client,"/api/auth/logout",{},"POST")
    assert code==200,(code,logout)
    assert_eq(*req(client,"/api/agent/conversations/"+conv_id),401)
    fresh=session()
    code,login=req(fresh,"/api/auth/login",{"email":EMAIL,"password":PASSWORD},"POST")
    assert code==200 and login.get("user"),(code,login)
    code,history=req(fresh,"/api/agent/conversations/"+conv_id)
    assert code==200 and any(x["id"]==first["id"] for x in history["messages"]),(code,history)
    code,memory_list=req(fresh,"/api/agent/memories")
    assert code==200 and any("BTC funding" in x["note"] for x in memory_list["items"]),(code,memory_list)
    code,watchlist=req(fresh,"/api/watchlist")
    assert code==200 and any(x["symbol"]=="BTCUSD" for x in watchlist["items"]),(code,watchlist)
    print("V6_LIVE_REAL_SECOND_SESSION_PRIVATE_MEMORY_PASS")
    code,follow=req(fresh,"/api/agent/tasks",{"prompt":"Inspect Hyperliquid BTC funding again and compare with my prior investigation","engine":"source","conversationId":conv_id},"POST")
    assert code==202 and follow["conversationId"]==conv_id,(code,follow)
    second=wait_task(fresh,follow["taskId"])
    code,history=req(fresh,"/api/agent/conversations/"+conv_id)
    assert code==200 and len(history["messages"])>=2,(code,history)
    print("V6_LIVE_FOLLOWUP_SAME_CONVERSATION_PASS")
    code,forge=req(fresh,"/api/agent/forge",{"title":"BTC Funding Source Monitor","prompt":prompt,"cadenceMinutes":1440},"POST")
    assert code==201,(code,forge)
    mid=forge["id"]
    code,manual=req(fresh,"/api/agent/forge/"+mid+"/run",{},"POST")
    assert code==202,(code,manual)
    third=wait_task(fresh,manual["taskId"])
    assert third["scheduleId"]==mid,(third["scheduleId"],mid)
    code,published=req(fresh,"/api/agent/forge/"+mid+"/share",{},"POST")
    assert code==201,(code,published)
    code,public=req(client,published["path"])
    assert code==200 and public["sourceLinked"] and public["evidence"],(code,public)
    assert "email" not in public and "userId" not in public
    code,notifications=req(fresh,"/api/agent/notifications")
    assert code==200 and notifications["delivery"]=="IN_APP_PERSISTENT" and notifications["externalEmailSent"] is False
    code,disabled=req(fresh,"/api/agent/schedules/"+mid+"/disable",{},"POST")
    assert code==200 and disabled["status"]=="DISABLED",(code,disabled)
    print("V6_LIVE_FORGE_RUN_SOURCE_LINK_SHARE_DISABLE_PASS")
    print("V6_LIVE_MULTI_SESSION_E2E_ACCEPTED")
except Exception as error:
    print("V6_LIVE_MULTI_SESSION_E2E_FAILED",type(error).__name__,str(error)[:500],file=sys.stderr)
    sys.exit_code=1
finally:
    if account:
        valid=session()
        code,login=req(valid,"/api/auth/login",{"email":EMAIL,"password":PASSWORD},"POST")
        if code==200:
            code,purge=req(valid,"/api/account/delete",{"confirm":"DELETE","password":PASSWORD},"POST")
            if code==200 and purge.get("deleted") is True:
                print("V6_SYNTHETIC_CUSTOMER_PURGED")
            else:
                print("V6_SYNTHETIC_CUSTOMER_CLEANUP_FAILED",code,str(purge)[:200],file=sys.stderr)
                sys.exit_code=1
        else:
            print("V6_SYNTHETIC_CUSTOMER_CLEANUP_LOGIN_FAILED",code,file=sys.stderr)
            sys.exit_code=1
if getattr(sys,"exit_code",0):
    sys.exit(sys.exit_code)
