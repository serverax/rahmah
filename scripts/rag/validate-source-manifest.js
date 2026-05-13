#!/usr/bin/env node
/**
 * scripts/rag/validate-source-manifest.js — manifest dry-run validator.
 *
 * Usage:
 *   node scripts/rag/validate-source-manifest.js <path> [--dry-run] [--apply]
 *
 * Dry-run (default):
 *   - parses + validates schema
 *   - rejects fabricated "approved" entries lacking reviewer_email_hash
 *   - rejects empty source_reference
 *   - rejects non-Arabic body_ar
 *   - reports duplicate content hashes
 *   - writes nothing
 *
 * Apply mode:
 *   - REFUSED unless DATABASE_URL is set
 *   - even then, only inserts rows with verification_status='pending_review'
 *   - never auto-approves
 *
 * Never echoes secrets. Never prints DATABASE_URL.
 */

import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const SOURCE_TYPES = new Set([
  'quran','hadith','dua','azkar','seerah','fiqh_note','sheikh_answer','child_content',
]);
const VERIFICATION_STATUSES = new Set(['unverified','pending_review','approved','rejected']);
const LICENSE_STATUSES = new Set(['public_domain','permitted','unknown','restricted']);

function hasArabic(s) { return typeof s === 'string' && /[ء-ي]/.test(s); }
function hash(s) { return createHash('sha256').update(s).digest('hex'); }

function validateItem(it, ctx) {
  const errs = [];
  if (!it || typeof it !== 'object') return ['item is not an object'];
  if (!SOURCE_TYPES.has(it.source_type)) errs.push(`invalid source_type: ${it.source_type}`);
  if (typeof it.source_name_ar !== 'string' || it.source_name_ar.trim().length === 0)
    errs.push('missing source_name_ar');
  if (typeof it.source_reference !== 'string' || it.source_reference.trim().length === 0)
    errs.push('missing source_reference');
  if (typeof it.title_ar !== 'string' || it.title_ar.trim().length === 0)
    errs.push('missing title_ar');
  if (typeof it.body_ar !== 'string' || it.body_ar.trim().length === 0)
    errs.push('missing body_ar');
  if (it.body_ar && !hasArabic(it.body_ar))
    errs.push('body_ar must contain Arabic characters');
  if (typeof it.language === 'string' && it.language !== 'ar')
    errs.push(`language must be 'ar' (got '${it.language}')`);
  if (!VERIFICATION_STATUSES.has(it.verification_status))
    errs.push(`invalid verification_status: ${it.verification_status}`);
  if (it.license_status && !LICENSE_STATUSES.has(it.license_status))
    errs.push(`invalid license_status: ${it.license_status}`);

  // Hard rule: approved requires reviewer.
  if (it.verification_status === 'approved') {
    if (typeof it.reviewer_email_hash !== 'string' || it.reviewer_email_hash.length !== 64) {
      errs.push('approved item missing valid reviewer_email_hash (sha-256 hex)');
    }
  }

  // Duplicate detection.
  const h = hash(`${it.source_type}|${(it.title_ar||'').trim()}|${(it.source_reference||'').trim()}`);
  if (ctx.seenHashes.has(h)) errs.push('duplicate content (same source_type + title_ar + source_reference)');
  else ctx.seenHashes.add(h);

  return errs;
}

async function main() {
  const argv = process.argv.slice(2);
  const file = argv[0];
  const apply = argv.includes('--apply');
  // --dry-run is the default; explicit flag is accepted.
  if (!file) {
    console.error('usage: node scripts/rag/validate-source-manifest.js <path> [--dry-run|--apply]');
    process.exit(2);
  }
  let text;
  try { text = await fs.readFile(file, 'utf8'); }
  catch { console.error(`cannot read ${file}`); process.exit(2); }
  let obj;
  try { obj = JSON.parse(text); }
  catch { console.error('manifest is not valid JSON'); process.exit(2); }
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.items)) {
    console.error('manifest missing "items" array');
    process.exit(2);
  }
  const ctx = { seenHashes: new Set() };
  const report = { total: obj.items.length, valid: 0, invalid: 0, would_create: 0, errors: [] };
  for (let i = 0; i < obj.items.length; i++) {
    const errs = validateItem(obj.items[i], ctx);
    if (errs.length === 0) {
      report.valid++;
      report.would_create++;
    } else {
      report.invalid++;
      report.errors.push({ index: i, errors: errs });
    }
  }
  if (apply) {
    if (!process.env.DATABASE_URL) {
      console.error('[validate] --apply refused: DATABASE_URL not set');
      console.log(JSON.stringify({ mode: 'apply_refused', reason: 'DATABASE_URL_not_set', ...report }, null, 2));
      process.exit(3);
    }
    console.error('[validate] --apply NOT IMPLEMENTED in this dry-run-only script. Use scripts/rag/ingest-source-manifest.js after a real DB is configured.');
    process.exit(3);
  }
  console.log(JSON.stringify({ mode: 'dry_run', ...report }, null, 2));
  if (report.invalid > 0) process.exitCode = 1;
}

main().catch(() => { process.exitCode = 1; });
