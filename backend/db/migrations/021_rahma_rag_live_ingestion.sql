-- =============================================================================
-- Rahma migration 021 — live approved Islamic source registry + RAG ingestion
-- =============================================================================
-- Adds the live tables used by the approved-source ingestion path:
--   - islamic_documents
--   - islamic_document_chunks
--   - citation_registry
--   - rag_ingestion_jobs
--   - rag_query_audit
--   - scholar_review_queue
--
-- Also extends content_sources with the exact approval metadata fields needed
-- for the source approval registry.
--
-- Rules:
--   - No seed data.
--   - No secrets.
--   - source_approved=true is only allowed when licence is approved and
--     approval metadata is complete.
--   - citation rows must reference real source/document/chunk rows by FK.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS vector';
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- content_sources: extend existing registry with richer approval metadata.
-- -----------------------------------------------------------------------------
ALTER TABLE content_sources
  ADD COLUMN IF NOT EXISTS title_ar TEXT,
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS provider_name TEXT,
  ADD COLUMN IF NOT EXISTS official_url TEXT,
  ADD COLUMN IF NOT EXISTS local_reference TEXT,
  ADD COLUMN IF NOT EXISTS author_or_compiler TEXT,
  ADD COLUMN IF NOT EXISTS madhhab TEXT,
  ADD COLUMN IF NOT EXISTS trust_level TEXT,
  ADD COLUMN IF NOT EXISTS authenticity_level TEXT,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS attribution_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS offline_storage_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS commercial_use_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS version TEXT;

CREATE INDEX IF NOT EXISTS idx_content_sources_source_approved_live
  ON content_sources (source_approved, license_status);
CREATE INDEX IF NOT EXISTS idx_content_sources_content_hash_live
  ON content_sources (content_hash);

CREATE OR REPLACE FUNCTION enforce_content_source_approval_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_approved IS TRUE THEN
    IF NEW.license_status IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION 'source_approved requires approved license_status';
    END IF;
    IF NEW.content_hash IS NULL OR length(trim(NEW.content_hash)) <> 64 THEN
      RAISE EXCEPTION 'source_approved requires a 64-char content_hash';
    END IF;
    IF NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'source_approved requires approved_at';
    END IF;
    IF NEW.approved_by IS NULL OR length(trim(NEW.approved_by)) = 0 THEN
      RAISE EXCEPTION 'source_approved requires approved_by';
    END IF;
    IF NEW.trust_level IS NULL OR length(trim(NEW.trust_level)) = 0 THEN
      RAISE EXCEPTION 'source_approved requires trust_level';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_sources_approval_guard ON content_sources;
CREATE TRIGGER trg_content_sources_approval_guard
BEFORE INSERT OR UPDATE ON content_sources
FOR EACH ROW EXECUTE FUNCTION enforce_content_source_approval_guard();

-- -----------------------------------------------------------------------------
-- islamic_documents — canonical approved documents under a content source.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS islamic_documents (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id            UUID NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  title_ar             TEXT NOT NULL,
  title_en             TEXT,
  source_type          TEXT NOT NULL CHECK (source_type IN (
    'quran', 'hadith', 'dua', 'fiqh', 'article', 'children', 'prayer', 'qibla', 'hijri'
  )),
  provider_name        TEXT NOT NULL,
  official_url         TEXT,
  local_reference      TEXT,
  author_or_compiler    TEXT,
  madhhab              TEXT,
  language             TEXT NOT NULL DEFAULT 'ar',
  licence_status       TEXT NOT NULL DEFAULT 'pending' CHECK (licence_status IN ('pending', 'approved', 'rejected', 'restricted', 'unknown')),
  source_approved      BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by          TEXT,
  approved_by_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at          TIMESTAMPTZ,
  trust_level          TEXT NOT NULL DEFAULT 'unknown',
  authenticity_level   TEXT NOT NULL DEFAULT 'unknown',
  attribution_required BOOLEAN NOT NULL DEFAULT FALSE,
  offline_storage_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  commercial_use_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  content_hash         TEXT NOT NULL CHECK (length(content_hash) = 64),
  version              TEXT NOT NULL DEFAULT 'v1',
  notes                TEXT,
  approval_status      TEXT NOT NULL DEFAULT 'internal_review_required' CHECK (
    approval_status IN ('internal_review_required', 'pending_review', 'approved', 'rejected', 'blocked')
  ),
  effective_from       DATE,
  effective_to         DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_islamic_documents_source_hash ON islamic_documents (source_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_islamic_documents_source ON islamic_documents (source_id);
CREATE INDEX IF NOT EXISTS idx_islamic_documents_type_lang ON islamic_documents (source_type, language);
CREATE INDEX IF NOT EXISTS idx_islamic_documents_approved ON islamic_documents (source_approved, approval_status);

CREATE OR REPLACE FUNCTION enforce_islamic_document_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_approved IS TRUE THEN
    IF NEW.licence_status IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION 'approved islamic_documents requires approved licence_status';
    END IF;
    IF NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'approved islamic_documents requires approved_at';
    END IF;
    IF NEW.approved_by IS NULL OR length(trim(NEW.approved_by)) = 0 THEN
      RAISE EXCEPTION 'approved islamic_documents requires approved_by';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_islamic_documents_guard ON islamic_documents;
CREATE TRIGGER trg_islamic_documents_guard
BEFORE INSERT OR UPDATE ON islamic_documents
FOR EACH ROW EXECUTE FUNCTION enforce_islamic_document_guard();

-- -----------------------------------------------------------------------------
-- islamic_document_chunks — retrievable approved chunks.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS islamic_document_chunks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id          UUID NOT NULL REFERENCES islamic_documents(id) ON DELETE CASCADE,
  source_id            UUID NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  chunk_index          INTEGER NOT NULL CHECK (chunk_index >= 0),
  chunk_text           TEXT NOT NULL,
  normalized_text      TEXT,
  language             TEXT NOT NULL DEFAULT 'ar',
  content_type         TEXT NOT NULL DEFAULT 'quran',
  citation_label       TEXT NOT NULL,
  local_reference      TEXT,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  approval_status      TEXT NOT NULL DEFAULT 'internal_review_required' CHECK (
    approval_status IN ('internal_review_required', 'pending_review', 'approved', 'rejected', 'blocked')
  ),
  embedding_model      TEXT,
  embedding_jsonb      JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_hash         TEXT NOT NULL CHECK (length(content_hash) = 64),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, chunk_index),
  UNIQUE (content_hash)
);
CREATE INDEX IF NOT EXISTS idx_islamic_document_chunks_document ON islamic_document_chunks (document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_islamic_document_chunks_source ON islamic_document_chunks (source_id);
CREATE INDEX IF NOT EXISTS idx_islamic_document_chunks_approved ON islamic_document_chunks (approved, approval_status);
CREATE INDEX IF NOT EXISTS idx_islamic_document_chunks_citation ON islamic_document_chunks (citation_label);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    BEGIN
      EXECUTE 'ALTER TABLE islamic_document_chunks ADD COLUMN IF NOT EXISTS embedding vector';
    EXCEPTION WHEN undefined_object THEN
      NULL;
    END;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION enforce_islamic_document_chunk_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved IS TRUE THEN
    IF NEW.citation_label IS NULL OR length(trim(NEW.citation_label)) = 0 THEN
      RAISE EXCEPTION 'approved document chunks require citation_label';
    END IF;
    IF NEW.approval_status <> 'approved' THEN
      RAISE EXCEPTION 'approved document chunks require approval_status=approved';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_islamic_document_chunks_guard ON islamic_document_chunks;
CREATE TRIGGER trg_islamic_document_chunks_guard
BEFORE INSERT OR UPDATE ON islamic_document_chunks
FOR EACH ROW EXECUTE FUNCTION enforce_islamic_document_chunk_guard();

-- -----------------------------------------------------------------------------
-- citation_registry — one row per approved citation surface.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citation_registry (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id            UUID NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  document_id          UUID NOT NULL REFERENCES islamic_documents(id) ON DELETE CASCADE,
  chunk_id             UUID NOT NULL REFERENCES islamic_document_chunks(id) ON DELETE CASCADE,
  citation_label       TEXT NOT NULL,
  reference_label      TEXT NOT NULL,
  source_title_ar      TEXT NOT NULL,
  source_title_en      TEXT,
  source_type          TEXT NOT NULL,
  official_url         TEXT,
  local_reference      TEXT,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  approval_status      TEXT NOT NULL DEFAULT 'internal_review_required' CHECK (
    approval_status IN ('internal_review_required', 'pending_review', 'approved', 'rejected', 'blocked')
  ),
  content_hash         TEXT NOT NULL CHECK (length(content_hash) = 64),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chunk_id)
);
CREATE INDEX IF NOT EXISTS idx_citation_registry_source ON citation_registry (source_id, approved);
CREATE INDEX IF NOT EXISTS idx_citation_registry_document ON citation_registry (document_id);
CREATE INDEX IF NOT EXISTS idx_citation_registry_chunk ON citation_registry (chunk_id);

CREATE OR REPLACE FUNCTION enforce_citation_registry_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved IS TRUE THEN
    IF NEW.approval_status <> 'approved' THEN
      RAISE EXCEPTION 'approved citation_registry rows require approval_status=approved';
    END IF;
    IF NEW.citation_label IS NULL OR length(trim(NEW.citation_label)) = 0 THEN
      RAISE EXCEPTION 'approved citation_registry rows require citation_label';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_citation_registry_guard ON citation_registry;
CREATE TRIGGER trg_citation_registry_guard
BEFORE INSERT OR UPDATE ON citation_registry
FOR EACH ROW EXECUTE FUNCTION enforce_citation_registry_guard();

-- -----------------------------------------------------------------------------
-- rag_ingestion_jobs — append-only records for live ingestion runs.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rag_ingestion_jobs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type             TEXT NOT NULL CHECK (job_type IN ('seed_sources', 'approve_sources', 'ingest_documents', 'chunk_documents', 'embed_chunks', 'verify_live')),
  status               TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  source_id            UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  source_count         INTEGER NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  document_count       INTEGER NOT NULL DEFAULT 0 CHECK (document_count >= 0),
  chunk_count          INTEGER NOT NULL DEFAULT 0 CHECK (chunk_count >= 0),
  embedding_count      INTEGER NOT NULL DEFAULT 0 CHECK (embedding_count >= 0),
  citation_count       INTEGER NOT NULL DEFAULT 0 CHECK (citation_count >= 0),
  blocker_reason       TEXT,
  started_at           TIMESTAMPTZ,
  finished_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rag_ingestion_jobs_status ON rag_ingestion_jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_ingestion_jobs_source ON rag_ingestion_jobs (source_id);

-- -----------------------------------------------------------------------------
-- rag_query_audit — per-query audit trail with safety decision.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rag_query_audit (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash        TEXT NOT NULL CHECK (length(question_hash) = 64),
  normalized_question  TEXT NOT NULL,
  language             TEXT NOT NULL DEFAULT 'ar',
  mode                 TEXT NOT NULL DEFAULT 'ask_sheikh',
  intent               TEXT NOT NULL DEFAULT 'unknown',
  risk_level           TEXT NOT NULL DEFAULT 'medium',
  safety_status        TEXT NOT NULL CHECK (safety_status IN (
    'verified_sources',
    'insufficient_sources',
    'low_confidence',
    'unapproved_source',
    'citation_missing',
    'scholar_review_required',
    'unsupported_question',
    'blocked_prompt_injection',
    'system_error'
  )),
  source_ids           JSONB NOT NULL DEFAULT '[]'::jsonb,
  document_ids         JSONB NOT NULL DEFAULT '[]'::jsonb,
  chunk_ids            JSONB NOT NULL DEFAULT '[]'::jsonb,
  citation_ids         JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_sources_count INTEGER NOT NULL DEFAULT 0,
  documents_indexed_count INTEGER NOT NULL DEFAULT 0,
  chunks_indexed_count INTEGER NOT NULL DEFAULT 0,
  embeddings_indexed_count INTEGER NOT NULL DEFAULT 0,
  citations_indexed_count INTEGER NOT NULL DEFAULT 0,
  llm_called           BOOLEAN NOT NULL DEFAULT FALSE,
  algorithm_version    TEXT NOT NULL,
  refusal_reason       TEXT,
  answer_text          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rag_query_audit_created ON rag_query_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_query_audit_status ON rag_query_audit (safety_status, created_at DESC);

-- -----------------------------------------------------------------------------
-- scholar_review_queue — review inbox for scholar/admin escalation.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scholar_review_queue (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash        TEXT NOT NULL CHECK (length(question_hash) = 64),
  question_text        TEXT NOT NULL,
  normalized_question  TEXT NOT NULL,
  category             TEXT NOT NULL,
  language             TEXT NOT NULL DEFAULT 'ar',
  risk_level           TEXT NOT NULL DEFAULT 'medium',
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'answered', 'rejected', 'needs_more_info')),
  reason               TEXT,
  requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  source_ids           JSONB NOT NULL DEFAULT '[]'::jsonb,
  chunk_ids            JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scholar_review_queue_status ON scholar_review_queue (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_scholar_review_queue_question_hash ON scholar_review_queue (question_hash);

CREATE UNIQUE INDEX IF NOT EXISTS uq_source_approvals_source_id ON source_approvals (source_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_source_licenses_source_id ON source_licenses (source_id);

-- -----------------------------------------------------------------------------
-- Scholar answer approval guard (existing table, now enforced).
-- -----------------------------------------------------------------------------
ALTER TABLE scholar_answers
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION enforce_scholar_answer_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('approved', 'published') THEN
    IF NEW.reviewer_id IS NULL THEN
      RAISE EXCEPTION 'approved scholar answers require reviewer_id';
    END IF;
    IF NEW.approved_at IS NULL THEN
      NEW.approved_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scholar_answers_guard ON scholar_answers;
CREATE TRIGGER trg_scholar_answers_guard
BEFORE INSERT OR UPDATE ON scholar_answers
FOR EACH ROW EXECUTE FUNCTION enforce_scholar_answer_guard();

-- -----------------------------------------------------------------------------
-- Azan approval guard.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_azan_audio_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved IS TRUE AND NEW.license_status <> 'approved' THEN
    RAISE EXCEPTION 'approved azan audio requires license_status=approved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_azan_audio_assets_guard ON azan_audio_assets;
CREATE TRIGGER trg_azan_audio_assets_guard
BEFORE INSERT OR UPDATE ON azan_audio_assets
FOR EACH ROW EXECUTE FUNCTION enforce_azan_audio_guard();

COMMIT;
