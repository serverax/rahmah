#!/usr/bin/env node
/**
 * scripts/db/run-migrations.js — apply repo migrations in order.
 *
 * Usage:
 *   DATABASE_URL=postgres://… node scripts/db/run-migrations.js
 *
 * Behaviour:
 *   - Refuses to run without DATABASE_URL.
 *   - Creates `schema_migrations` if missing.
 *   - Applies each .sql under backend/db/migrations/ in lexical order if not
 *     yet present in schema_migrations.
 *   - Records the migration with a sha-256 of the file content.
 *   - Stops on first error; prints a redacted error (no DSN, no secrets).
 *   - Prints a final summary.
 *
 * Idempotent. Re-running after success is a no-op.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(path.resolve(__dirname, '..', '..', 'backend', 'app', 'package.json'));
const pg = require('pg');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'backend', 'db', 'migrations');

function hash(s) {
  return createHash('sha256').update(s).digest('hex');
}

async function main() {
  const dsn = process.env.DATABASE_URL;
  if (!dsn || typeof dsn !== 'string' || dsn.length === 0) {
    console.error('[migrations] DATABASE_URL not set — refusing to run.');
    process.exitCode = 2;
    return;
  }
  // Refuse obvious placeholder DSNs so an operator never accidentally points
  // the runner at the literal template value.
  if (/CHANGE_ME|REPLACE_ME|PLACEHOLDER/i.test(dsn)) {
    console.error('[migrations] DATABASE_URL appears to be a placeholder — refusing to run.');
    process.exitCode = 2;
    return;
  }

  let pool;
  try {
    pool = new pg.Pool({
      connectionString: dsn,
      connectionTimeoutMillis: 5_000,
      max: 2,
    });
  } catch {
    console.error('[migrations] failed to construct pool (redacted)');
    process.exitCode = 3;
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename     TEXT PRIMARY KEY,
        applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        content_hash TEXT NOT NULL CHECK (length(content_hash) = 64)
      )
    `);
  } catch {
    console.error('[migrations] cannot create schema_migrations (redacted)');
    process.exitCode = 4;
    await pool.end().catch(() => {});
    return;
  }

  let files;
  try {
    files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch {
    console.error(`[migrations] cannot read ${MIGRATIONS_DIR}`);
    process.exitCode = 5;
    await pool.end().catch(() => {});
    return;
  }

  let appliedExisting;
  try {
    const r = await pool.query('SELECT filename, content_hash FROM schema_migrations');
    appliedExisting = new Map((r.rows || []).map((row) => [row.filename, row.content_hash]));
  } catch {
    console.error('[migrations] cannot read schema_migrations');
    process.exitCode = 6;
    await pool.end().catch(() => {});
    return;
  }

  const summary = { applied: [], skipped: [], errors: [], total: files.length };
  for (const f of files) {
    const full = path.join(MIGRATIONS_DIR, f);
    let sql;
    try { sql = await fs.readFile(full, 'utf8'); }
    catch {
      console.error(`[migrations] cannot read ${f}`);
      summary.errors.push({ file: f, reason: 'read_failed' });
      break;
    }
    const h = hash(sql);
    if (appliedExisting.has(f)) {
      if (appliedExisting.get(f) !== h) {
        // Drift detected — operator must investigate, not auto-fix.
        console.error(`[migrations] DRIFT: ${f} applied with different content hash; refusing to re-apply.`);
        summary.errors.push({ file: f, reason: 'content_hash_drift' });
        break;
      }
      summary.skipped.push(f);
      continue;
    }
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename, content_hash) VALUES ($1, $2)',
          [f, h],
        );
        await client.query('COMMIT');
        summary.applied.push(f);
        console.log(`[migrations] applied ${f}`);
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        console.error(`[migrations] FAILED ${f} — error redacted`);
        summary.errors.push({ file: f, reason: 'apply_failed' });
        client.release();
        break;
      } finally {
        client.release();
      }
    } catch {
      console.error(`[migrations] cannot acquire connection for ${f}`);
      summary.errors.push({ file: f, reason: 'connect_failed' });
      break;
    }
  }

  await pool.end().catch(() => {});

  console.log('[migrations] summary:');
  console.log(`  total:   ${summary.total}`);
  console.log(`  applied: ${summary.applied.length}`);
  console.log(`  skipped: ${summary.skipped.length}`);
  console.log(`  errors:  ${summary.errors.length}`);
  if (summary.errors.length > 0) process.exitCode = 1;
}

main().catch(() => { process.exitCode = 1; });
