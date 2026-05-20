#!/usr/bin/env node
/**
 * scripts/db/verify-complete-schema.js
 *
 * Canonical Rahma schema verifier (wrapper around verify-rahma-schema.js).
 * Reports PASS_SCHEMA_VERIFIED or FAILED_SCHEMA_BLOCKERS.
 * Never prints DATABASE_URL.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const verifyScript = path.join(__dirname, 'verify-rahma-schema.js');

const child = spawnSync(process.execPath, [verifyScript], {
  env: process.env,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

let payload = null;
try {
  payload = JSON.parse(child.stdout || '{}');
} catch {
  payload = {
    db_status: 'DB_FAILED',
    blockers: ['verify-rahma-schema.js did not return valid JSON'],
  };
}

const blockers = Array.isArray(payload.blockers) ? payload.blockers : [];
const missingTables = Array.isArray(payload.missing_tables) ? payload.missing_tables : [];
const missingColumns = Array.isArray(payload.missing_columns) ? payload.missing_columns : [];
const missingIndexes = Array.isArray(payload.missing_indexes) ? payload.missing_indexes : [];
const missingConstraints = Array.isArray(payload.missing_constraints) ? payload.missing_constraints : [];

const schemaBlockers = [];
if (missingTables.length > 0) schemaBlockers.push(`missing_tables:${missingTables.length}`);
if (missingColumns.length > 0) schemaBlockers.push(`missing_columns:${missingColumns.length}`);
if (missingIndexes.length > 0) schemaBlockers.push(`missing_indexes:${missingIndexes.length}`);
if (missingConstraints.length > 0) schemaBlockers.push(`missing_constraints:${missingConstraints.length}`);
if (Array.isArray(payload.migration_files_missing_from_db) && payload.migration_files_missing_from_db.length > 0) {
  schemaBlockers.push(`unapplied_migrations:${payload.migration_files_missing_from_db.length}`);
}
if (Array.isArray(payload.migration_hash_mismatches) && payload.migration_hash_mismatches.length > 0) {
  schemaBlockers.push(`migration_hash_mismatches:${payload.migration_hash_mismatches.length}`);
}
for (const b of blockers) {
  if (!schemaBlockers.includes(b)) schemaBlockers.push(b);
}

const pass = payload.db_status === 'DB_VERIFIED_LIVE' && schemaBlockers.length === 0;

const out = {
  schema_status: pass ? 'PASS_SCHEMA_VERIFIED' : 'FAILED_SCHEMA_BLOCKERS',
  db_status: payload.db_status || 'DB_FAILED',
  tables_checked: payload.tables_checked || 0,
  missing_tables: missingTables,
  missing_columns: missingColumns,
  missing_indexes: missingIndexes,
  missing_constraints: missingConstraints,
  rag_ready: Boolean(payload.rag_ready),
  content_governance_ready: Boolean(payload.content_governance_ready),
  app_ready: Boolean(payload.app_ready),
  blockers: schemaBlockers,
  migration_files_checked: payload.migration_files_checked || 0,
  migration_files_missing_from_db: payload.migration_files_missing_from_db || [],
  migration_hash_mismatches: payload.migration_hash_mismatches || [],
  optional_extensions: payload.optional_extensions || [],
};

console.log(JSON.stringify(out, null, 2));
process.exitCode = pass ? 0 : 1;
