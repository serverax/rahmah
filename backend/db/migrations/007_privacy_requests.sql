-- =============================================================================
-- Sakina migration 007 — privacy / data-rights request foundation
-- =============================================================================
-- Adds `privacy_requests`: a single append-only table for account-deletion,
-- data-export, and contact requests submitted from the public endpoints.
--
-- Privacy properties at SQL layer:
--   - Email is only stored as a sha-256 hash (length = 64). No raw email.
--   - Metadata column is jsonb; routes redact PII before insert.
--   - Status enum makes the "storage_not_configured" state explicit so the
--     route layer can communicate exactly why nothing was persisted.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS privacy_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type          TEXT NOT NULL CHECK (request_type IN (
    'delete_account',
    'data_export',
    'contact'
  )),
  requester_email_hash  TEXT CHECK (requester_email_hash IS NULL OR length(requester_email_hash) = 64),
  status                TEXT NOT NULL CHECK (status IN (
    'received',
    'pending_verification',
    'completed',
    'rejected',
    'storage_not_configured'
  )),
  metadata_jsonb        JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pr_type_status ON privacy_requests (request_type, status);
CREATE INDEX IF NOT EXISTS idx_pr_created     ON privacy_requests (created_at DESC);

COMMIT;
