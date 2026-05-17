-- =============================================================================
-- Rahma migration 013 — Full Ask Sheikh Hasan Workflow (Bilingual)
-- File: backend/db/migrations/013_ask_sheikh_hasan_workflow.sql
-- =============================================================================
-- This migration implements the V4 bilingual workflow for Sheikh Hasan.
-- It adds five tables that support authored Arabic/English content,
-- strict admin approval, and citation-gated publishing.
--
-- Tables:
--   1. ask_sheikh_categories
--   2. ask_sheikh_questions
--   3. ask_sheikh_answers
--   4. ask_sheikh_answer_citations
--   5. ask_sheikh_audit_events
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. ask_sheikh_categories
CREATE TABLE IF NOT EXISTS ask_sheikh_categories (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL UNIQUE CHECK (length(trim(slug)) > 0),
  title_ar              TEXT NOT NULL CHECK (length(trim(title_ar)) > 0),
  title_en              TEXT,
  description_ar        TEXT,
  description_en        TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asc_active ON ask_sheikh_categories (is_active, sort_order);

-- 2. ask_sheikh_questions
CREATE TABLE IF NOT EXISTS ask_sheikh_questions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES sakina_users(id) ON DELETE SET NULL,
  category_id           UUID REFERENCES ask_sheikh_categories(id) ON DELETE SET NULL,
  question_text_ar      TEXT CHECK (question_text_ar IS NULL OR length(trim(question_text_ar)) > 0),
  question_text_en      TEXT CHECK (question_text_en IS NULL OR length(trim(question_text_en)) > 0),
  original_language     TEXT NOT NULL CHECK (original_language IN ('ar', 'en', 'unknown')),
  display_preference    TEXT NOT NULL DEFAULT 'ar' CHECK (display_preference IN ('ar', 'en', 'both')),
  status                TEXT NOT NULL CHECK (status IN (
    'submitted',
    'pending_sheikh',
    'answered_by_sheikh',
    'pending_admin_approval',
    'approved',
    'rejected',
    'published',
    'archived'
  )),
  public_visible        BOOLEAN NOT NULL DEFAULT FALSE,
  is_anonymous          BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_sheikh_id    UUID REFERENCES sakina_users(id) ON DELETE SET NULL,
  moderation_notes      TEXT,
  admin_notes           TEXT,
  rejection_reason      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_ip_hash     TEXT,
  user_agent_hash       TEXT,
  -- Constraint: at least one language must be present
  CONSTRAINT ck_asq_text_present CHECK (question_text_ar IS NOT NULL OR question_text_en IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_asq_status ON ask_sheikh_questions (status);
CREATE INDEX IF NOT EXISTS idx_asq_public ON ask_sheikh_questions (public_visible) WHERE public_visible = TRUE;

-- 3. ask_sheikh_answers
CREATE TABLE IF NOT EXISTS ask_sheikh_answers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id           UUID NOT NULL REFERENCES ask_sheikh_questions(id) ON DELETE CASCADE,
  answered_by_user_id   UUID NOT NULL REFERENCES sakina_users(id) ON DELETE RESTRICT,
  answer_text_ar        TEXT CHECK (answer_text_ar IS NULL OR length(trim(answer_text_ar)) > 0),
  answer_text_en        TEXT CHECK (answer_text_en IS NULL OR length(trim(answer_text_en)) > 0),
  original_answer_lang  TEXT NOT NULL CHECK (original_answer_lang IN ('ar', 'en', 'unknown')),
  status                TEXT NOT NULL CHECK (status IN (
    'draft',
    'submitted_for_admin_review',
    'approved',
    'rejected',
    'published',
    'archived'
  )),
  public_visible        BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by_admin_id  UUID REFERENCES sakina_users(id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  admin_review_notes    TEXT,
  rejection_reason      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraint: at least one language must be present
  CONSTRAINT ck_asa_text_present CHECK (answer_text_ar IS NOT NULL OR answer_text_en IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_asa_question ON ask_sheikh_answers (question_id);
CREATE INDEX IF NOT EXISTS idx_asa_status ON ask_sheikh_answers (status);

-- 4. ask_sheikh_answer_citations
CREATE TABLE IF NOT EXISTS ask_sheikh_answer_citations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id             UUID NOT NULL REFERENCES ask_sheikh_answers(id) ON DELETE CASCADE,
  source_type           TEXT NOT NULL CHECK (source_type IN (
    'quran',
    'hadith',
    'scholarly',
    'fatwa_reference',
    'other'
  )),
  source_title_ar       TEXT,
  source_title_en       TEXT,
  reference_ar          TEXT,
  reference_en          TEXT,
  quote_ar              TEXT,
  quote_en              TEXT,
  url                   TEXT,
  verification_status   TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN (
    'unverified',
    'verified',
    'rejected',
    'needs_review'
  )),
  verified_by_admin_id  UUID REFERENCES sakina_users(id) ON DELETE SET NULL,
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraint: at least one reference field is required
  CONSTRAINT ck_asac_ref_present CHECK (reference_ar IS NOT NULL OR reference_en IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_asac_answer ON ask_sheikh_answer_citations (answer_id);

-- 5. ask_sheikh_audit_events
CREATE TABLE IF NOT EXISTS ask_sheikh_audit_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id         UUID REFERENCES sakina_users(id) ON DELETE SET NULL,
  question_id           UUID REFERENCES ask_sheikh_questions(id) ON DELETE SET NULL,
  answer_id             UUID REFERENCES ask_sheikh_answers(id) ON DELETE SET NULL,
  action                TEXT NOT NULL CHECK (action IN (
    'question_submitted',
    'question_assigned_to_sheikh',
    'sheikh_answer_drafted',
    'sheikh_answer_submitted',
    'admin_approved_answer',
    'admin_rejected_answer',
    'answer_published',
    'question_archived',
    'visibility_changed'
  )),
  before_status         TEXT,
  after_status          TEXT,
  metadata_json         JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asae_question ON ask_sheikh_audit_events (question_id);
CREATE INDEX IF NOT EXISTS idx_asae_answer ON ask_sheikh_audit_events (answer_id);

COMMIT;
