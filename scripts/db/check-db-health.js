#!/usr/bin/env node
/**
 * scripts/db/check-db-health.js — read-only DB health probe.
 * Prints a single JSON line. Never echoes the DSN.
 */

import pg from 'pg';

const dsn = process.env.DATABASE_URL;
const out = {
  configured: false,
  reachable: false,
  migrations_table_exists: false,
  applied_migrations_count: 0,
  public_safe_status: 'not_configured',
};

if (!dsn) {
  console.log(JSON.stringify(out));
  process.exit(0);
}

out.configured = true;

let pool;
try {
  pool = new pg.Pool({ connectionString: dsn, connectionTimeoutMillis: 5_000, max: 1 });
} catch {
  out.public_safe_status = 'pool_construction_failed';
  console.log(JSON.stringify(out));
  process.exit(0);
}

(async () => {
  try {
    await pool.query('SELECT 1');
    out.reachable = true;
  } catch {
    out.reachable = false;
    out.public_safe_status = 'unreachable';
  }
  if (out.reachable) {
    try {
      const r = await pool.query(
        "SELECT to_regclass('public.schema_migrations') AS t",
      );
      out.migrations_table_exists = Boolean(r.rows && r.rows[0] && r.rows[0].t);
    } catch {
      out.migrations_table_exists = false;
    }
    if (out.migrations_table_exists) {
      try {
        const r = await pool.query('SELECT COUNT(*)::int AS n FROM schema_migrations');
        out.applied_migrations_count = (r.rows && r.rows[0] && r.rows[0].n) | 0;
      } catch {
        out.applied_migrations_count = 0;
      }
    }
    out.public_safe_status = out.applied_migrations_count > 0
      ? 'reachable_with_migrations'
      : 'reachable_no_migrations';
  }
  await pool.end().catch(() => {});
  console.log(JSON.stringify(out));
})();
