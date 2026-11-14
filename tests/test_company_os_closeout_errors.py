import importlib.util
import io
import json
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

path=Path(__file__).resolve().parents[1]/"scripts/company-os-closeout.py"
spec=importlib.util.spec_from_file_location("company_os_closeout",path)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

class VerifierFailureReportingTests(unittest.TestCase):
    def make_error(self,body):
        return urllib.error.HTTPError(
           "https://sina-selfbuild-verifier-staging-staging.up.railway.app/company-delivery/verify",
           409,"Conflict",{},io.BytesIO(body.encode()))
    def test_exact_safe_verifier_machine_reason_is_visible(self):
        error=self.make_error(json.dumps({
            "error":"verification_blocked",
            "reason":"candidate_commit_scope_mismatch"}))
        with patch("urllib.request.urlopen",side_effect=error):
            with self.assertRaisesRegex(
                RuntimeError,"VERIFIER_HTTP_409_CANDIDATE_COMMIT_SCOPE_MISMATCH"):
                mod.post("https://example.invalid",{"a":"b"},"TEST_TOKEN_NEVER_PRINT")
    def test_secret_bearing_reason_never_printed_or_repeated(self):
        error=self.make_error(json.dumps({
            "error":"verification_blocked",
            "reason":"url=https://private.invalid/?token=ABC123"}))
        with patch("urllib.request.urlopen",side_effect=error):
            with self.assertRaises(RuntimeError) as result:
                mod.post("https://example.invalid",{}, "MY_PRIVATE_OIDC_BEARER")
        self.assertEqual(str(result.exception),
            "VERIFIER_HTTP_409_SOURCE_ERROR_UNAVAILABLE")
        self.assertNotIn("ABC123",str(result.exception))
        self.assertNotIn("OIDC_BEARER",str(result.exception))
    def test_non_json_http_failure_falls_back_without_body(self):
        error=self.make_error("Internal error <private>")
        self.assertEqual(mod._http_failure_code(error),
            "VERIFIER_HTTP_409_SOURCE_ERROR_UNAVAILABLE")

if __name__=="__main__":unittest.main()
