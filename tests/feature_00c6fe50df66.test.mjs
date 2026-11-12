import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeResearchNoteDraft, researchNoteFingerprint } from '../company-os/generated/feature_00c6fe50df66.mjs';

test('normalizes a valid draft and dedupes tags', () => {
  const r = normalizeResearchNoteDraft({
    title: '  SOL liquidity watch  ',
    body: 'Observed thin depth on the ask side during the last session.',
    tags: ['Solana', 'solana', ' liquidity '],
    confidence: 0.6,
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.title, 'SOL liquidity watch');
  assert.deepEqual(r.value.tags, ['solana', 'liquidity']);
  assert.equal(r.value.confidence, 0.6);
  assert.ok(r.value.wordCount >= 8);
});

test('rejects empty title/body and out-of-range confidence', () => {
  const r = normalizeResearchNoteDraft({ title: '   ', body: '', confidence: 1.5 });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes('title')));
  assert.ok(r.errors.some(e => e.includes('body')));
  assert.ok(r.errors.some(e => e.includes('confidence')));
});

test('rejects invalid tags but keeps valid ones', () => {
  const r = normalizeResearchNoteDraft({
    title: 'Note',
    body: 'Body text.',
    tags: ['ok-tag', '!!!', 'x'.repeat(41)],
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes('invalid tag')));
});

test('fingerprint is order-independent for tags and stable', () => {
  const a = normalizeResearchNoteDraft({ title: 'A', body: 'B', tags: ['x', 'y'] });
  const b = normalizeResearchNoteDraft({ title: 'a', body: 'b', tags: ['y', 'x'] });
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(researchNoteFingerprint(a.value), researchNoteFingerprint(b.value));
  assert.throws(() => researchNoteFingerprint(null));
});
