/**
 * Append-only audit writer for self-improvement actions.
 *
 * It records a coarse row only. When no pool exists, it returns a no-op
 * result instead of failing the request.
 */

import { anonymiseEvidence } from './privacy-redactor.js';

export async function AuditLogWriter({
  pool = null,
  action,
  target_type,
  target_id,
  source = 'self_improvement_engine',
  anonymised_evidence = null,
  risk_level = 'medium',
  approval_status = 'drafted',
  reviewer_admin_id = null,
  decision_reason = null,
} = {}) {
  if (!pool) {
    return Object.freeze({ recorded: false, reason: 'no_pool' });
  }
  if (typeof action !== 'string' || action.trim().length === 0) {
    return Object.freeze({ recorded: false, reason: 'invalid_action' });
  }
  if (typeof target_type !== 'string' || target_type.trim().length === 0) {
    return Object.freeze({ recorded: false, reason: 'invalid_target' });
  }
  if (typeof target_id !== 'string' || target_id.trim().length === 0) {
    return Object.freeze({ recorded: false, reason: 'invalid_target' });
  }

  const cleanedEvidence = anonymiseEvidence(anonymised_evidence);
  const sql = `
    INSERT INTO self_improvement_audit_log
      (action, target_type, target_id, source, anonymised_evidence, risk_level, approval_status, reviewer_admin_id, decision_reason)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `;

  try {
    const result = await pool.query(sql, [
      action,
      target_type,
      target_id,
      source,
      cleanedEvidence,
      normaliseRisk(risk_level),
      approval_status,
      reviewer_admin_id,
      typeof decision_reason === 'string' ? decision_reason : null,
    ]);
    const row = result.rows && result.rows[0];
    return row
      ? Object.freeze({ recorded: true, audit_id: row.id })
      : Object.freeze({ recorded: false, reason: 'insert_failed' });
  } catch {
    return Object.freeze({ recorded: false, reason: 'insert_failed' });
  }
}

function normaliseRisk(value) {
  const risk = String(value || 'medium').toLowerCase();
  if (risk === 'low' || risk === 'medium' || risk === 'high') return risk;
  return 'medium';
}
