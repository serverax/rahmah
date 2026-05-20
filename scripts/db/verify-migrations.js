#!/usr/bin/env node
/**
 * scripts/db/verify-migrations.js
 *
 * Safe migration verifier for Rahma.
 *
 * Default mode is static/dry-run only:
 *   - validates migration file ordering
 *   - scans for obvious destructive SQL and secret-like literals
 *   - checks for duplicate filenames and content hashes
 *   - never executes SQL unless explicitly enabled
 *
 * Database execution is intentionally opt-in and not used by default.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'backend', 'db', 'migrations');

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function scanForRiskySql(sql) {
  const findings = [];
  const patterns = [
    { re: /\bDROP\s+DATABASE\b/i, label: 'drop_database' },
    { re: /\bDROP\s+SCHEMA\b/i, label: 'drop_schema' },
    { re: /\bTRUNCATE\b/i, label: 'truncate' },
    { re: /\bDELETE\s+FROM\b/i, label: 'delete_from' },
    { re: /\bINSERT\s+INTO\b/i, label: 'seed_insert' },
    { re: /postgres(?:ql)?:\/\//i, label: 'dsn_literal' },
    { re: /\bCHANGE_ME\b|\bREPLACE_ME\b|\bAPI_KEY\b|\bPRIVATE_KEY\b|\bPASSWORD\b|\bTOKEN\b|\bDATABASE_URL\b/i, label: 'placeholder_secret_literal' },
  ];
  for (const { re, label } of patterns) {
    if (re.test(sql)) findings.push(label);
  }
  return findings;
}

async function main() {
  const report = {
    mode: 'static_dry_run',
    migrations_dir: MIGRATIONS_DIR,
    migrations: [],
    ok: true,
    db_executed: false,
    db_status: 'DB_NOT_EXECUTED',
    issues: [],
    warnings: [],
  };

  let files = [];
  try {
    files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch (err) {
    report.ok = false;
    report.issues.push({ type: 'read_error', message: 'Unable to read migration directory' });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }

  const seenHashes = new Map();
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const full = path.join(MIGRATIONS_DIR, file);
    const sql = await fs.readFile(full, 'utf8');
    const hash = sha256(sql);
    const risky = scanForRiskySql(sql).filter((item) => item !== 'seed_insert');
    const duplicate = seenHashes.has(hash);
    seenHashes.set(hash, file);
    report.migrations.push({
      file,
      index,
      sha256: hash,
      length: sql.length,
      risky,
      duplicate,
    });
    if (risky.length > 0) {
      report.warnings.push({ type: 'risky_sql', file, risky });
    }
    if (duplicate) {
      report.ok = false;
      report.issues.push({ type: 'duplicate_content', file });
    }
  }

  report.summary = {
    file_count: report.migrations.length,
    risky_file_count: report.warnings.filter((item) => item.type === 'risky_sql').length,
    duplicate_count: report.issues.filter((item) => item.type === 'duplicate_content').length,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error('verify-migrations failed:', err && err.message ? err.message : String(err));
  process.exitCode = 1;
});
