/**
 * Validate retrieved sources before any answer is composed.
 *
 * A source is considered valid for citation IFF:
 *   - has a non-empty id
 *   - has a non-empty chunk_text (trimmed)
 *   - has a non-empty citation_label (trimmed)
 *   - verification_status is missing OR explicitly 'approved'
 *     (repository already filters to approved; defense-in-depth here)
 *
 * Pending and rejected sources are NEVER acceptable.
 *
 * Returns:
 *   { canAnswer: true,  reason: null,                                validSources: [...] }
 * or
 *   { canAnswer: false, reason: 'insufficient_verified_sources', validSources: [] }
 */

function isNonEmptyString(x) {
  return typeof x === 'string' && x.trim().length > 0;
}

export function validateSourcesForAnswer(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return { canAnswer: false, reason: 'insufficient_verified_sources', validSources: [] };
  }

  const valid = [];
  for (const s of sources) {
    if (!s || typeof s !== 'object') continue;
    if (!isNonEmptyString(s.id)) continue;
    if (!isNonEmptyString(s.chunk_text)) continue;
    if (!isNonEmptyString(s.citation_label)) continue;
    // Defense in depth: repository already filters approved; reject anything
    // else that somehow slips through.
    if (s.verification_status !== undefined && s.verification_status !== 'approved') continue;
    valid.push(s);
  }

  if (valid.length === 0) {
    return { canAnswer: false, reason: 'insufficient_verified_sources', validSources: [] };
  }
  return { canAnswer: true, reason: null, validSources: valid };
}
