/**
 * Tiny parameterized-query helper. Wraps `pool.query` with a redacted error
 * shape so callers never receive raw pg error messages (which may include
 * the DSN or table-level metadata).
 */

import { getPool } from './client.js';

const REDACTED = 'database_query_failed';

export async function safeQuery(sql, params = []) {
  const pool = getPool();
  if (!pool) return { ok: false, reason: 'not_configured', rows: [] };
  if (typeof sql !== 'string' || sql.length === 0) {
    return { ok: false, reason: 'invalid_sql', rows: [] };
  }
  try {
    const r = await pool.query(sql, Array.isArray(params) ? params : []);
    return { ok: true, rows: r.rows || [], rowCount: r.rowCount || 0 };
  } catch {
    return { ok: false, reason: REDACTED, rows: [] };
  }
}

export async function safeQueryOne(sql, params = []) {
  const r = await safeQuery(sql, params);
  if (!r.ok) return r;
  return { ok: true, row: r.rows[0] || null, rowCount: r.rowCount };
}
