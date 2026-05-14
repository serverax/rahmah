#!/usr/bin/env node
/**
 * scripts/db/run-seeds.js — apply repo seeds in order.
 *
 * Usage:
 *   DATABASE_URL=postgres://… node scripts/db/run-seeds.js
 *   DATABASE_URL=postgres://… node scripts/db/run-seeds.js --dry-run
 *
 * Refuses to run without DATABASE_URL.
 * Refuses placeholder DSNs (CHANGE_ME / REPLACE_ME / PLACEHOLDER).
 * Refuses destructive SQL (DROP / TRUNCATE / DELETE) inside any seed file.
 * Idempotent: re-running is a no-op if seeds use ON CONFLICT.
 *
 * NEVER echoes the DSN, password, or query payloads.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(path.resolve(__dirname, '..', '..', 'backend', 'app', 'package.json'));
const pg = require('pg');

const SEEDS_DIR = path.resolve(__dirname, '..', '..', 'backend', 'db', 'seeds');

const DRY_RUN = process.argv.includes('--dry-run');

const DESTRUCTIVE_RE = /\b(DROP\s+(TABLE|DATABASE|SCHEMA)|TRUNCATE|DELETE\s+FROM)\b/i;

async function main() {
  const dsn = process.env.DATABASE_URL;
  if (!dsn) {
    console.error('[seeds] DATABASE_URL not set — refusing to run.');
    process.exitCode = 2;
    return;
  }
  if (/CHANGE_ME|REPLACE_ME|PLACEHOLDER/i.test(dsn)) {
    console.error('[seeds] DATABASE_URL appears to be a placeholder — refusing to run.');
    process.exitCode = 2;
    return;
  }

  let files = [];
  try {
    files = (await fs.readdir(SEEDS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch {
    console.error(`[seeds] cannot read ${SEEDS_DIR}`);
    process.exitCode = 3;
    return;
  }

  // Scan every seed for destructive SQL BEFORE touching the DB.
  for (const f of files) {
    const sql = await fs.readFile(path.join(SEEDS_DIR, f), 'utf8');
    if (DESTRUCTIVE_RE.test(sql)) {
      console.error(`[seeds] destructive SQL detected in ${f} — refusing.`);
      process.exitCode = 4;
      return;
    }
  }
  console.log(`[seeds] ${files.length} seed file(s) found; all scanned clean.`);

  if (DRY_RUN) {
    console.log('[seeds] dry-run — no DB writes.');
    for (const f of files) console.log(`[seeds] would apply: ${f}`);
    return;
  }

  let pool;
  try {
    pool = new pg.Pool({ connectionString: dsn, connectionTimeoutMillis: 5_000, max: 2 });
  } catch {
    console.error('[seeds] pool construction failed (redacted)');
    process.exitCode = 3;
    return;
  }

  for (const f of files) {
    const sql = await fs.readFile(path.join(SEEDS_DIR, f), 'utf8');
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`[seeds] applied ${f}`);
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        console.error(`[seeds] FAILED ${f} — error redacted`);
        process.exitCode = 1;
        client.release();
        break;
      } finally {
        client.release();
      }
    } catch {
      console.error(`[seeds] cannot acquire connection for ${f}`);
      process.exitCode = 5;
      break;
    }
  }

  await pool.end().catch(() => {});
}

main().catch(() => { process.exitCode = 1; });
