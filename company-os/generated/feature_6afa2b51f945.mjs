const MAX_TEXT = 500;
const MAX_ITEMS = 50;

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function clampText(v) {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  return t.length > MAX_TEXT ? t.slice(0, MAX_TEXT) : t;
}

function normalizeList(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  const seen = new Set();
  for (const item of v) {
    if (!isNonEmptyString(item)) continue;
    const t = clampText(item);
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

/**
 * Normalize a source-reported failed Company OS agent task record into a
 * bounded, deterministic triage object. Pure: no I/O, no side effects.
 * Returns { ok:false, reason } for invalid input, otherwise a normalized
 * record with derived blocker/evidence fields.
 */
export function normalizeFailedTask(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, reason: 'INVALID_RECORD' };
  }
  const taskId = isNonEmptyString(input.taskId) ? clampText(input.taskId) : '';
  if (!taskId) return { ok: false, reason: 'MISSING_TASK_ID' };

  const status = isNonEmptyString(input.status) ? clampText(input.status).toUpperCase() : 'UNKNOWN';
  const isFailure = status === 'FAILED' || status === 'BLOCKED' || status === 'ERROR';
  if (!isFailure) return { ok: false, reason: 'NOT_A_FAILURE' };

  const blockers = normalizeList(input.blockers);
  const evidence = normalizeList(input.evidence);
  const summary = clampText(input.summary);

  const evidenceComplete = evidence.length > 0;
  const actionable = blockers.length > 0 && evidenceComplete;

  return {
    ok: true,
    taskId,
    status,
    summary,
    blockers,
    evidence,
    evidenceComplete,
    actionable,
    nextStep: actionable
      ? 'REPRODUCE_OLDEST_BLOCKER'
      : evidenceComplete
        ? 'RECORD_BLOCKER'
        : 'COLLECT_SOURCE_EVIDENCE',
  };
}

/**
 * Select the oldest unresolved failure from a list of records by ascending
 * numeric age (ageDays). Records without a finite non-negative ageDays are
 * skipped. Returns null when nothing qualifies.
 */
export function selectOldestUnresolved(records) {
  if (!Array.isArray(records)) return null;
  let best = null;
  for (const r of records) {
    const norm = normalizeFailedTask(r);
    if (!norm.ok) continue;
    if (r.resolved === true) continue;
    const age = r.ageDays;
    if (typeof age !== 'number' || !Number.isFinite(age) || age < 0) continue;
    if (best === null || age < best.ageDays) {
      best = { ...norm, ageDays: age };
    }
  }
  return best;
}
