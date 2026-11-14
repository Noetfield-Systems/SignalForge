import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessResearchDataReadiness as assess } from '../company-os/generated/feature_ae64f027c6a3.mjs';
const fresh={ageSeconds:100,providerLicensed:true,sourceTimestampVerified:true,chainId:1};
test('source-backed research is eligible, never a live trade',()=>{assert.deepEqual(assess(fresh),{state:'RESEARCH_REVIEW_ELIGIBLE',researchReady:true,tradingAllowed:false})});
test('stale data cannot be described as fresh',()=>{assert.equal(assess({...fresh,ageSeconds:301}).state,'STALE_RESEARCH_DATA')});
test('licensing and source provenance remain hard gates',()=>{assert.equal(assess({...fresh,providerLicensed:false}).researchReady,false);assert.equal(assess({...fresh,sourceTimestampVerified:false}).state,'SOURCE_UNVERIFIED')});
test('invalid chain, negative and fractional ages fail closed',()=>{assert.equal(assess({...fresh,chainId:0}).researchReady,false);assert.equal(assess({...fresh,ageSeconds:-1}).researchReady,false);assert.equal(assess({...fresh,ageSeconds:1.5}).researchReady,false)});
