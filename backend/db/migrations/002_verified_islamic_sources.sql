-- =============================================================================
-- Sakina migration 002 — verified Islamic source registry foundation
-- File: backend/db/migrations/002_verified_islamic_sources.sql
-- =============================================================================
-- Adds four tables that BACK the verified-source contract for /api/ibadat/ask.
-- This migration does NOT ingest Islamic content. It does NOT seed any
-- Quran, Hadith, fiqh, fatwa, or scholar text. All ingestion is scope of a
-- later sprint with explicit licensing review.
--
-- Integrity guarantee (enforced in code by safety/citation-validator.js and
-- by the SQL CHECK constraints below):
--   - Only chunks with verification_status = 'approved' are eligible for
--     retrieval.
--   - chunk_text must be non-empty and trimmed.
--   - Every chunk MUST have a non-empty citation_label.
--
-- This migration is idempotent (IF NOT EXISTS guards) and intentionally
-- contains zero rows of Islamic content.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()

-- -----------------------------------------------------------------------------
-- sakina_verified_sources — catalogue of source bodies (collections, books).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sakina_verified_sources (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type           TEXT NOT NULL CHECK (source_type IN (
    'quran',
    'hadith_collection',
    'fiqh_reference',
    'fatwa_body',
    'scholar_reference',
    'dua_collection'
  )),
  title                 TEXT NOT NULL CHECK (length(trim(title)) > 0),
  language              TEXT NOT NULL,
  authority_level       TEXT NOT NULL CHECK (authority_level IN (
    'primary',
    'recognised',
    'review_required'
  )),
  publisher             TEXT,
  url                   TEXT,
  license_status        TEXT NOT NULL CHECK (license_status IN (
    'public_domain',
    'permitted',
    'unknown',
    'restricted'
  )),
  verification_status   TEXT NOT NULL CHECK (verification_status IN (
    'approved',
    'pending',
    'rejected'
  )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_svs_status_type ON sakina_verified_sources (verification_status, source_type);
CREATE INDEX IF NOT EXISTS idx_svs_language    ON sakina_verified_sources (language);

-- -----------------------------------------------------------------------------
-- sakina_source_documents — discrete documents within a source.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sakina_source_documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id             UUID NOT NULL REFERENCES sakina_verified_sources(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL CHECK (length(trim(title)) > 0),
  document_ref          TEXT NOT NULL CHECK (length(trim(document_ref)) > 0),
  language              TEXT NOT NULL,
  content_hash          TEXT NOT NULL CHECK (length(content_hash) = 64),  -- sha256 hex
  verification_status   TEXT NOT NULL CHECK (verification_status IN (
    'approved',
    'pending',
    'rejected'
  )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ssd_source_ref ON sakina_source_documents (source_id, document_ref);
CREATE INDEX IF NOT EXISTS idx_ssd_status   ON sakina_source_documents (verification_status);
CREATE INDEX IF NOT EXISTS idx_ssd_language ON sakina_source_documents (language);

-- -----------------------------------------------------------------------------
-- sakina_source_chunks — retrievable text chunks. Only `approved` rows are
-- eligible for retrieval by the application (see citation-validator).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sakina_source_chunks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id           UUID NOT NULL REFERENCES sakina_source_documents(id) ON DELETE CASCADE,
  chunk_ref             TEXT NOT NULL CHECK (length(trim(chunk_ref)) > 0),
  chunk_text            TEXT NOT NULL CHECK (length(trim(chunk_text)) > 0),
  language              TEXT NOT NULL,
  citation_label        TEXT NOT NULL CHECK (length(trim(citation_label)) > 0),
  citation_url          TEXT,
  verification_status   TEXT NOT NULL CHECK (verification_status IN (
    'approved',
    'pending',
    'rejected'
  )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ssc_document_chunk ON sakina_source_chunks (document_id, chunk_ref);
CREATE INDEX IF NOT EXISTS idx_ssc_status   ON sakina_source_chunks (verification_status);
CREATE INDEX IF NOT EXISTS idx_ssc_language ON sakina_source_chunks (language);
-- Partial index optimised for the only retrieval path: approved chunks only.
CREATE INDEX IF NOT EXISTS idx_ssc_approved_lang
  ON sakina_source_chunks (language)
  WHERE verification_status = 'approved';

-- -----------------------------------------------------------------------------
-- sakina_answer_audit — per-question audit row. Stores ONLY a hash of the
-- normalized question, never the raw text, never user identity.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sakina_answer_audit (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash         TEXT NOT NULL CHECK (length(question_hash) = 64),  -- sha256 hex
  scope                 TEXT NOT NULL,
  blocked               BOOLEAN NOT NULL,
  block_reason          TEXT,
  source_count          INTEGER NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saa_created  ON sakina_answer_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saa_blocked  ON sakina_answer_audit (blocked);

COMMIT;
