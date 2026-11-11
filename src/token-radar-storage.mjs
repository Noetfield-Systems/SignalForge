// SignalForge Token Radar R2 — persistent, source-bound observations and opted-in in-app events.
// Uses the existing SignalForge PostgreSQL connection and user identity; no second scheduler.
const LIMIT = 20;
const rounded = n => typeof n === "number" && Number.isFinite(n) ? n : null;
const metricDelta = (oldValue, value, threshold, type) => {
  if (rounded(value) === null || rounded(oldValue) === null || oldValue <= 0) return null;
  const changePct = ((value - oldValue) / oldValue) * 100;
  if (Math.abs(changePct) < threshold) return null;
  return { type, before: oldValue, after: value, deltaPct: Number(changePct.toFixed(2)), evidence: {} };
};
export function snapshotOf(report) {
  return {
    chainId: report.chainId,
    address: report.address,
    source: report.source.name,
    marketStatus: report.status,
    primary: report.primaryPool ? {
      address: report.primaryPool.address,
      priceUsd: rounded(report.primaryPool.priceUsd),
      liquidityUsd: rounded(report.primaryPool.liquidityUsd),
      volume24hUsd: rounded(report.primaryPool.volume24hUsd),
      buys24h: rounded(report.primaryPool.buys24h),
      sells24h: rounded(report.primaryPool.sells24h)
    } : null,
    pools: report.pools.map(p => ({
      address: p.address,
      liquidityUsd: rounded(p.liquidityUsd),
      volume24hUsd: rounded(p.volume24hUsd),
      priceUsd: rounded(p.priceUsd)
    })).sort((a, b) => a.address.localeCompare(b.address))
  };
}
export function detectTokenChanges(before, after) {
  if (!before) return { state: "INITIAL_OBSERVATION", events: [] };
  const events = [];
  const a = before.primary || {};
  const b = after.primary || {};
  for (const change of [
    metricDelta(a.priceUsd, b.priceUsd, 10, "PRICE_CHANGE"),
    metricDelta(a.liquidityUsd, b.liquidityUsd, 25, "LIQUIDITY_CHANGE"),
    metricDelta(a.volume24hUsd, b.volume24hUsd, 100, "VOLUME_CHANGE")
  ]) if (change) events.push(change);
  const prior = new Set((before.pools || []).map(x => x.address));
  const next = new Set((after.pools || []).map(x => x.address));
  const added = [...next].filter(x => !prior.has(x));
  const missing = [...prior].filter(x => !next.has(x));
  if (added.length) events.push({ type: "POOL_NEWLY_REPORTED", before: null, after: null, deltaPct: null, evidence: { poolAddresses: added } });
  if (missing.length) events.push({ type: "POOL_NO_LONGER_REPORTED", before: null, after: null, deltaPct: null, evidence: { poolAddresses: missing, caveat: "Provider omission is not proof of pool removal or rug pull." } });
  return { state: events.length ? "SIGNIFICANT_CHANGE" : "NO_MATERIAL_CHANGE", events };
}
async function hash(payload) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
export async function persistTokenObservation(db, report) {
  if (report.cacheStatus === "CACHED") return { status: "CACHED_OBSERVATION", newEvents: 0 };
  if (report.chainId !== "solana" || report.source.name !== "DEX Screener") throw new Error("SOURCE_NOT_ELIGIBLE");
  const snapshot = snapshotOf(report);
  const fingerprint = await hash(snapshot);
  const existing = await db.unsafe(
    "SELECT id, payload FROM token_observations WHERE chain_id=$1 AND address=$2 ORDER BY id DESC LIMIT 1",
    [snapshot.chainId, snapshot.address]
  );
  const previous = existing[0] || null;
  const inserted = await db.unsafe(
    "INSERT INTO token_observations(chain_id,address,source,observation_hash,payload,observed_at,last_seen_at) VALUES($1,$2,$3,$4,$5::jsonb,$6::timestamptz,$6::timestamptz) ON CONFLICT(chain_id,address,source,observation_hash) DO NOTHING RETURNING id",
    [snapshot.chainId, snapshot.address, snapshot.source, fingerprint, JSON.stringify(snapshot), report.source.observedAt]
  );
  if (!inserted.length) {
    await db.unsafe(
      "UPDATE token_observations SET last_seen_at=GREATEST(last_seen_at,$1::timestamptz) WHERE chain_id=$2 AND address=$3 AND observation_hash=$4",
      [report.source.observedAt, snapshot.chainId, snapshot.address, fingerprint]
    );
    return { status: "NO_MATERIAL_CHANGE", newEvents: 0, sourceSnapshotId: previous?.id || null };
  }
  const id = inserted[0].id;
  const comparison = detectTokenChanges(previous?.payload || null, snapshot);
  let newEvents = 0;
  for (const event of comparison.events) {
    const rows = await db.unsafe(
      "INSERT INTO token_change_events(chain_id,address,previous_observation_id,observation_id,event_type,before_value,after_value,delta_pct,evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT(observation_id,event_type) DO NOTHING RETURNING id",
      [snapshot.chainId,snapshot.address,previous?.id||null,id,event.type,event.before,event.after,event.deltaPct,JSON.stringify(event.evidence)]
    );
    if (!rows.length) continue;
    newEvents++;
    await db.unsafe(
      "INSERT INTO token_alert_events(user_id,change_event_id) SELECT user_id,$1 FROM token_watchlist_items WHERE chain_id=$2 AND address=$3 AND in_app_alerts=TRUE ON CONFLICT(user_id,change_event_id) DO NOTHING",
      [rows[0].id,snapshot.chainId,snapshot.address]
    );
  }
  return { status: comparison.state, newEvents, sourceSnapshotId: id };
}
export async function getTokenHistory(db, mint) {
  const [observations, events] = await Promise.all([
    db.unsafe("SELECT id,observed_at,last_seen_at,payload FROM token_observations WHERE chain_id='solana' AND address=$1 ORDER BY id DESC LIMIT $2", [mint,LIMIT]),
    db.unsafe("SELECT id,event_type,before_value,after_value,delta_pct,evidence,created_at FROM token_change_events WHERE chain_id='solana' AND address=$1 ORDER BY id DESC LIMIT $2", [mint,LIMIT])
  ]);
  return {
    chainId:"solana",address:mint,source:"DEX Screener",
    observations: observations.map(o => ({
      id:String(o.id),observedAt:o.observed_at,lastSeenAt:o.last_seen_at,
      priceUsd:o.payload?.primary?.priceUsd??null,liquidityUsd:o.payload?.primary?.liquidityUsd??null,
      volume24hUsd:o.payload?.primary?.volume24hUsd??null,poolCount:o.payload?.pools?.length??0
    })),
    events:events.map(e=>({
      id:String(e.id),type:e.event_type,before:e.before_value===null?null:Number(e.before_value),
      after:e.after_value===null?null:Number(e.after_value),
      deltaPct:e.delta_pct===null?null:Number(e.delta_pct),
      evidence:e.evidence,observedAt:e.created_at
    })),
    historyStatus: observations.length<2?"INSUFFICIENT_HISTORY":"AVAILABLE",
    caveat:"These are provider-observation comparisons, not verified onchain state transitions."
  };
}
export async function getSavedTokenList(db, userId) {
  return db.unsafe("SELECT chain_id AS \"chainId\",address,in_app_alerts AS \"inAppAlerts\",created_at AS \"createdAt\" FROM token_watchlist_items WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",[userId]);
}
export async function saveToken(db, userId, mint, inAppAlerts) {
  await db.unsafe(
    "INSERT INTO token_watchlist_items(user_id,chain_id,address,in_app_alerts) VALUES($1,'solana',$2,$3) ON CONFLICT(user_id,chain_id,address) DO UPDATE SET in_app_alerts=excluded.in_app_alerts",
    [userId,mint,inAppAlerts===true]
  );
  return { ok:true, address:mint, inAppAlerts:inAppAlerts===true };
}
export async function removeSavedToken(db, userId, mint) {
  await db.unsafe("DELETE FROM token_watchlist_items WHERE user_id=$1 AND chain_id='solana' AND address=$2",[userId,mint]);
  return {ok:true};
}
export async function getTokenNotifications(db, userId) {
  const rows=await db.unsafe(
    "SELECT a.id,a.created_at,a.read_at,c.address,c.event_type,c.delta_pct,c.evidence,c.created_at AS observed_at FROM token_alert_events a JOIN token_change_events c ON a.change_event_id=c.id WHERE a.user_id=$1 ORDER BY a.id DESC LIMIT 75",
    [userId]
  );
  return rows.map(r=>({id:String(r.id),address:r.address,type:r.event_type,deltaPct:r.delta_pct===null?null:Number(r.delta_pct),evidence:r.evidence,createdAt:r.created_at,observedAt:r.observed_at,readAt:r.read_at}));
}
