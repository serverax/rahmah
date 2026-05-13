/**
 * Engine audit logger — writes decision records when audit storage is wired.
 * No-pool default returns `not_persisted_storage_not_configured` honestly.
 */

import { recordSheikhAction, isAllowedSheikhAction } from '../audit/sheikh-action-audit.js';

const SHEIKH_LIFECYCLE_ACTIONS = new Set([
  'question_submitted',
  'answer_submitted',
  'answer_rejected_missing_citation',
  'moderation_approved',
  'moderation_rejected',
  'public_qa_published',
  'public_qa_hidden',
]);

/**
 * Record a single engine decision. Maps an engine event to an audit row when
 * the action is in the supported sheikh-audit set; otherwise returns a
 * `not_audited_event_type` shape so callers can decide whether to ignore.
 */
export async function logDecision({
  actor_user_id = null,
  action,
  target_type,
  target_id,
  metadata = null,
} = {}) {
  if (!isAllowedSheikhAction(action) || !SHEIKH_LIFECYCLE_ACTIONS.has(action)) {
    return Object.freeze({
      ok: false,
      reason: 'not_audited_event_type',
      audit_status: 'not_persisted_event_not_routed',
    });
  }
  const r = await recordSheikhAction({ actor_user_id, action, target_type, target_id, metadata });
  if (r.ok) {
    return Object.freeze({ ok: true, audit_id: r.audit_id, audit_status: 'persisted' });
  }
  if (r.reason === 'no_pool') {
    return Object.freeze({
      ok: false,
      reason: 'no_pool',
      audit_status: 'not_persisted_storage_not_configured',
    });
  }
  return Object.freeze({
    ok: false,
    reason: r.reason || 'insert_failed',
    audit_status: 'not_persisted_error',
  });
}
