import {test,expect} from 'bun:test';
import {assessCompanyOutcome, COMPANY_OS_EVIDENCE_GATE_VERSION as VERSION} from '../company-os/shared-evidence-gate.mjs';
const record={
 project_id:'noetfield-earnloop', workstream_id:'a'.repeat(32),
 source:{artifact_sha:'b'.repeat(40),ref:'receipt:origin/revision'},
 verification:{project_id:'noetfield-earnloop',workstream_id:'a'.repeat(32),
   artifact_sha:'b'.repeat(40),result:'PASS',receipt_ref:'receipt:untrusted-claim'}
};

test('reusable OS gate rejects missing scope, source and wrong verifier SHA',()=>{
 expect(assessCompanyOutcome(null).state).toBe('INVALID_INPUT');
 expect(assessCompanyOutcome({...record,workstream_id:'wrong'}).state).toBe('INVALID_SCOPE');
 expect(assessCompanyOutcome({...record,source:null}).state).toBe('SOURCE_EVIDENCE_MISSING');
 expect(assessCompanyOutcome({...record,verification:{...record.verification,artifact_sha:'c'.repeat(40)}}).state).toBe('AWAITING_VERIFIER_RECEIPT');
});
test('correct source metadata NEVER self-certifies third party verification',()=>{
 const result=assessCompanyOutcome(record);
 expect(result.schema).toBe(VERSION);
 expect(result.receipt_shape_consistent).toBe(true);
 expect(result.independent_completion_verified).toBe(false);
 expect(result.commercial_outcome_verified).toBe(false);
 expect(result.governor_permits_issued).toBe(0);
 expect(result.next_action).toBe('VERIFY_RECEIPT_SIGNATURE_AND_PROVENANCE');
});
test('cash is not called collected without valid settlement shape or a verifier',()=>{
 const missing=assessCompanyOutcome({...record,commercial:{currency:'CAD',collected_cash_cents:0}});
 expect(missing.state).toBe('CASH_EVIDENCE_INCOMPLETE');
 const reported=assessCompanyOutcome({...record,commercial:{currency:'CAD',
   collected_cash_cents:1000,settlement_verified:true,provider_receipt_ref:'receipt:provider/paid'}});
 expect(reported.commercial_claim_shape_consistent).toBe(true);
 expect(reported.commercial_outcome_verified).toBe(false);
 expect(reported.independent_completion_verified).toBe(false);
});