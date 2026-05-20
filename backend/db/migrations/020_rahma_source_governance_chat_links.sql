-- =============================================================================
-- Rahma migration 020 — exact source governance + chat source links
-- File: backend/db/migrations/020_rahma_source_governance_chat_links.sql
-- =============================================================================
-- Additive schema only.
-- This migration adds the exact governance table names required by the
-- Rahma DB/RAG contract:
--   - content_sources
--   - source_approvals
--   - source_licenses
--   - scholar_reviewers
--   - content_audit_log
--   - chat_message_sources
--   - saved_answers
--   - answer_feedback
--   - reported_answers
--
-- These tables are intentionally governance-focused and contain no seed data.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS content_sources (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type          TEXT NOT NULL CHECK (source_type IN (
    'quran',
    'hadith',
    'dua',
    'fiqh',
    'scholar_reference',
    'children',
    'library',
    'prayer',
    'azan_audio'
  )),
  source_name_ar       TEXT NOT NULL,
  source_name_en       TEXT,
  source_reference     TEXT NOT NULL UNIQUE,
  source_url           TEXT,
  language             TEXT NOT NULL DEFAULT 'ar',
  license_status       TEXT NOT NULL DEFAULT 'pending' CHECK (license_status IN ('pending', 'approved', 'rejected', 'restricted', 'unknown')),
  source_approved      BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at          TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_sources_approved ON content_sources (source_approved, license_status);
CREATE INDEX IF NOT EXISTS idx_content_sources_type ON content_sources (source_type, language);

CREATE TABLE IF NOT EXISTS source_approvals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id            UUID NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  reviewer_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  approval_status      TEXT NOT NULL CHECK (approval_status IN ('pending_review', 'approved', 'rejected', 'needs_changes')),
  reason               TEXT,
  evidence_json        JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_source_approvals_source ON source_approvals (source_id, approval_status);

CREATE TABLE IF NOT EXISTS source_licenses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id            UUID NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  license_name         TEXT NOT NULL,
  license_status       TEXT NOT NULL CHECK (license_status IN ('pending', 'approved', 'rejected', 'restricted', 'unknown')),
  license_url          TEXT,
  evidence_json        JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviewed_by_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_source_licenses_source ON source_licenses (source_id, license_status);

CREATE TABLE IF NOT EXISTS scholar_reviewers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  display_name         TEXT NOT NULL,
  qualifications       TEXT,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_audit_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  action               TEXT NOT NULL,
  target_type          TEXT NOT NULL,
  target_id            TEXT,
  details_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_audit_log_created ON content_audit_log (created_at DESC);

CREATE TABLE IF NOT EXISTS chat_message_sources (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id           UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  source_id            UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  chunk_id             UUID REFERENCES rag_chunks(id) ON DELETE SET NULL,
  citation_label       TEXT NOT NULL,
  source_type          TEXT NOT NULL,
  verified             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_message_sources_message ON chat_message_sources (message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_sources_source ON chat_message_sources (source_id, verified);
CREATE INDEX IF NOT EXISTS idx_chat_message_sources_chunk ON chat_message_sources (chunk_id);

CREATE TABLE IF NOT EXISTS saved_answers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id      UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  question_hash        TEXT NOT NULL CHECK (length(question_hash) = 64),
  answer_text          TEXT NOT NULL,
  answer_status        TEXT NOT NULL DEFAULT 'approved' CHECK (answer_status IN ('draft', 'pending_review', 'approved', 'rejected')),
  language             TEXT NOT NULL DEFAULT 'ar',
  citation_json        JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_ids           JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_answers_question ON saved_answers (question_hash);
CREATE INDEX IF NOT EXISTS idx_saved_answers_user ON saved_answers (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS answer_feedback (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id           UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  feedback_type        TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'unhelpful', 'unsafe', 'citation_problem', 'other')),
  rating               INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  comment              TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_answer_feedback_message ON answer_feedback (message_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reported_answers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id           UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  report_reason        TEXT NOT NULL,
  report_text          TEXT,
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'rejected')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reported_answers_status ON reported_answers (status, created_at DESC);

COMMIT;
