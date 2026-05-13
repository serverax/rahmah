/**
 * Sheikh-action audit writer.
 *
 * Sprint 11: wires append-only audit events for the Sheikh Hasan workflow.
 * Backed by `sakina_sheikh_audit_log` from migration 003. Pool-less mode is
 * a safe no-op so unit tests can exercise the wrapper without a DB.
 *
 * Allowed action codes (these are the canonical strings; treat them as
 * stable wire IDs — never add new values without bumping callers + tests):
 */

export const SHEIKH_ACTIONS = Object.freeze([
  'question_submitted',
  'question_viewed_by_sheikh',
  'answer_draft_saved',
  'answer_submitted',
  'answer_rejected_missing_citation',
  'moderation_requested',
  'moderation_approved',
  'moderation_rejected',
  'public_qa_published',
  'public_qa_hidden',
  'content_report_submitted',
]);

export function isAllowedSheikhAction(action) {
  return SHEIKH_ACTIONS.includes(action);
}

let _pool = null;

export function configureSheikhAudit({ pool = null } = {}) {
  _pool = pool;
}
export function _resetSheikhAuditForTests() {
  _pool = null;
}
export function isSheikhAuditConfigured() {
  return Boolean(_pool);
}

/**
 * Record a single audit event. Safe no-op when pool is missing. Always
 * resolves with a result; never throws.
 *
 *   { ok: true, audit_id }                       — wrote a row
 *   { ok: false, reason: 'no_pool' }             — no DB wired (tests)
 *   { ok: false, reason: 'invalid_action' }      — caller bug
 *   { ok: false, reason: 'invalid_target' }      — caller bug
 *   { ok: false, reason: 'insert_failed' }       — DB error (swallowed)
 *
 * Caller MUST NEVER pass secrets/tokens inside `metadata` — this writer
 * shallow-redacts the obvious forbidden keys, but it's not a deep cleaner.
 */
const FORBIDDEN_META_KEYS = new Set([
  'password', 'password_hash', 'token', 'session_id',
  'access_token', 'refresh_token', 'jwt_secret', 'session_secret',
  'database_url', 'redis_url', 'private_key', 'api_key',
  'whatsapp_token', 'phone', 'phone_number',
]);

function redactMetadata(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN_META_KEYS.has(k.toLowerCase())) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = redactMetadata(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function recordSheikhAction({
  actor_user_id = null,
  action,
  target_type,
  target_id,
  metadata = null,
} = {}) {
  if (!isAllowedSheikhAction(action)) {
    return { ok: false, reason: 'invalid_action' };
  }
  if (typeof target_type !== 'string' || target_type.length === 0) {
    return { ok: false, reason: 'invalid_target' };
  }
  if (typeof target_id !== 'string' || target_id.length === 0) {
    return { ok: false, reason: 'invalid_target' };
  }
  if (!_pool) return { ok: false, reason: 'no_pool' };

  const cleaned = redactMetadata(metadata);
  const sql = `
    INSERT INTO sakina_sheikh_audit_log
      (actor_user_id, action, target_type, target_id, metadata_json)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
  try {
    const res = await _pool.query(sql, [
      actor_user_id,
      action,
      target_type,
      target_id,
      cleaned,
    ]);
    const row = res.rows && res.rows[0];
    if (!row) return { ok: false, reason: 'insert_failed' };
    return { ok: true, audit_id: row.id };
  } catch {
    return { ok: false, reason: 'insert_failed' };
  }
}
