const MAX_TASKS = 500;
const FAILURE_KINDS = new Set(["agent_task_failed","timeout","tool_error","validation_error","unknown"]);

function isNonEmptyString(v){ return typeof v === "string" && v.trim().length > 0; }

function normalizeKind(raw){
  if(!isNonEmptyString(raw)) return "unknown";
  const k = raw.trim().toLowerCase();
  return FAILURE_KINDS.has(k) ? k : "unknown";
}

/**
 * Classify a batch of agent task records into failure signals and completed
 * work that is eligible for the verification receipt path.
 * Pure: no I/O, no mutation of inputs.
 */
export function classifyTaskSignals(tasks){
  if(!Array.isArray(tasks)) throw new TypeError("tasks must be an array");
  if(tasks.length > MAX_TASKS) throw new RangeError("too many tasks");
  const failures = [];
  const completed = [];
  const skipped = [];
  for(const t of tasks){
    if(!t || typeof t !== "object" || !isNonEmptyString(t.id)){
      skipped.push({ reason: "missing_id" });
      continue;
    }
    const status = isNonEmptyString(t.status) ? t.status.trim().toLowerCase() : "";
    if(status === "failed"){
      failures.push({
        id: t.id,
        kind: normalizeKind(t.failureKind),
        retryable: t.retryable === true,
      });
    } else if(status === "completed"){
      const hasEvidence = isNonEmptyString(t.evidenceRef);
      completed.push({
        id: t.id,
        eligibleForReceipt: hasEvidence,
        evidenceRef: hasEvidence ? t.evidenceRef.trim() : null,
      });
    } else {
      skipped.push({ id: t.id, reason: "non_terminal_status" });
    }
  }
  return { failures, completed, skipped };
}

/**
 * Build a deterministic verification receipt plan from classified signals.
 * Receipts are proposals only; nothing is dispatched or persisted here.
 */
export function buildReceiptPlan(classified){
  if(!classified || typeof classified !== "object") throw new TypeError("classified required");
  const failures = Array.isArray(classified.failures) ? classified.failures : [];
  const completed = Array.isArray(classified.completed) ? classified.completed : [];
  const receipts = completed
    .filter(c => c && c.eligibleForReceipt === true && isNonEmptyString(c.evidenceRef))
    .map(c => ({ taskId: c.id, evidenceRef: c.evidenceRef, state: "AWAITING_VERIFIER" }))
    .sort((a,b) => a.taskId < b.taskId ? -1 : a.taskId > b.taskId ? 1 : 0);
  const retryableFailures = failures.filter(f => f && f.retryable === true).map(f => f.id);
  const blockedFailures = failures.filter(f => f && f.retryable !== true).map(f => f.id);
  return {
    receipts,
    retryableFailures,
    blockedFailures,
    unverifiedBacklog: receipts.length,
    authority: "PROPOSAL_ONLY_EXISTING_GOVERNOR_REQUIRED",
  };
}
