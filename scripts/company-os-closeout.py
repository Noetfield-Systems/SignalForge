#!/usr/bin/env python3
"""Close a tested candidate through the existing isolated verifier and Fabric queue."""
import json
import os
import re
from pathlib import Path
import urllib.request
import urllib.error
import urllib.error
import re
from importlib.util import spec_from_file_location, module_from_spec
spec=spec_from_file_location('readback',Path(__file__).with_name('company-os-readback.py'))
module=module_from_spec(spec); spec.loader.exec_module(module)
VERIFIER='https://sina-selfbuild-verifier-staging-staging.up.railway.app/company-delivery/verify'
def _http_failure_code(error):
    """Only an allowlisted machine reason: never log response bodies or tokens."""
    reason="SOURCE_ERROR_UNAVAILABLE"
    try:
        raw=json.loads(error.read(1200))
        field=raw.get("reason") if isinstance(raw,dict) and raw.get("error")=="verification_blocked" else None
        if isinstance(field,str) and re.fullmatch(r"[a-z][a-z0-9_]{2,90}",field):
            reason=field.upper()
    except (TypeError,ValueError,UnicodeDecodeError):
        pass
    return "VERIFIER_HTTP_"+str(error.code)+"_"+reason

def post(url,body,token):
    req=urllib.request.Request(url,data=json.dumps(body).encode(),headers={
        'Content-Type':'application/json','Authorization':'Bearer '+token},method='POST')
    try:
        with urllib.request.urlopen(req,timeout=90) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(_http_failure_code(error)) from None
def main():
    token=module.authorize()
    path=Path(os.environ['SINA_EVIDENCE_FILE'])
    if path.exists():
        evidence=json.loads(path.read_text())
    else:
        req=urllib.request.Request(module.API+'/pending-verification',headers={'Authorization':'Bearer '+token})
        with urllib.request.urlopen(req,timeout=30) as response: pending=json.load(response)
        if pending.get('state')=='NO_PENDING_VERIFICATION':
            print(json.dumps(pending)); return
        evidence=pending['evidence']
    try:
        receipt=post(VERIFIER,evidence,token)
    except urllib.error.HTTPError as exc:
        # Real isolated verifier conflicts include bounded machine-readable
        # reasons. Only allow safe enum-like codes; never log raw HTTP bodies,
        # tokens, headers, evidence, or model-authored untrusted strings.
        try:
            details=json.loads(exc.read(512))
            reason=details.get("reason","") if isinstance(details,dict) else ""
        except (ValueError, TypeError, OSError):
            reason=""
        if not isinstance(reason,str) or not re.fullmatch(r"[A-Za-z0-9_]{3,100}",reason):
            reason="UPSTREAM_CONFLICT"
        diagnostic={"stage":"ISOLATED_VERIFIER","http_status":exc.code,
                    "reason_code":reason,
                    "verified":False,"next_workpacket_dispatched":False}
        Path("company-delivery-closeout-diagnostics.json").write_text(
            json.dumps(diagnostic,sort_keys=True))
        raise RuntimeError("ISOLATED_VERIFIER_HTTP_"+str(exc.code)) from None
    try:
        result=post(module.API+'/verify',receipt,token)
    except urllib.error.HTTPError as exc:
        diagnostic={"stage":"FABRIC_VERIFIER_READBACK","http_status":exc.code,
                    "verified":False,"next_workpacket_dispatched":False}
        Path("company-delivery-closeout-diagnostics.json").write_text(
            json.dumps(diagnostic,sort_keys=True))
        raise RuntimeError("FABRIC_VERIFICATION_HTTP_"+str(exc.code)) from None
    if result.get('state')!='TECHNICALLY_VERIFIED': raise RuntimeError('VERIFICATION_NOT_RECORDED')
    # A GitHub/CI signature alone does not close the real Founder WorkPacket.
    # Only the independent verifier's source-bound, signed Founder DONE proof
    # can unlock the next canonical Engineering mission.
    if result.get('founder_workstream_done') is not True:
        raise RuntimeError('CANONICAL_FOUNDER_WORKSTREAM_NOT_DONE')
    Path('company-delivery-verification.json').write_text(json.dumps(receipt,sort_keys=True,indent=2))
    # The sole automatic-continuation permit is a genuine isolated verifier
    # receipt AND the canonical Founder WorkPacket DONE acknowledgment.
    # GitHub Actions cannot read stdout as a step output; explicitly write it.
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"],"a",encoding="utf8") as output:
            output.write("state=TECHNICALLY_VERIFIED\n")
    print(json.dumps(result,sort_keys=True))
if __name__=='__main__': main()
