import {test} from "node:test";
import assert from "node:assert/strict";
import {compareThesisEvidence} from "../src/research-evidence.mjs";
const note={createdAt:"2026-11-11T08:00:00.000Z"};
const point=(id,observedAt,address="poolA",price=1,liq=10000,vol=2000)=>({
 id,observedAt,payload:{primary:{address,priceUsd:price,liquidityUsd:liq,volume24hUsd:vol}}
});
const t=new Date("2026-11-11T10:00:00.000Z");
test("no baseline at thesis creation never retroactively assumes a baseline",()=>{
 const e=compareThesisEvidence(note,null,point("new","2026-11-11T09:00:00.000Z"),t);
 assert.equal(e.status,"NO_BASELINE_AT_THESIS_CREATION");
 assert.equal(e.thesisVerdict,null);assert.deepEqual(e.metrics,[]);
});
test("one immutable baseline cannot masquerade as a post-note market event",()=>{
 const p=point("1","2026-11-11T07:00:00.000Z");
 const e=compareThesisEvidence(note,p,p,t);
 assert.equal(e.status,"NO_SUBSEQUENT_OBSERVATION");
});
test("new observations expose percentage deltas without judging thesis validity",()=>{
 const e=compareThesisEvidence(note,point("1","2026-11-11T07:00:00.000Z","poolA",2,5000,1000),
  point("2","2026-11-11T08:50:00.000Z","poolA",3,7500,2000),t);
 assert.equal(e.status,"NEW_SOURCE_OBSERVATION");
 assert.equal(e.metrics[0].deltaPct,50);
 assert.equal(e.metrics[1].deltaPct,50);
 assert.equal(e.metrics[2].deltaPct,100);
 assert.equal(e.marketFactsVerifiedIndependently,false);
 assert.equal(e.thesisVerdict,null);
 assert.equal(e.staleLatest,true);
});
test("changed primary pools cannot yield misleading cross-pool liquidity comparisons",()=>{
 const e=compareThesisEvidence(note,point("1","2026-11-11T07:00:00.000Z","poolA"),
  point("2","2026-11-11T09:30:00.000Z","poolB"),t);
 assert.equal(e.status,"PRIMARY_POOL_CHANGED");
 assert.deepEqual(e.metrics,[]);
});
test("zero baseline and missing provider values never invent percentage changes",()=>{
 const e=compareThesisEvidence(note,point("1","2026-11-11T07:00:00.000Z","poolA",0),
  point("2","2026-11-11T09:31:00.000Z","poolA",1),t);
 assert.equal(e.metrics[0].deltaPct,null);
 assert.equal(e.metrics[1].deltaPct,0);
});
