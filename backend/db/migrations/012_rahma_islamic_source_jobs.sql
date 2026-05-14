-- =============================================================================
-- Sakina migration 012 — Islamic source registry alignment
-- File: backend/db/migrations/012_rahma_islamic_source_jobs.sql
-- =============================================================================
-- Sprint 45 — source governance plumbing.
--
-- The core `islamic_source_registry` + `islamic_source_documents` tables
-- already exist (migration 004). This migration adds:
--   - islamic_source_versions       — per-source versioning record
--   - islamic_content_import_jobs   — operator-launched import jobs
--   - islamic_content_import_events — append-only job event log
--
-- These are the surfaces a future "operator-approved import" tool would
-- write into. They never accept content without a registry row in
-- approved state — that's enforced at the route layer plus by the
-- foreign keys below.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- islamic_source_versions — one row per (source_id, version) tuple.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS islamic_source_versions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id             UUID NOT NULL REFERENCES islamic_source_registry(id) ON DELETE CASCADE,
  version_label         TEXT NOT NULL CHECK (length(trim(version_label)) > 0 AND length(version_label) <= 64),
  license_id            TEXT NOT NULL CHECK (length(trim(license_id)) > 0 AND length(license_id) <= 64),
  language              TEXT NOT NULL DEFAULT 'ar' CHECK (length(language) BETWEEN 2 AND 8),
  content_hash          TEXT NOT NULL CHECK (length(content_hash) = 64),
  verification_status   TEXT NOT NULL CHECK (verification_status IN (
    'unverified',
    'pending_review',
    'approved',
    'rejected'
  )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at           TIMESTAMPTZ,
  UNIQUE (source_id, version_label)
);
CREATE INDEX IF NOT EXISTS idx_isv_source   ON islamic_source_versions (source_id);
CREATE INDEX IF NOT EXISTS idx_isv_status   ON islamic_source_versions (verification_status);

-- -----------------------------------------------------------------------------
-- islamic_content_import_jobs — operator-launched import job record.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS islamic_content_import_jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id             UUID NOT NULL REFERENCES islamic_source_registry(id) ON DELETE RESTRICT,
  version_id            UUID NOT NULL REFERENCES islamic_source_versions(id) ON DELETE RESTRICT,
  initiated_by          UUID,                       -- opaque operator id; never the email
  job_kind              TEXT NOT NULL CHECK (job_kind IN (
    'dry_run',
    'import',
    'rechunk',
    'reverify'
  )),
  status                TEXT NOT NULL CHECK (status IN (
    'queued',
    'running',
    'succeeded',
    'failed',
    'cancelled'
  )) DEFAULT 'queued',
  total_items           INTEGER CHECK (total_items IS NULL OR total_items >= 0),
  imported_items        INTEGER NOT NULL DEFAULT 0 CHECK (imported_items >= 0),
  rejected_items        INTEGER NOT NULL DEFAULT 0 CHECK (rejected_items >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at            TIMESTAMPTZ,
  finished_at           TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_icij_source   ON islamic_content_import_jobs (source_id);
CREATE INDEX IF NOT EXISTS idx_icij_status   ON islamic_content_import_jobs (status);
CREATE INDEX IF NOT EXISTS idx_icij_created  ON islamic_content_import_jobs (created_at DESC);

-- -----------------------------------------------------------------------------
-- islamic_content_import_events — append-only event log per job.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS islamic_content_import_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                UUID NOT NULL REFERENCES islamic_content_import_jobs(id) ON DELETE CASCADE,
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type            TEXT NOT NULL CHECK (event_type IN (
    'job_started',
    'item_imported',
    'item_rejected',
    'item_pending_review',
    'job_succeeded',
    'job_failed',
    'job_cancelled'
  )),
  document_ref          TEXT,                       -- per-row pointer
  reason                TEXT,
  metadata_json         JSONB
);
CREATE INDEX IF NOT EXISTS idx_icie_job        ON islamic_content_import_events (job_id);
CREATE INDEX IF NOT EXISTS idx_icie_event_type ON islamic_content_import_events (event_type);
CREATE INDEX IF NOT EXISTS idx_icie_occurred   ON islamic_content_import_events (occurred_at DESC);

COMMIT;
