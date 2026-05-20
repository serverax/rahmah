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
const INTERNAL_QA_FILE = path.join(REPO_ROOT, 'data', 'islamic-sources', 'internal-reviewed-starter-qa.json');
const require = createRequire(path.resolve(REPO_ROOT, 'backend', 'app', 'package.json'));
const { Pool } = require('pg');

function sha256(text) {
  return createHash('sha256').update(String(text || '')).digest('hex');
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === 'yes') return true;
    if (v === 'false' || v === 'no') return false;
  }
  return fallback;
}

function isTrue(value) {
  return value === true || String(value || '').trim().toLowerCase() === 'true';
}

function toContentType(value) {
  const t = String(value || '').toLowerCase();
  if (t.includes('quran')) return 'quran';
  if (t.includes('hadith')) return 'hadith';
  if (t.includes('prayer')) return 'prayer';
  if (t.includes('hijri') || t.includes('qibla')) return 'prayer';
  if (t.includes('dua')) return 'dua';
  if (t.includes('children')) return 'children';
  if (t.includes('fiqh')) return 'fiqh';
  return 'library';
}

function isSafeApprovedCandidate(candidate) {
  return Boolean(
    candidate
    && candidate.source_id === 'tanzil-quran-text'
    && normalizeStatus(candidate.approval_status) === 'approved_for_review'
    && normalizeStatus(candidate.licence_status) === 'approved'
    && isTrue(candidate.attribution_required)
    && isTrue(candidate.offline_storage_allowed)
    && isTrue(candidate.commercial_use_allowed)
    && String(candidate.authenticity_level || '').trim().length > 0
  );
}

async function loadCandidates() {
  const raw = await fs.readFile(CANDIDATES_FILE, 'utf8');
  const json = JSON.parse(raw);
  return Array.isArray(json.candidates) ? json.candidates : [];
}

async function main() {
  const out = {
    ok: false,
    mode: 'seed_sources',
    inserted_or_updated: 0,
    approved_sources: [],
    blocked_sources: [],
    blockers: [],
    registry_file: CANDIDATES_FILE,
  };

  const dsn = process.env.DATABASE_URL;
  if (!dsn) {
    out.blockers.push('DATABASE_URL is missing or test DB unavailable');
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 1;
    return;
  }

  let pool;
  try {
    pool = new Pool({
      connectionString: dsn,
      max: 2,
      connectionTimeoutMillis: 5_000,
      options: '-c client_encoding=UTF8',
    });
    await pool.query('SELECT 1');
  } catch {
    out.blockers.push('Database connection failed');
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 1;
    return;
  }

  try {
    const candidates = await loadCandidates();
    const quranJson = JSON.parse(await fs.readFile(QURAN_FILE, 'utf8'));
    const internalQaJson = JSON.parse(await fs.readFile(INTERNAL_QA_FILE, 'utf8'));
    const quranHash = sha256(JSON.stringify(quranJson));
    const internalQaHash = sha256(JSON.stringify(internalQaJson));
    const now = new Date().toISOString();

    candidates.push({
      source_id: internalQaJson.source_id,
      title: 'Rahma Internal Reviewed Starter Q&A',
      provider: internalQaJson.provider,
      url: 'internal://rahma/reviewed-starter-qa',
      content_type: 'children',
      language: 'ar',
      licence_status: 'approved',
      attribution_required: true,
      offline_storage_allowed: true,
      commercial_use_allowed: true,
      authenticity_level: internalQaJson.authenticity_level,
      approval_status: 'APPROVED_FOR_REVIEW',
      notes: 'Internally written basic Islamic learning entries; review-approved for starter RAG only.',
      local_reference: 'data/islamic-sources/internal-reviewed-starter-qa.json',
      version: internalQaJson.content_version,
      content_hash: internalQaHash,
    });

    await pool.query('BEGIN');
    for (const candidate of candidates) {
      const sourceReference = candidate.source_id;
      const safeApproved = isSafeApprovedCandidate(candidate)
        || candidate.source_id === 'rahma-internal-reviewed-starter-qa';
      const titleAr = candidate.source_id === 'tanzil-quran-text'
        ? 'نص القرآن من تنزيل'
        : candidate.source_id === 'rahma-internal-reviewed-starter-qa'
          ? 'أسئلة وأجوبة تعليمية معتمدة من رحمة'
          : String(candidate.title || candidate.name || '').trim();
      const titleEn = String(candidate.title || candidate.name || '').trim();
      const sourceType = toContentType(candidate.content_type || candidate.provider_type || candidate.source_id);
      const localReference = candidate.source_id === 'tanzil-quran-text'
        ? 'data/islamic-sources/quran-full-tanzil.json'
        : String(candidate.local_reference || candidate.url || '').trim();
      const contentHash = candidate.source_id === 'tanzil-quran-text'
        ? quranHash
        : candidate.content_hash
          ? String(candidate.content_hash)
          : sha256(JSON.stringify(candidate));
      const blockedStatus = normalizeStatus(candidate.approval_status).startsWith('blocked')
        || normalizeStatus(candidate.approval_status) === 'blocked_do_not_use';
      const reviewStatus = safeApproved
        ? 'approved'
        : blockedStatus
          ? 'rejected'
          : 'pending_review';

      const row = await pool.query(
        `
        INSERT INTO content_sources (
          source_id, source_type, source_name_ar, source_name_en, source_reference, source_url, language,
          license_status, source_approved, approved_by_user_id, approved_at, notes,
          title_ar, title_en, provider_name, official_url, local_reference, author_or_compiler,
          madhhab, trust_level, authenticity_level, attribution_required, offline_storage_allowed,
          commercial_use_allowed, content_hash, version, approved_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, NULL, $10, $11,
          $12, $13, $14, $15, $16, $17,
          NULL, $18, $19, $20, $21,
          $22, $23, $24, $25
        )
        ON CONFLICT (source_reference) DO UPDATE SET
          source_id = EXCLUDED.source_id,
          source_type = EXCLUDED.source_type,
          source_name_ar = EXCLUDED.source_name_ar,
          source_name_en = EXCLUDED.source_name_en,
          source_url = EXCLUDED.source_url,
          language = EXCLUDED.language,
          license_status = EXCLUDED.license_status,
          source_approved = EXCLUDED.source_approved,
          approved_at = EXCLUDED.approved_at,
          notes = EXCLUDED.notes,
          title_ar = EXCLUDED.title_ar,
          title_en = EXCLUDED.title_en,
          provider_name = EXCLUDED.provider_name,
          official_url = EXCLUDED.official_url,
          local_reference = EXCLUDED.local_reference,
          author_or_compiler = EXCLUDED.author_or_compiler,
          trust_level = EXCLUDED.trust_level,
          authenticity_level = EXCLUDED.authenticity_level,
          attribution_required = EXCLUDED.attribution_required,
          offline_storage_allowed = EXCLUDED.offline_storage_allowed,
          commercial_use_allowed = EXCLUDED.commercial_use_allowed,
          content_hash = EXCLUDED.content_hash,
          version = EXCLUDED.version,
          approved_by = EXCLUDED.approved_by,
          updated_at = NOW()
        RETURNING id, source_id, source_reference, source_approved
        `,
        [
          sourceReference,
          sourceType,
          titleAr || titleEn || sourceReference,
          titleEn || titleAr || sourceReference,
          sourceReference,
          candidate.url || null,
          candidate.language || 'ar',
          candidate.licence_status || 'unknown',
          safeApproved,
          safeApproved ? now : null,
          candidate.notes || null,
          titleAr || titleEn || sourceReference,
          titleEn || titleAr || sourceReference,
          candidate.provider || candidate.name || null,
          candidate.url || null,
          localReference,
          candidate.provider || candidate.name || null,
          safeApproved ? 'approved_starter' : (candidate.authenticity_level || 'unknown'),
          candidate.authenticity_level || 'unknown',
          toBoolean(candidate.attribution_required, false),
          toBoolean(candidate.offline_storage_allowed, false),
          toBoolean(candidate.commercial_use_allowed, false),
          contentHash,
          candidate.version || quranJson.content_version || 'source-candidate-v1',
          safeApproved ? 'rahma-source-review' : null,
        ],
      );
      out.inserted_or_updated += row.rowCount > 0 ? 1 : 0;

      const sourceId = row.rows[0].id;
      await pool.query(
        `
        INSERT INTO source_licenses (
          source_id, license_name, license_status, license_url, evidence_json,
          reviewed_by_user_id, reviewed_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, NULL, $6)
        ON CONFLICT (source_id) DO UPDATE SET
          license_name = EXCLUDED.license_name,
          license_status = EXCLUDED.license_status,
          license_url = EXCLUDED.license_url,
          evidence_json = EXCLUDED.evidence_json,
          reviewed_at = EXCLUDED.reviewed_at,
          updated_at = NOW()
        `,
        [
          sourceId,
          candidate.title || sourceReference,
          candidate.licence_status || 'unknown',
          candidate.url || null,
          JSON.stringify([{ source: candidate.url || null, notes: candidate.notes || null }]),
          safeApproved ? now : null,
        ],
      );

      await pool.query(
        `
        INSERT INTO source_approvals (
          source_id, reviewer_user_id, approval_status, reason, evidence_json, approved_at
        )
        VALUES ($1, NULL, $2, $3, $4::jsonb, $5)
        ON CONFLICT (source_id) DO UPDATE SET
          approval_status = EXCLUDED.approval_status,
          reason = EXCLUDED.reason,
          evidence_json = EXCLUDED.evidence_json,
          approved_at = EXCLUDED.approved_at,
          updated_at = NOW()
        `,
        [
          sourceId,
          reviewStatus,
          candidate.notes || null,
          JSON.stringify([{ source: candidate.url || null, notes: candidate.notes || null }]),
          safeApproved ? now : null,
        ],
      );

      if (safeApproved) {
        out.approved_sources.push({ source_id: sourceReference, content_hash: contentHash });
      } else if (blockedStatus || ['dorar-hadith', 'ummahapi'].includes(sourceReference)) {
        out.blocked_sources.push({ source_id: sourceReference, reason: candidate.notes || 'blocked_or_uncertain' });
      }
    }

    await pool.query('COMMIT');
    out.ok = true;
    out.generated_at = now;
    console.log(JSON.stringify(out, null, 2));
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    out.blockers.push(String(error?.message || error));
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main();
