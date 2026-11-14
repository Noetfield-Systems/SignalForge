"""Agent-built market source rules must become code consumed by the REAL product."""
import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT=Path(__file__).resolve().parents[1]/"scripts/company-os-delivery.py"
spec=importlib.util.spec_from_file_location("signalforge_delivery",SCRIPT)
delivery=importlib.util.module_from_spec(spec)
spec.loader.exec_module(delivery)

class MarketRuleIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        (self.root/"company-os/generated").mkdir(parents=True)
        self.registry=self.root/"company-os/generated/runtime-registry.ts"
        self.registry.write_text(
            "export const GENERATED_MARKET_RULES=[\n"
            "  // SINA_GENERATED_RULES\n"
            "];\n// SINA_GENERATED_IMPORTS\n",encoding="utf8")
        self.root_patch=patch.object(delivery,"ROOT",self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.wid="a"*32
        self.sha="b"*40
        self.suffix=self.wid[:12]
        self.module=f"company-os/generated/feature_{self.suffix}.mjs"
        self.test_path=f"tests/feature_{self.suffix}.test.mjs"

    def plan(self,code=None):
        code=code or (
          "export function assessMarketSourceQuality(input) {\n"
          "  return {state:'SOURCE_REVIEWED',researchReady:input.sourceReportedLive===true,"
          "tradingAuthorized:false};\n}\n")
        tests="import {test} from 'node:test';\n"+(
          "import {strict as assert} from 'node:assert';\n"
          "import {assessMarketSourceQuality} from '../company-os/generated/"
          f"feature_{self.suffix}.mjs';\n"
          "test('rule is pure',()=>assert.equal(assessMarketSourceQuality("
          "{sourceReportedLive:true}).tradingAuthorized,false));\n")
        return dict(workstream_id=self.wid,repo=delivery.REPO,source_sha=self.sha,
            module_path=self.module,test_path=self.test_path,module_code=code,
            test_code=tests,combined_sha256=delivery.digest(code+"\n"+tests))

    def test_source_code_is_statically_imported_and_used_in_active_registry(self):
        module,test=delivery.write_candidate(self.plan(),self.wid,self.sha)
        self.assertTrue((self.root/module).exists())
        self.assertTrue((self.root/test).exists())
        text=self.registry.read_text()
        self.assertIn(f'import {{ assessMarketSourceQuality as sf_market_rule_{self.suffix} }}',text)
        self.assertIn(f'workstreamId:"{self.wid}",evaluate:sf_market_rule_{self.suffix}',text)
        self.assertIn("\n  // SINA_GENERATED_RULES",text)
        self.assertNotIn("\\n",text)

    def test_unintegrable_module_is_rejected_without_false_success(self):
        with self.assertRaisesRegex(RuntimeError,"MODEL_FEATURE_NOT_A_PRODUCT_MARKET_RULE"):
            delivery.write_candidate(self.plan(code=
                "export function standaloneIdea(input){return {some: 'text'}}"),
                self.wid,self.sha)

    def test_registry_deduplicates_same_workstream(self):
        delivery.write_candidate(self.plan(),self.wid,self.sha)
        with self.assertRaises(RuntimeError):
            delivery.write_candidate(self.plan(),self.wid,self.sha)

if __name__=="__main__":
    unittest.main()
