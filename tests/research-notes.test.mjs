import {test} from "node:test";
import assert from "node:assert/strict";
import {validateResearchNote,validResearchNoteId} from "../src/research-notes.mjs";
const mint="So11111111111111111111111111111111111111112";
const valid=m=>m===mint;
test("only valid, bounded, private user-authored notes are accepted",()=>{
 const x=validateResearchNote({address:mint,kind:"note",body:"  Research observation to revisit  "},valid);
 assert.deepEqual(x.value,{address:mint,kind:"note",body:"Research observation to revisit",invalidation:null});
 assert.equal(validateResearchNote({address:"bad",kind:"note",body:"My note"},valid).error,"INVALID_SOLANA_ADDRESS");
 assert.equal(validateResearchNote({address:mint,kind:"unknown",body:"My note"},valid).error,"INVALID_NOTE_TYPE");
 assert.equal(validateResearchNote({address:mint,kind:"note",body:"abc"},valid).error,"INVALID_NOTE_LENGTH");
 assert.equal(validateResearchNote({address:mint,kind:"note",body:"x".repeat(1601)},valid).error,"INVALID_NOTE_LENGTH");
 assert.equal(validateResearchNote({address:mint,kind:"thesis",body:"Hypothesis about a token"},valid).error,"THESIS_INVALIDATION_REQUIRED");
 const thesis=validateResearchNote({address:mint,kind:"thesis",body:"Liquidity is persistent",invalidation:"  Provider reports falling liquidity  "},valid);
 assert.equal(thesis.value.kind,"thesis");
 assert.equal(thesis.value.invalidation,"Provider reports falling liquidity");
 assert.equal(validateResearchNote({address:mint,kind:"thesis",body:"Reasonable thesis",invalidation:"x".repeat(801)},valid).error,"INVALID_INVALIDATION_LENGTH");
});
test("note ids cannot be SQL fragments or malformed cursor values",()=>{
 for(const value of ["1","1234567890","9999999999999999"])assert.equal(validResearchNoteId(value),true);
 for(const value of ["0","-1","1 OR TRUE","1;DROP TABLE x","1.1","",null,"999999999999999999999"])assert.equal(validResearchNoteId(value),false);
});
