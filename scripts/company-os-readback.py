#!/usr/bin/env python3
"""Fresh read-only GitHub runner independently fetches a candidate commit.

A passing readback is source-and-test evidence, not business proof or
authorization to merge, deploy, redeem, move funds, or self-verify.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
API = "https://noetfield-agent-fabric-staging-staging.up.railway.app/api/internal/v1/company-delivery"
HEXSHA = re.compile(r"^[a-f0-9]{40}$")

def shell(*args, timeout=200):
    r = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
    if r.returncode:
        # CI's independent runner must expose a bounded failure cause, not a
        # fabricated success or a 90-second opaque READBACK_FAILED:bun.
        # Show only test-status lines, never credentials, DB URLs or raw fixtures.
        combined=(r.stdout + "\\n" + r.stderr).splitlines()
        signals=[line.strip() for line in combined if any(marker in line.lower() for marker in (
            "not ok", "assertionerror", "test failed", "error:", "fail ", "timed out",
            "expect(", "failed to", "sqlstate", "timeout", "connection refused"))]
        details=[line[:230] for line in signals[-14:]]
        if details:
            print("INDEPENDENT_READBACK_TEST_DIAGNOSTICS="+json.dumps({
                "command":args[0], "return_code":r.returncode, "signals":details},sort_keys=True),flush=True)
        else:
            print("INDEPENDENT_READBACK_TEST_DIAGNOSTICS="+json.dumps({
                "command":args[0], "return_code":r.returncode,
                "stdout_line_count":len(r.stdout.splitlines()),
                "stderr_line_count":len(r.stderr.splitlines())},sort_keys=True),flush=True)
        raise RuntimeError("READBACK_FAILED:" + args[0])
    return r.stdout.strip()

def codehash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def authorize():
    url = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
    secret = os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]
    url += ("&" if "?" in url else "?") + "audience=noetfield-company-os-delivery"
    with urllib.request.urlopen(
        urllib.request.Request(url, headers={"Authorization":"Bearer "+secret}),
        timeout=15) as stream:
        token = json.load(stream)["value"]
    if len(token)<200:
        raise RuntimeError("INVALID_GITHUB_IDENTITY")
    return token

def main():
    evidence = json.loads(Path(os.environ["SINA_EVIDENCE_FILE"]).read_text(encoding="utf8"))
    expected = evidence["head_sha"]
    if not HEXSHA.fullmatch(expected) or shell("git","rev-parse","HEAD")!=expected:
        raise RuntimeError("SOURCE_REVISION_NOT_INDEPENDENTLY_FETCHED")
    if evidence["repo"] != "Noetfield-Systems/SignalForge" or evidence["project_id"]!="signalforge-market-intelligence":
        raise RuntimeError("PROJECT_OR_REPO_MISMATCH")
    suffix=evidence["workstream_id"][:12]
    if evidence["module_path"] != f"company-os/generated/feature_{suffix}.mjs" or (
        evidence["test_path"] != f"tests/feature_{suffix}.test.mjs"):
        raise RuntimeError("PATH_MISMATCH")
    for kind in ("module","test"):
        path=ROOT/evidence[kind+"_path"]
        if not path.is_file() or path.is_symlink() or codehash(path)!=evidence[kind+"_sha256"]:
            raise RuntimeError("INDEPENDENT_CONTENT_HASH_MISMATCH")
    # This reviewer must see an actual product-consumed import, not merely
    # an isolated generated test file. The market endpoint imports the
    # registry through src/market-source-integrity.ts.
    registry=ROOT/"company-os/generated/runtime-registry.ts"
    if (evidence.get("runtime_registry_path")!="company-os/generated/runtime-registry.ts"
            or not registry.is_file() or registry.is_symlink()
            or codehash(registry)!=evidence.get("runtime_registry_sha256")
            or evidence.get("real_product_consumer")!="src/market-source-integrity.ts -> /api/market"):
        raise RuntimeError("PRODUCT_INTEGRATION_EVIDENCE_MISSING")
    runtime=registry.read_text(encoding="utf8")
    if (f"./feature_{suffix}.mjs" not in runtime
            or f'workstreamId:"{evidence["workstream_id"]}"' not in runtime):
        raise RuntimeError("FEATURE_NOT_REFERENCED_BY_PRODUCT_RUNTIME")
    market=(ROOT/"src/market-source-integrity.ts").read_text(encoding="utf8")
    server=(ROOT/"src/server.ts").read_text(encoding="utf8")
    if ('GENERATED_MARKET_RULES' not in market
            or 'rule.evaluate(passed)' not in market
            or 'researchIntegrity:assessMarketSourceIntegrity(pack)' not in server):
        raise RuntimeError("GENERATED_FEATURE_NOT_CONSUMED_BY_PRODUCT")
    shell("bun","run","test")
    if shell("git","status","--porcelain"):
        raise RuntimeError("READBACK_DIRTY_CHECKOUT")
    # The SAME versioned Company OS outcome gate is executed by BOTH products.
    # The result is deliberately claim-shape-ready, NOT an independently
    # signed receipt or permission to release or move customer funds.
    gate=subprocess.run(
        ["node","scripts/company-os-receipt-gate.mjs"],
        cwd=ROOT,input=json.dumps(evidence),capture_output=True,
        text=True,timeout=15)
    if gate.returncode:
        raise RuntimeError("PORTABLE_COMPANY_OS_EVIDENCE_GATE_REJECTED")
    assessment=json.loads(gate.stdout)
    if (assessment.get("state")!="RECEIPT_CLAIM_READY_FOR_INDEPENDENT_VERIFIER"
            or assessment.get("independent_completion_verified") is not False
            or assessment.get("commercial_outcome_verified") is not False
            or assessment.get("next_action")!="VERIFY_RECEIPT_SIGNATURE_AND_PROVENANCE"):
        raise RuntimeError("EVIDENCE_GATE_ATTEMPTED_TO_SELF_CERTIFY")
    token=authorize()
    request=urllib.request.Request(API+"/report", method="POST",
       data=json.dumps({
         "workstream_id":evidence["workstream_id"],
         "status":"READBACK_REPORTED",
         "source_sha":evidence["source_sha"],
         "commit_sha":expected,
         "pr_url":evidence.get("pr_url"),
         "branch_ref":evidence["branch_ref"]
       }).encode(),
       headers={"Authorization":"Bearer "+token,"Content-Type":"application/json"})
    with urllib.request.urlopen(request, timeout=15) as stream:
        result=json.load(stream)
    if result.get("state") != "READBACK_REPORTED" and not result.get("idempotent"):
        raise RuntimeError("EVIDENCE_CALLBACK_NOT_ACCEPTED")
    print(json.dumps({
        "state":"READBACK_REPORTED",
        "sha":expected,
        "checks":["fresh_git_checkout","exact_head_sha","artifact_hashes","full_application_tests"],
        "production_deployed":False,
        "business_outcome_independently_verified":False,
        "company_os_outcome_gate":assessment["schema"],
        "company_os_next_action":assessment["next_action"]
    }, sort_keys=True))

if __name__=="__main__":
    main()
