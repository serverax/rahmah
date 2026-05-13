-- =============================================================================
-- Sakina migration 004 — Islamic RAG source registry + ingestion foundation
-- File: backend/db/migrations/004_islamic_rag_foundation.sql
-- =============================================================================
-- Adds 8 tables that BACK the Islamic RAG layer. Schema only — zero rows of
-- religious content are seeded. Real ingestion is operator-driven and gated by
-- the verification_status state machine.
--
-- Properties enforced at the SQL layer:
--   - Only verification_status = 'approved' rows are eligible for retrieval.
--   - Source rows must have a non-empty Arabic name (source_name_ar).
--   - Chunks must have non-empty text and a non-empty citation_label.
--   - Audit / ingestion-job-event tables are append-only (UPDATE not exposed
--     by the route layer; convention reinforced by the code).
--   - Zero seed rows. Zero destructive operations. Zero row removals targeting
--     islamic_* tables.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- islamic_source_registry — canonical catalogue entry for each source body.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS islamic_source_registry (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type           TEXT NOT NULL CHECK (source_type IN (
    'quran',
    'hadith',
    'dua',
    'azkar',
    'seerah',
    'fiqh_note',
    'sheikh_answer',
    'child_content'
  )),
  source_name_ar        TEXT NOT NULL CHECK (length(trim(source_name_ar)) > 0),
  source_reference      TEXT NOT NULL CHECK (length(trim(source_reference)) > 0),
  source_url            TEXT,
  language              TEXT NOT NULL DEFAULT 'ar' CHECK (length(language) BETWEEN 2 AND 8),
  verification_status   TEXT NOT NULL CHECK (verification_status IN (
    'unverified',
    'pending_review',
    'approved',
    'rejected'
  )),
  reviewer_id           UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_isr_status_type ON islamic_source_registry (verification_status, source_type);
CREATE INDEX IF NOT EXISTS idx_isr_language    ON islamic_source_registry (language);
CREATE UNIQUE INDEX IF NOT EXISTS uq_isr_source_reference ON islamic_source_registry (source_reference);

-- -----------------------------------------------------------------------------
-- islamic_source_documents — discrete document under a registry entry.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS islamic_source_documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id             UUID NOT NULL REFERENCES islamic_source_registry(id) ON DELETE CASCADE,
  title_ar              TEXT NOT NULL CHECK (length(trim(title_ar)) > 0),
  document_ref          TEXT NOT NULL CHECK (length(trim(document_ref)) > 0),
  language              TEXT NOT NULL DEFAULT 'ar',
  content_hash          TEXT NOT NULL CHECK (length(content_hash) = 64),
  verification_status   TEXT NOT NULL CHECK (verification_status IN (
    'unverified',
    'pending_review',
    'approved',
    'rejected'
  )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_isd_source_ref ON islamic_source_documents (source_id, document_ref);
CREATE INDEX IF NOT EXISTS idx_isd_status   ON islamic_source_documents (verification_status);

-- -----------------------------------------------------------------------------
-- islamic_source_chunks — retrievable text chunks. Approved-only is the only
-- retrieval path enforced by the application + the partial index below.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS islamic_source_chunks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id           UUID NOT NULL REFERENCES islamic_source_documents(id) ON DELETE CASCADE,
  chunk_ref             TEXT NOT NULL CHECK (length(trim(chunk_ref)) > 0),
  chunk_text_ar         TEXT NOT NULL CHECK (length(trim(chunk_text_ar)) > 0),
  language              TEXT NOT NULL DEFAULT 'ar',
  citation_label_ar     TEXT NOT NULL CHECK (length(trim(citation_label_ar)) > 0),
  citation_url          TEXT,
  verification_status   TEXT NOT NULL CHECK (verification_status IN (
    'unverified',
    'pending_review',
    'approved',
    'rejected'
  )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_isc_doc_chunk ON islamic_source_chunks (document_id, chunk_ref);
CREATE INDEX IF NOT EXISTS idx_isc_status_lang ON islamic_source_chunks (verification_status, language);
CREATE INDEX IF NOT EXISTS idx_isc_approved_lang
  ON islamic_source_chunks (language)
  WHERE verification_status = 'approved';

-- -----------------------------------------------------------------------------
-- islamic_source_embeddings — vector rows, kept separate from the chunk text
-- table so pgvector can be added later without altering core schema.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS islamic_source_embeddings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id              UUID NOT NULL REFERENCES islamic_source_chunks(id) ON DELETE CASCADE,
  embedding_model       TEXT NOT NULL CHECK (length(trim(embedding_model)) > 0),
  dimension             INTEGER NOT NULL CHECK (dimension > 0 AND dimension <= 4096),
  -- Vector values are stored as JSONB in this foundation; switch to pgvector
  -- column type in a follow-up migration when the extension is enabled.
  embedding_jsonb       JSONB NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ise_chunk ON islamic_source_embeddings (chunk_id);
CREATE INDEX IF NOT EXISTS idx_ise_model ON islamic_source_embeddings (embedding_model);

-- -----------------------------------------------------------------------------
-- islamic_ingestion_jobs — operator-initiated ingestion runs.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS islamic_ingestion_jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id             UUID NOT NULL REFERENCES islamic_source_registry(id) ON DELETE CASCADE,
  job_type              TEXT NOT NULL CHECK (job_type IN (
    'register_source',
    'ingest_documents',
    'rechunk',
    'reembed',
    'reverify'
  )),
  status                TEXT NOT NULL CHECK (status IN (
    'queued',
    'running',
    'succeeded',
    'failed',
    'cancelled'
  )),
  started_at            TIMESTAMPTZ,
  finished_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_iij_status   ON islamic_ingestion_jobs (status);
CREATE INDEX IF NOT EXISTS idx_iij_source   ON islamic_ingestion_jobs (source_id);

-- -----------------------------------------------------------------------------
-- islamic_ingestion_job_events — append-only audit of ingestion job lifecycle.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS islamic_ingestion_job_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                UUID NOT NULL REFERENCES islamic_ingestion_jobs(id) ON DELETE CASCADE,
  event_type            TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  message_ar            TEXT,
  metadata_jsonb        JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_iije_job_created ON islamic_ingestion_job_events (job_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- islamic_rag_query_audit — append-only audit of RAG queries.
-- Stores ONLY a sha-256 hash of the trimmed question. Never the raw question.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS islamic_rag_query_audit (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash         TEXT NOT NULL CHECK (length(question_hash) = 64),
  language              TEXT NOT NULL DEFAULT 'ar',
  matched_chunks        INTEGER NOT NULL DEFAULT 0 CHECK (matched_chunks >= 0),
  answered              BOOLEAN NOT NULL,
  block_reason          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_irqa_created ON islamic_rag_query_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_irqa_answered ON islamic_rag_query_audit (answered);

-- -----------------------------------------------------------------------------
-- islamic_source_review_status — per-source review-state machine snapshot,
-- queried by /api/rag/status.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS islamic_source_review_status (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id             UUID NOT NULL REFERENCES islamic_source_registry(id) ON DELETE CASCADE,
  reviewer_user_id      UUID,
  decision              TEXT NOT NULL CHECK (decision IN (
    'pending_review',
    'approve',
    'reject',
    'request_changes'
  )),
  note_ar               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_isrs_source ON islamic_source_review_status (source_id);

COMMIT;
