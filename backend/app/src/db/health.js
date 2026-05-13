import pg from 'pg';
import { getDatabaseConfig, isDatabaseConfigured } from './config.js';

const { Pool } = pg;

// Singleton Pool. Lazily created when first probe runs.
let _pool = null;

function getPool() {
  if (_pool) return _pool;
  const cfg = getDatabaseConfig();
  if (!cfg) return null;
  _pool = new Pool({
    connectionString: cfg.connectionString,
    // We are about to do a tiny SELECT 1 probe; a single connection is enough.
    max: 1,
    // Reject connection ASAP if unreachable — caller also enforces a timeout.
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 5000,
    application_name: 'sakina-backend-health',
  });
  // Swallow background pool errors so they cannot crash the process.
  // Real connection errors are reported per-query by checkDatabaseHealth.
  _pool.on('error', () => { /* intentionally silent — never re-emit DSN */ });
  return _pool;
}

/**
 * Classify a pg error into a safe `error_type` string. NEVER returns the
 * raw error message (it may include the DSN, hostnames, or query text).
 */
function classifyError(err) {
  if (!err) return null;
  const code = err.code || '';
  if (code === 'ECONNREFUSED') return 'connection_refused';
  if (code === 'ENOTFOUND')    return 'dns_unresolved';
  if (code === 'ETIMEDOUT')    return 'connection_timeout';
  if (code === 'ECONNRESET')   return 'connection_reset';
  if (code === '28P01' || code === '28000') return 'auth_failed';
  if (code === '3D000') return 'unknown_database';
  if (code === '57P03') return 'cannot_connect_now';
  if (err.name === 'AbortError') return 'probe_timeout';
  // Unknown code — return a coarse bucket without echoing details.
  return 'unknown_error';
}

/**
 * Probe DB reachability with a tiny `SELECT 1` query.
 *
 * @param {object} opts
 * @param {number} opts.timeoutMs  — overall probe budget in ms (default 1500)
 * @returns {Promise<{
 *   configured: boolean,
 *   connected: boolean,
 *   checked: boolean,
 *   error_type: string | null
 * }>}
 */
export async function checkDatabaseHealth({ timeoutMs = 1500 } = {}) {
  if (!isDatabaseConfigured()) {
    return { configured: false, connected: false, checked: false, error_type: null };
  }
  const pool = getPool();
  if (!pool) {
    return { configured: true, connected: false, checked: false, error_type: 'no_pool' };
  }

  // Wrap the query in a hard timeout so an unreachable host cannot stall
  // /ready beyond `timeoutMs`. We resolve to a structured failure object;
  // we never re-throw raw pg errors past this boundary.
  let timer = null;
  try {
    const queryPromise = pool.query('SELECT 1 AS ok');
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error('probe timed out');
        err.name = 'AbortError';
        reject(err);
      }, timeoutMs);
    });
    const result = await Promise.race([queryPromise, timeoutPromise]);
    if (result && result.rows && result.rows[0] && result.rows[0].ok === 1) {
      return { configured: true, connected: true, checked: true, error_type: null };
    }
    return { configured: true, connected: false, checked: true, error_type: 'unexpected_query_result' };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      checked: true,
      error_type: classifyError(err),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Test helper — force the singleton Pool to be recreated next probe. */
export function _resetPoolForTests() {
  if (_pool) {
    try { _pool.end(); } catch { /* intentionally swallowed */ }
  }
  _pool = null;
}
