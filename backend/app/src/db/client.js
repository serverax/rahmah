/**
 * Postgres connection pool helper.
 *
 * Defaults to *no pool* when DATABASE_URL is absent. Never logs the URL.
 * Tests should call `_resetPoolForTests()` if they mutate process.env.
 */

import pg from 'pg';
import { getDatabaseConfig, isDatabaseConfigured } from './config.js';

let _pool = null;

export function getPool() {
  if (_pool) return _pool;
  if (!isDatabaseConfigured()) return null;
  const cfg = getDatabaseConfig();
  if (!cfg) return null;
  try {
    _pool = new pg.Pool({
      connectionString: cfg.connectionString,
      // Modest defaults; production tuning happens via env later.
      max: Number(process.env.PG_POOL_MAX || 10),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      // SSL is operator-driven via the URL; we never override here.
    });
    // Never throw on attach — error handler must not crash the app.
    _pool.on('error', () => { /* swallowed; full error never logged */ });
    return _pool;
  } catch {
    _pool = null;
    return null;
  }
}

export async function ensurePoolAndPing({ timeoutMs = 1500 } = {}) {
  const pool = getPool();
  if (!pool) return { ok: false, reason: 'not_configured' };
  const timer = new Promise((resolve) =>
    setTimeout(() => resolve({ ok: false, reason: 'probe_timeout' }), timeoutMs),
  );
  const probe = (async () => {
    try {
      const r = await pool.query('SELECT 1 AS one');
      const ok = r && r.rows && r.rows[0] && r.rows[0].one === 1;
      return ok ? { ok: true } : { ok: false, reason: 'unexpected_result' };
    } catch {
      return { ok: false, reason: 'connection_error' };
    }
  })();
  return Promise.race([probe, timer]);
}

export function _resetClientPoolForTests() {
  if (_pool) {
    try { _pool.end(); } catch { /* ignore */ }
  }
  _pool = null;
}
