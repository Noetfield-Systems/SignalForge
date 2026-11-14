"""Real runner closeout: isolated verifier controls continuation, never self-approval."""
import importlib.util
import io
import json
import os
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("real_company_closeout",
                                           ROOT/"scripts/company-os-closeout.py")
closeout=importlib.util.module_from_spec(spec)
spec.loader.exec_module(closeout)


class CloseoutTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.old=os.getcwd()
        os.chdir(self.tmp.name)
        self.evidence_file=Path(self.tmp.name)/"evidence.json"
        self.evidence_file.write_text(json.dumps({"real_source_sha":"a"*40}))
        self.output_file=Path(self.tmp.name)/"github-output"
        self.env=patch.dict(os.environ,{
            "SINA_EVIDENCE_FILE":str(self.evidence_file),
            "GITHUB_OUTPUT":str(self.output_file)},clear=False)
        self.env.start()

    def tearDown(self):
        self.env.stop()
        os.chdir(self.old)
        self.tmp.cleanup()

    def test_full_real_verifier_and_founder_done_only_success_writes_next_state(self):
        def post(url,body,token):
            if url==closeout.VERIFIER:
                return {"payload":{"outcome":"TECHNICALLY_VERIFIED"},"signature":"source"}
            assert url==closeout.module.API+"/verify"
            return {"state":"TECHNICALLY_VERIFIED","founder_workstream_done":True}
        with patch.object(closeout.module,"authorize",return_value="valid-native-scope"),patch.object(closeout,"post",side_effect=post):
            closeout.main()
        self.assertEqual(self.output_file.read_text(),"state=TECHNICALLY_VERIFIED\n")
        self.assertTrue(Path("company-delivery-verification.json").is_file())

    def test_no_founder_done_never_continues(self):
        with patch.object(closeout.module,"authorize",return_value="scope"),patch.object(closeout,"post",side_effect=[
            {"payload":{},"signature":"source"},
            {"state":"TECHNICALLY_VERIFIED","founder_workstream_done":False}
        ]):
            with self.assertRaisesRegex(RuntimeError,"CANONICAL_FOUNDER_WORKSTREAM_NOT_DONE"):
                closeout.main()
        self.assertFalse(self.output_file.exists())
        self.assertFalse(Path("company-delivery-verification.json").exists())

    def test_idle_tick_with_no_pending_receipt_does_not_forge_done_or_dispatch(self):
        self.evidence_file.unlink()
        network=io.BytesIO(b'{"state":"NO_PENDING_VERIFICATION"}')
        with patch.object(closeout.module,"authorize",return_value="source-scoped-OIDC"),patch(
            "urllib.request.urlopen",return_value=network),patch.object(
            closeout,"post",side_effect=AssertionError("verifier must not run without work")):
            closeout.main()
        self.assertFalse(self.output_file.exists())
        self.assertFalse(Path("company-delivery-verification.json").exists())

    def test_existing_scheduled_workflow_routes_idle_to_original_pending_verifier(self):
        flow=(ROOT/".github/workflows/company-os-delivery.yml").read_text()
        self.assertIn("needs.candidate.outputs.state == 'IDLE'",flow)
        self.assertIn("needs.independent-readback.result == 'success'",flow)
        self.assertIn("if: ${{ needs.candidate.outputs.head_sha != '' }}",flow)
        self.assertIn("run: python3 scripts/company-os-closeout.py",flow)
        self.assertIn("if: ${{ steps.verified.outputs.state == 'TECHNICALLY_VERIFIED' }}",flow)
        # This is still the same GitHub Actions pipeline + Fabric queue.
        self.assertIn('schedule:',flow)
        self.assertIn('cron: "*/30 * * * *"',flow)

    def test_verifier_409_is_not_a_receipt_or_next_job(self):
        conflict=urllib.error.HTTPError(closeout.VERIFIER,409,"Conflict",None,
            io.BytesIO(b'{"error":"verification_blocked","reason":"candidate_commit_scope_mismatch"}'))
        with patch.object(closeout.module,"authorize",return_value="scope"),patch.object(closeout,"post",side_effect=conflict):
            with self.assertRaisesRegex(RuntimeError,"ISOLATED_VERIFIER_HTTP_409"):
                closeout.main()
        evidence=json.loads(Path("company-delivery-closeout-diagnostics.json").read_text())
        self.assertEqual(evidence["http_status"],409)
        self.assertEqual(evidence["stage"],"ISOLATED_VERIFIER")
        self.assertEqual(evidence["reason_code"],"candidate_commit_scope_mismatch")
        self.assertFalse(evidence["next_workpacket_dispatched"])
        self.assertFalse(self.output_file.exists())

if __name__=="__main__":
    unittest.main()
