#!/usr/bin/env node
/**
 * scripts/db/db-status.js — list applied vs pending migrations.
 *
 * Read-only. Prints a single JSON line. Never echoes the DSN.
 *
 * Output:
 *   { configured: bool,
 *     reachable: bool,
 *     migrations_table_exists: bool,
 *     applied: [ "001_*.sql", ... ],
 *     pending: [ "008_*.sql", ... ],
 *     drift:   [ "<filename>" ],            // sha-256 differs from row
 *     missing_files: [ "<filename>" ]       // applied in DB but file removed
 *   }
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendPkg = path.resolve(__dirname, '..', '..', 'backend', 'app', 'package.json');
const require = createRequire(backendPkg);
const pg = require('pg');

const MIG_DIR = path.resolve(__dirname, '..', '..', 'backend', 'db', 'migrations');

function hash(s) { return createHash('sha256').update(s).digest('hex'); }

const out = {
  configured: false,
  reachable: false,
  migrations_table_exists: false,
  applied: [],
  pending: [],
  drift: [],
  missing_files: [],
};

(async () => {
  const dsn = process.env.DATABASE_URL;
  if (!dsn) { console.log(JSON.stringify(out)); return; }
  out.configured = true;

  let pool;
  try {
    pool = new pg.Pool({ connectionString: dsn, connectionTimeoutMillis: 5_000, max: 1 });
  } catch {
    console.log(JSON.stringify(out));
    return;
  }

  // Files on disk.
  let onDisk = [];
  try {
    onDisk = (await fs.readdir(MIG_DIR)).filter((f) => f.endsWith('.sql')).sort();
  } catch {
    /* leave empty */
  }
  const fileHashes = new Map();
  for (const f of onDisk) {
    try {
      const c = await fs.readFile(path.join(MIG_DIR, f), 'utf8');
      fileHashes.set(f, hash(c));
    } catch { /* skip */ }
  }

  try {
    await pool.query('SELECT 1');
    out.reachable = true;
  } catch {
    await pool.end().catch(() => {});
    console.log(JSON.stringify(out));
    return;
  }

  try {
    const r = await pool.query("SELECT to_regclass('public.schema_migrations') AS t");
    out.migrations_table_exists = Boolean(r.rows && r.rows[0] && r.rows[0].t);
  } catch { /* keep false */ }

  if (out.migrations_table_exists) {
    let rows = [];
    try {
      const r = await pool.query(
        'SELECT filename, content_hash FROM schema_migrations ORDER BY applied_at ASC, filename ASC',
      );
      rows = r.rows || [];
    } catch { /* keep empty */ }

    const appliedNames = new Set();
    for (const row of rows) {
      appliedNames.add(row.filename);
      out.applied.push(row.filename);
      if (fileHashes.has(row.filename)) {
        if (fileHashes.get(row.filename) !== row.content_hash) {
          out.drift.push(row.filename);
        }
      } else {
        out.missing_files.push(row.filename);
      }
    }
    for (const f of onDisk) {
      if (!appliedNames.has(f)) out.pending.push(f);
    }
  } else {
    out.pending = onDisk;
  }

  await pool.end().catch(() => {});
  console.log(JSON.stringify(out));
})();
