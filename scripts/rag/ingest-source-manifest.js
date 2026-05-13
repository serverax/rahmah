#!/usr/bin/env node
/**
 * scripts/rag/ingest-source-manifest.js — operator-driven ingestion.
 *
 * REFUSES to run without DATABASE_URL.
 * REFUSES to insert rows with verification_status='approved'.
 * Every inserted row starts as 'pending_review' regardless of what the
 * manifest claimed — promotion to approved is a separate reviewer action.
 *
 * Never echoes DATABASE_URL.
 */

import fs from 'node:fs/promises';
import pg from 'pg';
import { createHash } from 'node:crypto';

function hash(s) { return createHash('sha256').update(s).digest('hex'); }

async function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: node scripts/rag/ingest-source-manifest.js <path>'); process.exit(2); }
  if (!process.env.DATABASE_URL) {
    console.error('[ingest] DATABASE_URL not set — refusing to run');
    process.exit(2);
  }
  const text = await fs.readFile(file, 'utf8');
  const obj = JSON.parse(text);
  if (!obj || !Array.isArray(obj.items)) { console.error('[ingest] manifest missing "items" array'); process.exit(2); }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 5_000 });
  let inserted = 0, skipped = 0, errors = 0;
  try {
    for (const it of obj.items) {
      // Always pending_review regardless of manifest claim.
      const sql = `
        INSERT INTO islamic_source_registry
          (source_type, source_name_ar, source_reference, source_url, language, verification_status)
        VALUES ($1, $2, $3, $4, $5, 'pending_review')
        ON CONFLICT (source_reference) DO NOTHING
        RETURNING id
      `;
      try {
        const r = await pool.query(sql, [
          it.source_type,
          String(it.source_name_ar || '').trim(),
          String(it.source_reference || '').trim(),
          it.source_url || null,
          (it.language || 'ar'),
        ]);
        if (r.rows && r.rows[0]) inserted++; else skipped++;
      } catch {
        errors++;
      }
    }
  } finally {
    await pool.end().catch(() => {});
  }
  console.log(JSON.stringify({ inserted, skipped, errors, content_hash_seed: hash(text).slice(0, 16) }));
  if (errors > 0) process.exitCode = 1;
}
main().catch(() => { process.exitCode = 1; });
