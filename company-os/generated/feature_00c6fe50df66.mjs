const MAX_TEXT = 2000;
const MAX_TAGS = 32;
const MAX_TAG_LEN = 40;

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeTag(tag) {
  if (typeof tag !== 'string') return null;
  const t = tag.trim().toLowerCase();
  if (!t || t.length > MAX_TAG_LEN) return null;
  if (!/^[a-z0-9][a-z0-9 _-]*$/.test(t)) return null;
  return t;
}

/**
 * Validate and normalize a research note draft into a canonical shape.
 * Pure: no I/O, no mutation of input. Returns {ok, value} or {ok:false, errors}.
 */
export function normalizeResearchNoteDraft(input) {
  const errors = [];
  if (!isPlainObject(input)) {
    return { ok: false, errors: ['draft must be an object'] };
  }
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) errors.push('title is required');
  else if (title.length > 160) errors.push('title exceeds 160 characters');

  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!body) errors.push('body is required');
  else if (body.length > MAX_TEXT) errors.push(`body exceeds ${MAX_TEXT} characters`);

  const rawTags = Array.isArray(input.tags) ? input.tags : [];
  if (rawTags.length > MAX_TAGS) errors.push(`too many tags (max ${MAX_TAGS})`);
  const seen = new Set();
  const tags = [];
  for (const raw of rawTags) {
    const t = normalizeTag(raw);
    if (t === null) {
      errors.push(`invalid tag: ${String(raw)}`);
      continue;
    }
    if (!seen.has(t)) {
      seen.add(t);
      tags.push(t);
    }
  }

  const confidence = input.confidence === undefined ? null : input.confidence;
  if (confidence !== null) {
    if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      errors.push('confidence must be a number in [0,1]');
    }
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      body,
      tags,
      confidence,
      wordCount: body.split(/\s+/).filter(Boolean).length,
    },
  };
}

/**
 * Compute a stable, order-independent fingerprint of a normalized note.
 * Useful for dedupe without hashing libraries. Deterministic.
 */
export function researchNoteFingerprint(note) {
  if (!isPlainObject(note) || typeof note.title !== 'string' || typeof note.body !== 'string') {
    throw new Error('researchNoteFingerprint requires a normalized note');
  }
  const tags = Array.isArray(note.tags) ? [...note.tags].sort() : [];
  const payload = [note.title.trim().toLowerCase(), note.body.trim().toLowerCase(), tags.join('|')].join('\u0001');
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = (h1 ^ c) >>> 0;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (h2 + c) >>> 0;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}
