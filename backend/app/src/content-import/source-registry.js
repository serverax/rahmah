/**
 * content-import — source-registry safety checks.
 *
 * Pure functions. NO file system. NO network. NO database. The host calls
 * these to validate a candidate source-metadata record before it enters
 * the ingestion pipeline.
 *
 * Contract:
 *   - every record MUST carry source_type, source_name_ar, source_reference,
 *     license_id, language, content_hash (sha-256 hex).
 *   - source_type MUST be one of the controlled enum (mirrored from
 *     migration 004's CHECK constraint).
 *   - verification_status MUST be one of: unverified, pending_review,
 *     approved, rejected. Inbound rows MUST NOT arrive as `approved` —
 *     approval flips happen via a separate operator-side flow.
 *   - license_id MUST be a non-empty string that maps to a file under
 *     data/islamic-sources/licenses/ (presence check is done by the host;
 *     this module only validates shape).
 *   - content_hash MUST be 64 hex characters (sha-256).
 */

export const ALLOWED_SOURCE_TYPES = Object.freeze([
  'quran',
  'hadith',
  'dua',
  'azkar',
  'seerah',
  'fiqh_note',
  'sheikh_answer',
  'child_content',
]);

export const ALLOWED_VERIFICATION_STATUSES_INBOUND = Object.freeze([
  'unverified',
  'pending_review',
  'rejected',
]);

const HEX64 = /^[a-f0-9]{64}$/i;

export function validateSourceRecord(record) {
  if (!record || typeof record !== 'object') {
    return { ok: false, reason: 'invalid_record', field: null };
  }
  if (typeof record.source_type !== 'string' || !ALLOWED_SOURCE_TYPES.includes(record.source_type)) {
    return { ok: false, reason: 'invalid_source_type', field: 'source_type' };
  }
  if (typeof record.source_name_ar !== 'string' || record.source_name_ar.trim().length === 0) {
    return { ok: false, reason: 'missing_source_name_ar', field: 'source_name_ar' };
  }
  if (typeof record.source_reference !== 'string' || record.source_reference.trim().length === 0) {
    return { ok: false, reason: 'missing_source_reference', field: 'source_reference' };
  }
  if (typeof record.license_id !== 'string' || record.license_id.trim().length === 0) {
    return { ok: false, reason: 'missing_license_id', field: 'license_id' };
  }
  if (typeof record.language !== 'string' || record.language.trim().length === 0) {
    return { ok: false, reason: 'missing_language', field: 'language' };
  }
  if (typeof record.content_hash !== 'string' || !HEX64.test(record.content_hash)) {
    return { ok: false, reason: 'invalid_content_hash', field: 'content_hash' };
  }
  if (typeof record.verification_status !== 'string'
      || !ALLOWED_VERIFICATION_STATUSES_INBOUND.includes(record.verification_status)) {
    return { ok: false, reason: 'invalid_inbound_verification_status', field: 'verification_status' };
  }
  // Hadith items must carry an authenticity grading.
  if (record.source_type === 'hadith') {
    if (typeof record.authenticity_note_ar !== 'string' || record.authenticity_note_ar.trim().length === 0) {
      return { ok: false, reason: 'missing_authenticity_note_ar', field: 'authenticity_note_ar' };
    }
  }
  return { ok: true, reason: null, field: null };
}
