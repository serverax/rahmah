/**
 * Islamic content ingestion controller.
 *
 * Decision-only module — no I/O, no DB write. The caller (a route handler or
 * an admin job) is responsible for persisting the decision and the audit
 * event. Keeping the controller pure makes it cheaply testable and reusable
 * by the (future) Rahma Control Engine.
 *
 * Statuses returned mirror the SQL CHECK enums in migration 004:
 *   draft, pending_review, approved, rejected, hidden, expired,
 *   needs_source, needs_sheikh_review, duplicate.
 */

import { createHash } from 'node:crypto';
import { isValidSourceType } from './rag-types.js';

const ALLOWED_DECISIONS = Object.freeze([
  'pending_review',
  'needs_source',
  'needs_sheikh_review',
  'duplicate',
  'rejected',
]);

function hashOf(text) {
  if (typeof text !== 'string') return null;
  const t = text.trim();
  if (t.length === 0) return null;
  return createHash('sha256').update(t).digest('hex');
}

export function isAllowedDecision(d) {
  return ALLOWED_DECISIONS.includes(d);
}

/**
 * Decide whether a candidate ingestion payload is acceptable.
 *
 * Returns:
 *   {
 *     decision: 'pending_review' | 'needs_source' | 'needs_sheikh_review' |
 *               'duplicate' | 'rejected',
 *     reason: string,
 *     content_hash: string | null,
 *     normalized: { source_type, title_ar, body_ar, source_reference, language }
 *   }
 *
 * Hard rules (Sprint 10):
 *   1. body_ar must be non-empty Arabic-text-ish (length ≥ 8 chars after trim).
 *   2. source_type must be one of the eight allowed values.
 *   3. If source_type ∈ {quran, hadith, fiqh_note, sheikh_answer} then a
 *      non-empty source_reference is REQUIRED — else `needs_source`.
 *   4. child_content scenarios MUST NOT request personal data — `rejected` if
 *      the body looks like a profile-data prompt (shallow keyword check).
 *   5. Any decision that lands non-`rejected` is `pending_review` by default.
 *      A scholar/admin moves it on via setVerificationStatus.
 *   6. existingHashes (optional) — if provided and content_hash matches, the
 *      decision is `duplicate`.
 */
export function decideIngestion(payload = {}, { existingHashes = null } = {}) {
  const body_ar = typeof payload.body_ar === 'string' ? payload.body_ar.trim() : '';
  const title_ar = typeof payload.title_ar === 'string' ? payload.title_ar.trim() : '';
  const source_type = typeof payload.source_type === 'string' ? payload.source_type : '';
  const source_reference = typeof payload.source_reference === 'string'
    ? payload.source_reference.trim()
    : '';
  const language = typeof payload.language === 'string' ? payload.language : 'ar';

  if (!isValidSourceType(source_type)) {
    return Object.freeze({
      decision: 'rejected',
      reason: 'invalid_source_type',
      content_hash: null,
      normalized: { source_type, title_ar, body_ar, source_reference, language },
    });
  }
  if (body_ar.length < 8) {
    return Object.freeze({
      decision: 'rejected',
      reason: 'empty_or_too_short_body',
      content_hash: null,
      normalized: { source_type, title_ar, body_ar, source_reference, language },
    });
  }

  // Child safety: shallow keyword check for personal-data prompts.
  if (source_type === 'child_content') {
    const forbiddenAr = [
      'رقم الجوال',
      'رقم الهاتف',
      'العنوان السكني',
      'كلمة المرور',
      'الموقع الجغرافي',
    ];
    for (const kw of forbiddenAr) {
      if (body_ar.includes(kw)) {
        return Object.freeze({
          decision: 'rejected',
          reason: 'child_content_asks_personal_data',
          content_hash: null,
          normalized: { source_type, title_ar, body_ar, source_reference, language },
        });
      }
    }
    // Shaming/harsh language guard (very shallow — full check is in
    // child-safety-policy module in Sprint 12).
    if (/(غبي|أحمق|سيء جداً|فاشل)/.test(body_ar)) {
      return Object.freeze({
        decision: 'rejected',
        reason: 'child_content_shaming_language',
        content_hash: null,
        normalized: { source_type, title_ar, body_ar, source_reference, language },
      });
    }
  }

  // Source-reference requirement for primary religious types.
  if (['quran', 'hadith', 'fiqh_note', 'sheikh_answer'].includes(source_type)) {
    if (source_reference.length === 0) {
      return Object.freeze({
        decision: 'needs_source',
        reason: 'missing_source_reference_for_religious_type',
        content_hash: null,
        normalized: { source_type, title_ar, body_ar, source_reference, language },
      });
    }
  }

  const content_hash = hashOf(`${source_type}|${title_ar}|${body_ar}|${source_reference}`);

  if (existingHashes && content_hash && existingHashes.has(content_hash)) {
    return Object.freeze({
      decision: 'duplicate',
      reason: 'duplicate_content_hash',
      content_hash,
      normalized: { source_type, title_ar, body_ar, source_reference, language },
    });
  }

  // fiqh_note + sheikh_answer always route through scholar review before
  // they can be approved for public RAG retrieval.
  if (source_type === 'fiqh_note' || source_type === 'sheikh_answer') {
    return Object.freeze({
      decision: 'needs_sheikh_review',
      reason: 'religious_review_required',
      content_hash,
      normalized: { source_type, title_ar, body_ar, source_reference, language },
    });
  }

  return Object.freeze({
    decision: 'pending_review',
    reason: 'queued_for_review',
    content_hash,
    normalized: { source_type, title_ar, body_ar, source_reference, language },
  });
}
