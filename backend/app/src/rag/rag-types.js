/**
 * Islamic RAG — types and enum contracts.
 *
 * Each constant here is the single source of truth for an allowed enum.
 * Migration 004 mirrors these enums in SQL CHECK constraints.
 */

export const SOURCE_TYPES = Object.freeze([
  'quran',
  'hadith',
  'dua',
  'azkar',
  'seerah',
  'fiqh_note',
  'sheikh_answer',
  'child_content',
]);

export const VERIFICATION_STATUSES = Object.freeze([
  'unverified',
  'pending_review',
  'approved',
  'rejected',
]);

export const INGESTION_JOB_TYPES = Object.freeze([
  'register_source',
  'ingest_documents',
  'rechunk',
  'reembed',
  'reverify',
]);

export const INGESTION_JOB_STATUSES = Object.freeze([
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
]);

export const RAG_MODES = Object.freeze([
  'mock',         // tests / dev only
  'foundation',   // schema present, no DB connection
  'database',     // DB connected, no vector index
  'vector',       // DB + vector index
]);

export function isValidSourceType(s) {
  return SOURCE_TYPES.includes(s);
}
export function isValidVerificationStatus(s) {
  return VERIFICATION_STATUSES.includes(s);
}
