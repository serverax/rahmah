/**
 * backend/app/src/services/privacy-repository.js
 */

export function createPrivacyRepository({ pool } = {}) {
  const hasPool = Boolean(pool);

  async function createPrivacyRequest({ type, emailHash, metadata = {} }) {
    if (!hasPool) return { ok: true, persisted: false };
    const sql = `
      INSERT INTO privacy_requests (request_type, requester_email_hash, status, metadata_jsonb)
      VALUES ($1, $2, 'received', $3)
      RETURNING id, status, created_at
    `;
    try {
      const res = await pool.query(sql, [type, emailHash, JSON.stringify(metadata)]);
      return { ok: true, id: res.rows[0].id, persisted: true };
    } catch {
      return { ok: false, error: 'persistence_failed' };
    }
  }

  async function listPendingRequests() {
    if (!hasPool) return [];
    const sql = `
      SELECT id, request_type, requester_email_hash, status, metadata_jsonb, created_at
      FROM privacy_requests
      WHERE status = 'received'
      ORDER BY created_at ASC
    `;
    try {
      const res = await pool.query(sql);
      return res.rows || [];
    } catch {
      return [];
    }
  }

  async function completeRequest(id) {
    if (!hasPool) return { ok: false, error: 'service_not_configured' };
    const sql = `
      UPDATE privacy_requests
      SET status = 'completed', updated_at = NOW()
      WHERE id = $1
    `;
    try {
      await pool.query(sql, [id]);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  return {
    createPrivacyRequest,
    listPendingRequests,
    completeRequest
  };
}

let _repo = null;
export function configurePrivacyRepository({ pool }) { _repo = createPrivacyRepository({ pool }); }
export function getPrivacyRepository() { return _repo; }
export function isPrivacyRepositoryConfigured() { return Boolean(_repo); }

