#!/usr/bin/env python3
"""Independent external source-backed production E2E using a disposable non-customer account."""
import json
import os
import secrets
import sys
import time
import uuid
from http.cookiejar import CookieJar
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener

BASE = os.environ.get("BASE", "https://signalforge-web-production.up.railway.app").rstrip("/")
opener = build_opener(HTTPCookieProcessor(CookieJar()))
password = "LiveSourceCheck!" + secrets.token_urlsafe(16)
email = "sf-sourcea-smoke-" + uuid.uuid4().hex[:14] + "@signalforge.invalid"
account_created = False
def request(path, body=None, method="GET"):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = Request(BASE+path, data=data, headers=headers, method=method)
    try:
        with opener.open(req, timeout=32) as res:
            raw = res.read(200000)
            return res.status, json.loads(raw) if raw and res.headers.get("Content-Type","").startswith("application/json") else raw.decode(errors="replace")
    except HTTPError as exc:
        raw = exc.read(100000)
        try:
            result = json.loads(raw)
        except Exception:
            result = {"error":raw.decode(errors="replace")[:100]}
        return exc.code, result

try:
    # Production commits have eventual consistency. Keep the bounded readiness loop.
    for attempt in range(18):
        code, page = request("/agent")
        if code == 200 and isinstance(page,str) and 'id="executionDesk"' in page and 'id="automationForm"' in page:
            break
        time.sleep(5)
    else:
        raise AssertionError("Production /agent has not deployed SourceA task timeline")
    print("SOURCEA_LIVE_UI_READBACK_PASS")
    code, auth = request("/api/agent/tasks")
    assert code==401 and auth.get("error")=="SIGN_IN_REQUIRED", (code,auth)
    code, skills = request("/api/agent/skills")
    assert code==200 and skills["skills"][0]["skillId"]=="signalforge.market-research", (code,skills)
    assert skills["remoteSourceAExecutorConnected"] is False
    print("SOURCEA_PUBLIC_SKILL_AND_PRIVATE_BOUNDARY_PASS")
    code, signup = request("/api/auth/signup",{"email":email,"password":password,"emailConsent":False,"marketingSource":"synthetic_ci_smoke"},"POST")
    assert code==201 and signup.get("user",{}).get("email")==email, (code,signup)
    account_created = True
    prompt = "Inspect Hyperliquid BTC funding and open interest"
    code, creation = request("/api/agent/tasks",{"prompt":prompt},"POST")
    assert code==202, (code,creation)
    task_id=creation["taskId"]
    packet=creation["packet"]
    assert packet["schema"]=="sourcea.signalforge-workpacket.v1"
    assert packet["allowedCapabilities"]==["read:market.perps"]
    assert "company_os_dispatch" in packet["forbiddenCapabilities"]
    print("SOURCEA_LIVE_TASK_CREATED_READ_ONLY",task_id)
    for attempt in range(28):
        code, task=request("/api/agent/tasks/"+task_id)
        assert code==200, (code,task)
        if task["status"] in ("SUCCEEDED","FAILED","CANCELLED"):
            break
        time.sleep(2)
    else:
        raise AssertionError("Worker did not settle task within bounded poll")
    if task["status"]!="SUCCEEDED":
        raise AssertionError("Provider execution incomplete: "+str(task.get("lastError") or task["status"]))
    assert task["artifact"]["sourceObservation"]["status"]=="SOURCE_OBSERVED"
    assert task["artifact"]["sourceObservation"]["financialExecution"] is False
    assert len(task["artifact"]["sourceObservation"]["evidence"])>=1
    for source in task["artifact"]["sourceObservation"]["evidence"]:
        assert source["venue"]=="Hyperliquid",source
        assert source["source"]=="Hyperliquid public Info API"
        assert source["observedAt"] and source["sourceUrl"].startswith("https://app.hyperliquid.xyz/trade/")
    assert task["receipt"]["signatureType"]=="SHA256_INTEGRITY_DIGEST_NOT_SIGNED"
    assert task["receipt"]["evaluation"]["verdict"]=="PASS"
    assert task["usage"]["modelCalls"]==0 and task["usage"]["providerBilledUsd"] is None
    assert [x["event"] for x in task["events"]][:2]==["QUEUED","RUNNING"]
    print("SOURCEA_LIVE_SOURCE_ARTIFACT_RECEIPT_PASS observations=",len(task["artifact"]["sourceObservation"]["evidence"]))
    code, verdict=request("/api/agent/tasks/"+task_id+"/verify")
    assert code==200 and verdict["valid"] is True, (code,verdict)
    print("SOURCEA_LIVE_RECEIPT_INDEPENDENT_DIGEST_READBACK_PASS")
    agent_job_id=task["persistedJobId"]
    assert agent_job_id and agent_job_id.isdigit(),task
    code, thesis=request("/api/agent/theses",{"jobId":agent_job_id,"invalidation":"This source no longer reports the present position"},"POST")
    assert code==201, (code,thesis)
    code, shared=request("/api/agent/share",{"jobId":agent_job_id},"POST")
    assert code==201 and shared["path"].startswith("/research/"),(code,shared)
    code, card=request("/api/agent/public/"+shared["path"].split("/")[-1])
    assert code==200 and card["evidence"] and "prompt" not in card, (code,card)
    print("SOURCEA_LIVE_PRIVATE_THESIS_PUBLIC_EVIDENCE_CARD_PASS")
    code, schedule=request("/api/agent/schedules",{"prompt":prompt,"cadenceMinutes":1440},"POST")
    assert code==201,(code,schedule)
    code, disabled=request("/api/agent/schedules/"+schedule["id"]+"/disable",{},"POST")
    assert code==200 and disabled["status"]=="DISABLED",(code,disabled)
    print("SOURCEA_LIVE_OPT_IN_SCHEDULE_CANCEL_PASS")
    print("SOURCEA_V5_LIVE_E2E_ACCEPTED")
except Exception as exc:
    print("SOURCEA_V5_LIVE_E2E_FAILED",type(exc).__name__,str(exc)[:450],file=sys.stderr)
    sys.exit_code=1
finally:
    if account_created:
        code, deletion=request("/api/account/delete",{"confirm":"DELETE","password":password},"POST")
        if code==200 and deletion.get("deleted") is True:
            print("SOURCEA_TEMPORARY_SMOKE_ACCOUNT_PURGED")
        else:
            print("SOURCEA_TEMPORARY_SMOKE_ACCOUNT_CLEANUP_FAILED",code,str(deletion)[:140],file=sys.stderr)
            sys.exit_code=1
if getattr(sys,"exit_code",0):
    sys.exit(sys.exit_code)
