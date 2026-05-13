/**
 * Database configuration accessor.
 *
 * Reads DATABASE_URL strictly from process.env. Never logs the value.
 * Never echoes the value in any returned object that may be serialized
 * to the wire. The redactor exists for human-debug output ONLY and
 * never reveals username / password / host / database name.
 */

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Returns the raw DSN for in-process use only (e.g., passing to a pg
 * Pool). Callers MUST NOT log, serialize, or echo the return value.
 *
 * Returns null when DATABASE_URL is not set.
 */
export function getDatabaseConfig() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return { connectionString: url };
}

/**
 * Produces a string safe to include in diagnostic outputs. NEVER
 * contains username, password, host, port, or database name. Reveals
 * only the URL scheme and whether a value is configured.
 */
export function redactDatabaseUrlForDiagnostics() {
  const url = process.env.DATABASE_URL;
  if (!url) return '[unconfigured]';
  // Extract scheme only. We deliberately ignore everything after the "://"
  // boundary — so even malformed DSNs cannot leak credentials by accident.
  const idx = url.indexOf('://');
  const scheme = idx > 0 ? url.slice(0, idx).toLowerCase() : 'unknown-scheme';
  if (scheme !== 'postgres' && scheme !== 'postgresql') {
    // Don't echo other schemes verbatim — could carry custom URL data.
    return '[configured: non-postgres scheme]';
  }
  return '[configured: postgres scheme]';
}
