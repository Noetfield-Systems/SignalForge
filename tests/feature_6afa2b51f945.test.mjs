import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFailedTask, selectOldestUnresolved } from '../company-os/generated/feature_6afa2b51f945.mjs';

test('normalizes a failed task with blockers and evidence', () => {
  const r = normalizeFailedTask({
    taskId: 'task-1',
    status: 'failed',
    summary: '  agent crashed  ',
    blockers: ['missing source evidence', 'missing source evidence', '  '],
    evidence: ['log line 42'],
  });
  assert.equal(r.ok, true);
  assert.equal(r.status, 'FAILED');
  assert.equal(r.summary, 'agent crashed');
  assert.deepEqual(r.blockers, ['missing source evidence']);
  assert.equal(r.evidenceComplete, true);
  assert.equal(r.actionable, true);
  assert.equal(r.nextStep, 'REPRODUCE_OLDEST_BLOCKER');
});

test('rejects non-failure and malformed records', () => {
  assert.deepEqual(normalizeFailedTask(null), { ok: false, reason: 'INVALID_RECORD' });
  assert.deepEqual(normalizeFailedTask({ status: 'FAILED' }), { ok: false, reason: 'MISSING_TASK_ID' });
  assert.deepEqual(
    normalizeFailedTask({ taskId: 't', status: 'SUCCEEDED' }),
    { ok: false, reason: 'NOT_A_FAILURE' },
  );
});

test('failure without evidence is not actionable', () => {
  const r = normalizeFailedTask({ taskId: 't2', status: 'BLOCKED', blockers: ['x'] });
  assert.equal(r.ok, true);
  assert.equal(r.evidenceComplete, false);
  assert.equal(r.actionable, false);
  assert.equal(r.nextStep, 'COLLECT_SOURCE_EVIDENCE');
});

test('selects oldest unresolved failure and skips resolved or invalid ages', () => {
  const records = [
    { taskId: 'a', status: 'FAILED', ageDays: 5, evidence: ['e'] },
    { taskId: 'b', status: 'FAILED', ageDays: 2, evidence: ['e'] },
    { taskId: 'c', status: 'FAILED', ageDays: 1, resolved: true, evidence: ['e'] },
    { taskId: 'd', status: 'FAILED', ageDays: -3, evidence: ['e'] },
    { taskId: 'e', status: 'FAILED', ageDays: Number.NaN, evidence: ['e'] },
  ];
  const picked = selectOldestUnresolved(records);
  assert.equal(picked.taskId, 'b');
  assert.equal(picked.ageDays, 2);
  assert.equal(selectOldestUnresolved([]), null);
  assert.equal(selectOldestUnresolved('nope'), null);
});
