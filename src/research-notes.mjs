// SignalForge private research journal input policy.
// This validates user-authored hypotheses; it does not verify their market claims.
export function validateResearchNote(input, validMint) {
 if (!input || typeof input!=="object" || Array.isArray(input)) return {error:"INVALID_NOTE"};
 const address=typeof input.address==="string"?input.address:"";
 if(!validMint(address))return {error:"INVALID_SOLANA_ADDRESS"};
 const kind=input.kind==="thesis"?"thesis":input.kind==="note"?"note":null;
 if(!kind)return {error:"INVALID_NOTE_TYPE"};
 if(typeof input.body!=="string")return {error:"INVALID_NOTE_BODY"};
 const body=input.body.trim();
 if(body.length<5||body.length>1600)return {error:"INVALID_NOTE_LENGTH"};
 const invalidation=typeof input.invalidation==="string"?input.invalidation.trim():"";
 if(invalidation.length>800)return {error:"INVALID_INVALIDATION_LENGTH"};
 if(kind==="thesis"&&invalidation.length<5)return {error:"THESIS_INVALIDATION_REQUIRED"};
 return {value:{address,kind,body,invalidation:kind==="thesis"?invalidation:null}};
}
export function validResearchNoteId(value){
 return typeof value==="string" && /^[1-9][0-9]{0,15}$/.test(value);
}
