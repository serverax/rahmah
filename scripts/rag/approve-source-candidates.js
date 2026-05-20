#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CANDIDATES_FILE = path.join(REPO_ROOT, 'data', 'source-candidates', 'islamic-source-candidates.json');
const QURAN_FILE = path.join(REPO_ROOT, 'data', 'islamic-sources', 'quran-full-tanzil.json');
const require = createRequire(path.resolve(REPO_ROOT, 'backend', 'app', 'package.json'));
const { Pool } = require('pg');

function sha256(text) {
  return createHash('sha256').update(String(text || '')).digest('hex');
}

async function loadCandidate(sourceId) {
  const raw = JSON.parse(await fs.readFile(CANDIDATES_FILE, 'utf8'));
  const candidates = Array.isArray(raw.candidates) ? raw.candidates : [];
  return candidates.find((c) => c.source_id === sourceId) || null;
}

async function main() {
  const out = {
    ok: false,
    approved: [],
    skipped: [],
    blockers: [],
  };

  const dsn = process.env.DATABASE_URL;
  if (!dsn) {
    out.blockers.push('DATABASE_URL is missing or test DB unavailable');
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    connectionString: dsn,
    max: 2,
    connectionTimeoutMillis: 5_000,
    options: '-c client_encoding=UTF8',
  });
  try {
    await pool.query('SELECT 1');
    const approvalTargets = [
      {
        source_id: 'tanzil-quran-text',
        reviewer: 'rahma-source-review',
        approvedAt: true,
        hash: sha256(await fs.readFile(QURAN_FILE, 'utf8')),
      },
      {
        source_id: 'aladhan-api',
        reviewer: 'rahma-source-review',
        approvedAt: false,
      },
    ];

    for (const target of approvalTargets) {
      const candidate = await loadCandidate(target.source_id);
      if (!candidate) {
        out.skipped.push({ source_id: target.source_id, reason: 'candidate_missing' });
        continue;
      }
      if (String(candidate.approval_status).toLowerCase() !== 'approved_for_review') {
        out.skipped.push({ source_id: target.source_id, reason: 'not_approved_for_review' });
        continue;
      }
      if (String(candidate.licence_status).toLowerCase() !== 'approved') {
        out.skipped.push({ source_id: target.source_id, reason: 'licence_not_approved' });
        continue;
      }

      const sourceRow = await pool.query(
        `
        UPDATE content_sources
        SET
          source_approved = TRUE,
          approved_by = $2,
          approved_at = NOW(),
          content_hash = COALESCE($3, content_hash),
          updated_at = NOW()
        WHERE source_reference = $1
          AND license_status = 'approved'
        RETURNING id, source_reference, source_approved, approved_at
        `,
        [target.source_id, target.reviewer, target.hash || null],
      );

      if (sourceRow.rowCount === 0) {
        out.skipped.push({ source_id: target.source_id, reason: 'not_found_or_license_mismatch' });
        continue;
      }

      await pool.query(
        `
        UPDATE source_approvals
        SET approval_status = 'approved',
            reason = 'approved_for_live_starter_sources',
            approved_at = NOW(),
            updated_at = NOW()
        WHERE source_id = $1
        `,
        [sourceRow.rows[0].id],
      );

      await pool.query(
        `
        UPDATE source_licenses
        SET license_status = 'approved',
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE source_id = $1
        `,
        [sourceRow.rows[0].id],
      );

      out.approved.push({
        source_id: target.source_id,
        source_reference: sourceRow.rows[0].source_reference,
        approved_at: sourceRow.rows[0].approved_at,
      });
    }

    if (out.approved.length === 0) {
      out.blockers.push('no_sources_approved');
      console.log(JSON.stringify(out, null, 2));
      process.exitCode = 1;
      return;
    }

    out.ok = true;
    console.log(JSON.stringify(out, null, 2));
  } catch (error) {
    out.blockers.push(String(error?.message || error));
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main();
