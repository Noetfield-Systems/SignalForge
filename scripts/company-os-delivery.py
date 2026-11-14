#!/usr/bin/env python3
"""Execute one scoped Company OS SignalForge WorkPacket on GitHub's own runner.
Source is pushed to a candidate PR only; no merge or deployment authorization.
"""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.parse
import urllib.request
import urllib.error

API = "https://noetfield-agent-fabric-staging-staging.up.railway.app/api/internal/v1/company-delivery"
REPO = "Noetfield-Systems/SignalForge"
HEX = re.compile(r"^[0-9a-f]{32}$")
SHA = re.compile(r"^[a-f0-9]{40}$")
ROOT = Path(__file__).resolve().parents[1]


def shell(*args, timeout=40):
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError("COMMAND_FAILED:" + args[0] + ":" +
                           re.sub(r"[\r\n]+", " ", (result.stderr or result.stdout)[-180:]))
    return result.stdout.strip()


def oidc():
    url = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL", "")
    secret = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "")
    if not url.startswith("https://") or not secret:
        raise RuntimeError("GITHUB_OIDC_UNAVAILABLE")
    url += ("&" if "?" in url else "?") + "audience=noetfield-company-os-delivery"
    request = urllib.request.Request(url, headers={"Authorization": "Bearer " + secret})
    with urllib.request.urlopen(request, timeout=15) as stream:
        result = json.load(stream)
    token = result.get("value", "")
    if not isinstance(token, str) or len(token) < 200:
        raise RuntimeError("GITHUB_OIDC_INVALID")
    return token


def send(path, data, token):
    request = urllib.request.Request(API + path, method="POST",
        data=json.dumps(data, separators=(",", ":")).encode(),
        headers={"Authorization": "Bearer " + token,
                 "Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=80) as stream:
        return json.load(stream)


def step_output(**values):
    if not os.environ.get("GITHUB_OUTPUT"):
        return
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf8") as out:
        for key, value in values.items():
            if not re.fullmatch(r"[a-z_]+", key) or "\n" in str(value):
                raise ValueError("INVALID_GITHUB_OUTPUT")
            out.write(f"{key}={value}\n")


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


def write_candidate(plan, workstream, base_sha):
    suffix=workstream[:12]
    module=f"company-os/generated/feature_{suffix}.mjs"
    tests=f"tests/feature_{suffix}.test.mjs"
    if (plan.get("module_path")!=module or plan.get("test_path")!=tests or
        plan.get("source_sha")!=base_sha or plan.get("workstream_id")!=workstream or
        plan.get("repo")!=REPO):
        raise RuntimeError("MODEL_TARGET_OR_SOURCE_REFUSED")
    source, test = plan.get("module_code"), plan.get("test_code")
    if not isinstance(source,str) or not isinstance(test,str):
        raise RuntimeError("CODE_MISSING")
    if digest(source+"\n"+test)!=plan.get("combined_sha256"):
        raise RuntimeError("CODE_HASH_MISMATCH")
    for path, contents in ((module,source),(tests,test)):
        dest=ROOT/path
        if dest.exists() or dest.is_symlink():
            raise RuntimeError("NO_OVERWRITING_EXISTING_CODE")
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_text(contents,encoding="utf8")
    # A stand-alone generated ESM file is NOT a shipped customer feature.
    # Register a statically imported, bounded market-quality rule in the
    # actual production /api/market source-evaluation chain.
    registry=ROOT/"company-os/generated/runtime-registry.ts"
    current=registry.read_text(encoding="utf8")
    if ("// SINA_GENERATED_IMPORTS" not in current or
            "// SINA_GENERATED_RULES" not in current):
        raise RuntimeError("PRODUCT_RUNTIME_REGISTRY_NOT_AVAILABLE")
    if not re.search(r"\\bexport\\s+function\\s+assessMarketSourceQuality\\s*\\(", source):
        raise RuntimeError("MODEL_FEATURE_NOT_A_PRODUCT_MARKET_RULE")
    source_alias="sf_market_rule_"+suffix
    import_line=f'import {{ assessMarketSourceQuality as {source_alias} }} from "./feature_{suffix}.mjs";'
    entry=f'{{workstreamId:"{workstream}",evaluate:{source_alias}}},'
    if import_line in current or entry in current:
        raise RuntimeError("DUPLICATE_RUNTIME_FEATURE")
    updated=current.replace("// SINA_GENERATED_IMPORTS",
        import_line+"\\n// SINA_GENERATED_IMPORTS")
    updated=updated.replace("// SINA_GENERATED_RULES",
        "  "+entry+"\\n  // SINA_GENERATED_RULES")
    registry.write_text(updated,encoding="utf8")
    return module,tests


def main():
    token=oidc()
    if os.environ.get("GITHUB_EVENT_NAME")=="issues":
        event=json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
        issue=event.get("issue",{})
        if issue.get("title")!="SINA: Run Company OS Delivery" or (
            issue.get("user") or {}).get("login")!="kazemnezhadsina144-dot":
            step_output(state="IGNORED")
            print("IGNORED_UNTRUSTED_ISSUE")
            return
    claim=send("/claim",{},token)
    if claim.get("state")!="LEASED":
        step_output(state="IDLE")
        # A verified, authenticated Company OS claim may include aggregate
        # eligibility diagnostics. No task text, identity, tokens or content.
        readiness=claim.get("readiness")
        safe={}
        if isinstance(readiness,dict) and readiness.get("schema")=="sina.company-delivery.readiness.v1":
            for key in ("eligible","bound_tasks","ack_quarantined",
                        "awaiting_ack","missing_decision"):
                value=readiness.get(key)
                if type(value) is int and 0<=value<=100000:
                    safe[key]=value
            for field in ("task_states","engineer_task_states"):
                states=readiness.get(field)
                if isinstance(states,dict):
                    safe[field]={k:v for k,v in states.items()
                        if k in ("DRAFT","QUEUED","RUNNING","NEEDS_REVIEW",
                                 "FAILED","RECOVERY_NEEDED")
                        and type(v) is int and 0<=v<=100000}
        print(json.dumps({"state":claim.get("state"),"readiness":safe,
                          "mutations":0,"independently_verified":False},
                         sort_keys=True))
        return
    workstream=claim["workstream_id"]
    if not HEX.fullmatch(workstream) or claim.get("project_id")!="signalforge-market-intelligence":
        raise RuntimeError("INVALID_WORKPACKET_SCOPE")
    source_sha=shell("git","rev-parse","HEAD")
    if not SHA.fullmatch(source_sha):
        raise RuntimeError("INVALID_BASE_COMMIT")
    stage="CLAIMED"
    try:
        # Market-first Founder product identity is mandatory for EVERY M20 agent plan.
        identity_path = ROOT / "strategy/PRODUCT-IDENTITY-SSOT-v3.json"
        identity = json.loads(identity_path.read_text(encoding="utf8"))
        if (identity.get("schema") != "signalforge.product-identity.v3" or
                identity.get("project_id") != "signalforge-market-intelligence" or
                identity.get("company_os", {}).get("non_customer_facing_by_default") is not True):
            raise RuntimeError("FOUNDER_PRODUCT_IDENTITY_LOCK_INVALID")
        contract = {
            "business": identity["primary_business"],
            "customer_segments": identity["target_segments"],
            "company_os": identity["company_os"]["role"],
            "public_marketing": identity["market_ui_rules"][:5],
            "release_evidence": identity["proof_definition"],
            "benchmarks": [b["name"] + ": " + b["adapt"] for b in identity["reference_benchmarks"][:3]],
            "drift_rule": "Do not promote 100 AI agent organization as primary public SignalForge product."
        }
        context = "\nFOUNDER PRODUCT CONTRACT (CANONICAL; DO NOT OVERRIDE)\n" + json.dumps(contract, sort_keys=True)[:3300]
        context += "".join(
            f"\nFILE {path}\n"+(ROOT/path).read_text(encoding="utf8")[:2000]
            for path in ("src/server.ts", "company-os/operating-engine.ts"))
        plan=send("/plan",{"workstream_id":workstream,
                "source_sha":source_sha,"context":context[:7800]},token)
        module,test=write_candidate(plan,workstream,source_sha)
        stage="WRITTEN"
        shell("node","--check",module,timeout=15)
        shell("node","--check",test,timeout=15)
        shell("bun","run","test",timeout=200)
        stage="TESTED"
        branch="sina/company-delivery-"+workstream[:12]+"-"+os.environ["GITHUB_RUN_ID"]
        shell("git","config","user.name","noetfield-company-os[bot]")
        shell("git","config","user.email","41898282+github-actions[bot]@users.noreply.github.com")
        shell("git","switch","-c",branch)
        shell("git","add","--",module,test,"company-os/generated/runtime-registry.ts")
        shell("git","commit","-m","feat(signalforge): governed company-os workstream "+workstream[:12])
        head_sha=shell("git","rev-parse","HEAD")
        if not SHA.fullmatch(head_sha):
            raise RuntimeError("INVALID_COMMIT_SHA")
        shell("git","push","-u","origin",branch,timeout=90)
        stage="BRANCH_PUSHED"
        body=("Founder OS Workstream: "+workstream+"\n"+
              "Agent Fabric Task: "+claim["task_id"]+"\n"+
              "Project: signalforge-market-intelligence\n"+
              "Base SHA: "+source_sha+"\n"+
              "Candidate SHA: "+head_sha+"\n\n"+
              "Internal code candidate with bun run test PASS. "+
              "No independent production result, payout, live users, "+
              "external action, automatic merge or deploy is claimed.")
        # GitHub Actions may have Contents:write but be barred by repo settings
        # from creating pull requests. Preserve the real source artifact and
        # independently test it instead of failing/dropping the entire mission.
        pr=None
        try:
            pr=shell("gh","pr","create","--base","main","--head",branch,
                     "--title","Company OS: SignalForge capability "+workstream[:12],
                     "--body",body,timeout=90)
        except RuntimeError as exc:
            if not any(k in str(exc) for k in (
                "GitHub Actions is not permitted to create or approve pull requests",
                "Resource not accessible by integration")):
                raise
            print("GITHUB_PR_POLICY_DENIED_BRANCH_AND_TESTS_RETAINED")
        if pr is not None and not re.fullmatch(r"https://github\.com/Noetfield-Systems/SignalForge/pull/[1-9][0-9]{0,8}",pr):
            raise RuntimeError("GITHUB_PR_NOT_CONFIRMED")
        delivery_state="PR_OPENED" if pr else "BRANCH_READY"
        send("/report",{"workstream_id":workstream,"status":delivery_state,
              "source_sha":source_sha,"commit_sha":head_sha,"pr_url":pr,
              "branch_ref":branch},token)
        evidence={"schema":"sina.company-delivery.builder-evidence.v1",
                  "workstream_id":workstream,"task_id":claim["task_id"],
                  "project_id":"signalforge-market-intelligence","repo":REPO,
                  "source_sha":source_sha,"head_sha":head_sha,"pr_url":pr,
                  "branch_ref":branch,
                  "module_path":module,"test_path":test,
                  "module_sha256":digest((ROOT/module).read_text()),
                  "test_sha256":digest((ROOT/test).read_text()),
                  "runtime_registry_path":"company-os/generated/runtime-registry.ts",
                  "runtime_registry_sha256":digest((ROOT/"company-os/generated/runtime-registry.ts").read_text()),
                  "real_product_consumer":"src/market-source-integrity.ts -> /api/market",
                  "test_command":"bun run test","test_result":"PASS",
                  "independently_verified":False,"deployed":False}
        (ROOT/"company-delivery-evidence.json").write_text(json.dumps(evidence,indent=2)+"\n")
        step_output(state="OPENED" if pr else "BRANCH_READY",head_sha=head_sha,workstream=workstream)
        print(json.dumps({"state":delivery_state,"pr_url":pr,"branch_ref":branch,"workstream_id":workstream,
                          "head_sha":head_sha,"independently_verified":False}))
    except Exception as exc:
        print(json.dumps({"state":"FAILED","stage":stage,"error_type":type(exc).__name__,
                          "workstream_id":workstream}))
        try:
            send("/report",{"workstream_id":workstream,"status":"FAILED",
                  "source_sha":source_sha},token)
        except Exception:
            print("REPORT_DEGRADED")
        raise


if __name__=="__main__":
    main()
