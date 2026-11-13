import test from "node:test";
import assert from "node:assert/strict";
import { classifyTaskSignals, buildReceiptPlan } from "../company-os/generated/feature_4cc2425fa8cf.mjs";

test("classifies failures and completed work with evidence", () => {
  const out = classifyTaskSignals([
    { id: "t1", status: "failed", failureKind: "timeout", retryable: true },
    { id: "t2", status: "completed", evidenceRef: "ev-2" },
    { id: "t3", status: "completed" },
    { id: "t4", status: "running" },
  ]);
  assert.equal(out.failures.length, 1);
  assert.equal(out.failures[0].kind, "timeout");
  assert.equal(out.completed.length, 2);
  assert.equal(out.completed[0].eligibleForReceipt, true);
  assert.equal(out.completed[1].eligibleForReceipt, false);
  assert.equal(out.skipped.length, 1);
});

test("builds sorted receipt plan and separates retryable failures", () => {
  const classified = classifyTaskSignals([
    { id: "b", status: "completed", evidenceRef: "ev-b" },
    { id: "a", status: "completed", evidenceRef: "ev-a" },
    { id: "f1", status: "failed", failureKind: "tool_error", retryable: true },
    { id: "f2", status: "failed", failureKind: "validation_error", retryable: false },
  ]);
  const plan = buildReceiptPlan(classified);
  assert.deepEqual(plan.receipts.map(r => r.taskId), ["a", "b"]);
  assert.equal(plan.unverifiedBacklog, 2);
  assert.deepEqual(plan.retryableFailures, ["f1"]);
  assert.deepEqual(plan.blockedFailures, ["f2"]);
  assert.equal(plan.authority, "PROPOSAL_ONLY_EXISTING_GOVERNOR_REQUIRED");
});

test("edge: unknown failure kind and missing id are handled safely", () => {
  const out = classifyTaskSignals([
    { id: "x", status: "failed", failureKind: "weird" },
    { status: "failed" },
    null,
  ]);
  assert.equal(out.failures.length, 1);
  assert.equal(out.failures[0].kind, "unknown");
  assert.equal(out.failures[0].retryable, false);
  assert.equal(out.skipped.length, 2);
  const plan = buildReceiptPlan(out);
  assert.equal(plan.receipts.length, 0);
  assert.deepEqual(plan.blockedFailures, ["x"]);
});

test("rejects non-array input and oversized batches", () => {
  assert.throws(() => classifyTaskSignals("nope"), TypeError);
  const big = Array.from({ length: 501 }, (_, i) => ({ id: "t" + i, status: "running" }));
  assert.throws(() => classifyTaskSignals(big), RangeError);
});
