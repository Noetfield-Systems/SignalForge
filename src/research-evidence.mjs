// Read-only, source-anchored research evidence. Never judge a user thesis
// against a snapshot observed *after* that thesis was originally written.
const METRICS = Object.freeze([
  ["priceUsd", "Reported pool price", "USD"],
  ["liquidityUsd", "Reported pool liquidity", "USD"],
  ["volume24hUsd", "Reported 24h volume", "USD"]
]);
const numberOrNull = value =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const valueOf = payload => typeof payload === "string" ? JSON.parse(payload) : payload;

export function compareThesisEvidence(note, baseline, latest, now = new Date()) {
 const meta = {
  source: "DEX Screener",
  kind: "SOURCE_OBSERVATION_COMPARISON",
  marketFactsVerifiedIndependently: false,
  thesisVerdict: null,
  baseline: baseline ? {id:String(baseline.id), observedAt:baseline.observedAt} : null,
  latest: latest ? {id:String(latest.id), observedAt:latest.observedAt} : null,
  staleLatest: latest ? (new Date(now).getTime()-new Date(latest.observedAt).getTime()) > 60*60*1000 : null,
  metrics: [],
  caveat: "Observed third-party DEX data is not verified onchain state, proof of safety, or a judgment about this thesis."
 };
 if (!latest) return {...meta,status:"NO_SOURCE_OBSERVATIONS"};
 if (!baseline) return {...meta,status:"NO_BASELINE_AT_THESIS_CREATION"};
 if (String(latest.id) === String(baseline.id) || new Date(latest.observedAt).getTime() <= new Date(note.createdAt).getTime())
   return {...meta,status:"NO_SUBSEQUENT_OBSERVATION"};
 const earlier = valueOf(baseline.payload)?.primary;
 const later = valueOf(latest.payload)?.primary;
 if (!earlier || !later) return {...meta,status:"PRIMARY_POOL_UNAVAILABLE"};
 if (!earlier.address || earlier.address !== later.address) return {...meta,status:"PRIMARY_POOL_CHANGED"};
 const metrics = METRICS.map(([key,label,unit])=>{
   const before = numberOrNull(earlier[key]), after = numberOrNull(later[key]);
   const deltaPct = before !== null && before > 0 && after !== null
    ? Number((((after-before)/before)*100).toFixed(2)) : null;
   return {key,label,unit,before,after,deltaPct};
 });
 return {...meta,status:metrics.some(x=>x.deltaPct!==null)?"NEW_SOURCE_OBSERVATION":"NO_COMPARABLE_METRICS",metrics};
}

export async function loadResearchJournalWithEvidence(db, ownerId, mint, now = new Date()) {
 // Every row is owner-scoped, and the baseline is selected at or before that
 // row's creation time; a subsequent snapshot is never used retroactively.
 const [notes,latest] = await Promise.all([
  db.unsafe(`SELECT n.id::text AS id,n.kind,n.body,n.invalidation,n.created_at AS "createdAt",n.updated_at AS "updatedAt",
     b.id::text AS "baselineId",b.observed_at AS "baselineObservedAt",b.payload AS "baselinePayload"
    FROM (
      SELECT id,user_id,chain_id,address,kind,body,invalidation,created_at,updated_at
      FROM token_research_notes
      WHERE user_id=$1 AND chain_id='solana' AND address=$2
      ORDER BY id DESC LIMIT 100
    ) n
    LEFT JOIN LATERAL (
      SELECT id,observed_at,payload FROM token_observations
      WHERE chain_id='solana' AND address=n.address AND observed_at<=n.created_at
      ORDER BY observed_at DESC,id DESC LIMIT 1
    ) b ON TRUE
    ORDER BY n.id DESC`, [ownerId,mint]),
  db.unsafe("SELECT id::text AS id,observed_at AS \"observedAt\",payload FROM token_observations WHERE chain_id='solana' AND address=$1 ORDER BY observed_at DESC,id DESC LIMIT 1",[mint])
 ]);
 const current = latest[0] || null;
 return notes.map(note=>{
  const baseline = note.baselineId ? {id:note.baselineId,observedAt:note.baselineObservedAt,payload:note.baselinePayload} : null;
  const {baselineId,baselineObservedAt,baselinePayload,...safeNote}=note;
  return {...safeNote,evidence:compareThesisEvidence(safeNote,baseline,current,now)};
 });
}
