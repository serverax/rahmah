/**
 * Islamic source registry — fail-closed repository for new source entries.
 *
 * No-pool default: every call returns `{ ok: false, reason: 'service_not_configured' }`
 * for writes and `[]` / null for reads. With a pool, all SQL is parameterized
 * (`$1, $2…`) — never string-concatenated.
 *
 * The registry is the gate for what may eventually be retrieved by the RAG
 * layer. New entries default to `unverified` and must transition through
 * `pending_review` → `approved` before they can be retrieved.
 */

import { isValidSourceType, isValidVerificationStatus } from './rag-types.js';

const NOT_CONFIGURED = Object.freeze({ ok: false, reason: 'service_not_configured' });

export function createIslamicSourceRegistry({ pool } = {}) {
  const hasPool = Boolean(pool);

  async function registerSource({
    source_type,
    source_name_ar,
    source_reference,
    source_url = null,
    language = 'ar',
  } = {}) {
    if (!isValidSourceType(source_type)) {
      return { ok: false, reason: 'invalid_source_type' };
    }
    if (typeof source_name_ar !== 'string' || source_name_ar.trim().length === 0) {
      return { ok: false, reason: 'missing_source_name_ar' };
    }
    if (typeof source_reference !== 'string' || source_reference.trim().length === 0) {
      return { ok: false, reason: 'missing_source_reference' };
    }
    if (!hasPool) return NOT_CONFIGURED;

    const sql = `
      INSERT INTO islamic_source_registry
        (source_type, source_name_ar, source_reference, source_url, language, verification_status)
      VALUES ($1, $2, $3, $4, $5, 'unverified')
      ON CONFLICT (source_reference) DO NOTHING
      RETURNING id, verification_status
    `;
    try {
      const res = await pool.query(sql, [
        source_type,
        source_name_ar.trim(),
        source_reference.trim(),
        source_url || null,
        language || 'ar',
      ]);
      const row = res.rows && res.rows[0];
      if (!row) return { ok: false, reason: 'duplicate_source_reference' };
      return { ok: true, source_id: row.id, verification_status: row.verification_status };
    } catch {
      return { ok: false, reason: 'insert_failed' };
    }
  }

  async function setVerificationStatus({ source_id, status }) {
    if (typeof source_id !== 'string' || source_id.length === 0) {
      return { ok: false, reason: 'invalid_source_id' };
    }
    if (!isValidVerificationStatus(status)) {
      return { ok: false, reason: 'invalid_status' };
    }
    if (!hasPool) return NOT_CONFIGURED;
    const sql = `
      UPDATE islamic_source_registry
      SET verification_status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, verification_status
    `;
    try {
      const res = await pool.query(sql, [status, source_id]);
      const row = res.rows && res.rows[0];
      if (!row) return { ok: false, reason: 'not_found' };
      return { ok: true, source_id: row.id, verification_status: row.verification_status };
    } catch {
      return { ok: false, reason: 'update_failed' };
    }
  }

  async function countSourcesByStatus() {
    if (!hasPool) {
      return { approved: 0, pending_review: 0, unverified: 0, rejected: 0 };
    }
    const sql = `
      SELECT verification_status AS status, COUNT(*)::int AS n
      FROM islamic_source_registry
      GROUP BY verification_status
    `;
    try {
      const res = await pool.query(sql);
      const out = { approved: 0, pending_review: 0, unverified: 0, rejected: 0 };
      for (const row of res.rows || []) {
        if (row.status in out) out[row.status] = row.n;
      }
      return out;
    } catch {
      return { approved: 0, pending_review: 0, unverified: 0, rejected: 0 };
    }
  }

  async function listApprovedSources({ limit = 50 } = {}) {
    if (!hasPool) return [];
    const n = Number.isInteger(limit) && limit > 0 && limit <= 200 ? limit : 50;
    const sql = `
      SELECT id, source_type, source_name_ar, source_reference, language, created_at
      FROM islamic_source_registry
      WHERE verification_status = 'approved'
      ORDER BY created_at DESC
      LIMIT $1
    `;
    try {
      const res = await pool.query(sql, [n]);
      return res.rows || [];
    } catch {
      return [];
    }
  }

  return {
    registerSource,
    setVerificationStatus,
    countSourcesByStatus,
    listApprovedSources,
  };
}
