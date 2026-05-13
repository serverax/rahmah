/**
 * Cache policy — what's allowed in the cache and what isn't.
 *
 * The functions here are the single source of truth for "cacheable?" decisions.
 * They are deliberately pure (no I/O) and trivially testable.
 */

const SAFE_KEY_REGEX = /^[a-z0-9:_-]{1,128}$/;
export const NAMESPACE = 'sakina:';

const ALLOWED_NAMESPACE_PREFIXES = Object.freeze([
  'sakina:public_qa:list:',
  'sakina:public_qa:detail:',
  'sakina:question_status:',
  'sakina:ready:',
]);

const FORBIDDEN_VALUE_KEYS = Object.freeze([
  // Identity / PII
  'email',
  'email_hash',
  'phone',
  'phone_number',
  'whatsapp_to',
  'user_id',
  'sheikh_user_id',
  'assigned_sheikh_id',
  // Secrets
  'password',
  'password_hash',
  'token',
  'auth_token',
  'session_id',
  'access_token',
  'refresh_token',
  'private_key',
  'api_key',
  'jwt_secret',
  'session_secret',
  'database_url',
  'redis_url',
  // Sensitive content
  'question_text',
  'question_hash',
  'internal_notes',
]);

/**
 * Validate a cache key. Returns true iff:
 *   - it matches SAFE_KEY_REGEX (lowercase alnum + `:_-`, length ≤ 128)
 *   - it starts with one of the allowed namespace prefixes
 */
export function isAllowedKey(key) {
  if (typeof key !== 'string' || key.length === 0) return false;
  if (!SAFE_KEY_REGEX.test(key)) return false;
  return ALLOWED_NAMESPACE_PREFIXES.some((p) => key.startsWith(p));
}

/**
 * Check whether a value is safe to cache. The function performs a shallow + 1-level
 * deep field-name scan against the FORBIDDEN_VALUE_KEYS list. Strings, numbers,
 * booleans, null are always allowed (after the wrapper's other checks).
 *
 * This is defense-in-depth: route wrappers already project the value, but if the
 * projection is wrong this catches it before it lands in the cache.
 */
export function isCacheableValue(value) {
  if (value === null) return true;
  if (typeof value !== 'object') return true; // primitives are OK
  if (Array.isArray(value)) {
    for (const item of value) if (!isCacheableValue(item)) return false;
    return true;
  }
  for (const k of Object.keys(value)) {
    if (FORBIDDEN_VALUE_KEYS.includes(k)) return false;
  }
  // 1-level deep check on nested objects/arrays for the same forbidden keys
  for (const k of Object.keys(value)) {
    const v = value[k];
    if (v !== null && typeof v === 'object') {
      if (!isCacheableValue(v)) return false;
    }
  }
  return true;
}

/**
 * Validate a public Q&A row before caching. Returns true iff:
 *   - row has at least one citation
 *   - every citation has a citation_type ∈ allowed enum AND a non-empty citation_label
 *   - row does not contain a forbidden value field
 */
export function isCacheablePublicQARow(row) {
  if (!row || typeof row !== 'object') return false;
  if (!Array.isArray(row.citations) || row.citations.length === 0) return false;
  const allowedTypes = new Set(['quran', 'hadith', 'fiqh', 'scholar_note']);
  for (const c of row.citations) {
    if (!c || typeof c !== 'object') return false;
    if (!allowedTypes.has(c.citation_type)) return false;
    if (typeof c.citation_label !== 'string' || c.citation_label.trim().length === 0) return false;
  }
  return isCacheableValue(row);
}

/**
 * Validate a public Q&A list entry before caching the *list*. Each entry
 * must have a slug + title + language and be live by definition (the list
 * source is `is_live = TRUE` rows only).
 */
export function isCacheablePublicQAListEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (typeof entry.slug !== 'string' || entry.slug.length === 0) return false;
  if (typeof entry.title !== 'string' || entry.title.length === 0) return false;
  if (typeof entry.language !== 'string' || entry.language.length === 0) return false;
  return isCacheableValue(entry);
}

/**
 * Validate a question status projection. Returns true iff the projection contains
 * ONLY the allowed coarse fields.
 */
export function isCacheableQuestionStatus(value) {
  if (!value || typeof value !== 'object') return false;
  const allowed = new Set([
    'question_id',
    'status',
    'language',
    'category',
    'created_at',
    'updated_at',
  ]);
  for (const k of Object.keys(value)) {
    if (!allowed.has(k)) return false;
  }
  return isCacheableValue(value);
}
