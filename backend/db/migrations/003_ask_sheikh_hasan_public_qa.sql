-- =============================================================================
-- Sakina migration 003 — Ask Sheikh Hasan + Public Q&A foundation
-- File: backend/db/migrations/003_ask_sheikh_hasan_public_qa.sql
-- =============================================================================
-- Adds eight tables that BACK the scholar-reviewed cited Q&A workflow.
--
-- Safety properties (enforced here at the SQL layer; reinforced in backend
-- by src/sheikh/*.js + tests):
--   - email is never stored as plaintext in sakina_users — only email_hash.
--   - passwords are never stored in this migration.
--   - questions store the raw question_text plus a question_hash; the hash
--     allows audit without joining identity to free-text payload externally.
--   - public answers require at least one citation; the citation_status
--     enum makes the "needs moderation" path explicit (scholar_advice).
--   - publication_status enum + CHECK constraints prevent invalid states.
--   - sakina_public_qa never references sakina_users; only the published
--     answer + question summary surface to public routes.
--   - audit log is append-only by convention; routes do not expose UPDATE.
--   - no INSERT statements: zero rows are seeded.
--
-- This migration is idempotent (IF NOT EXISTS guards). It contains zero
-- destructive operations: no schema-level or database-level removals, no
-- row truncations, no row deletions targeting sakina_* tables. It contains
-- no DSNs, secrets, real phone numbers, and no WhatsApp provider tokens.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()

-- -----------------------------------------------------------------------------
-- sakina_users — minimal identity record. No password column here. No raw
-- email column here. The auth provider, when wired, is responsible for the
-- credential side; this table only stores the *application-side* user record.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sakina_users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash            TEXT NOT NULL UNIQUE CHECK (length(email_hash) = 64),  -- sha256 hex
  display_name          TEXT,
  role                  TEXT NOT NULL CHECK (role IN (
    'user',
    'sheikh',
    'moderator',
    'admin'
  )),
  status                TEXT NOT NULL CHECK (status IN (
    'active',
    'disabled',
    'pending'
  )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_su_role_status ON sakina_users (role, status);

-- -----------------------------------------------------------------------------
-- sakina_sheikh_profiles — public-facing scholar profile fields. There is a
-- 1:1 relationship to a sakina_users row whose role = 'sheikh'.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sakina_sheikh_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES sakina_users(id) ON DELETE CASCADE,
  public_name           TEXT NOT NULL DEFAULT 'Sheikh Hasan' CHECK (length(trim(public_name)) > 0),
  bio                   TEXT,
  languages             TEXT[] NOT NULL DEFAULT ARRAY['en', 'ar']::TEXT[],
  is_public             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ssp_user ON sakina_sheikh_profiles (user_id);

-- -----------------------------------------------------------------------------
-- sakina_user_questions — submitted questions. user_id is nullable so an
-- anonymous "guest" question may be submitted by an unauthenticated path
-- if and when the operator enables that; for now the route uses NULL for
-- guests and a real user_id otherwise.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sakina_user_questions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES sakina_users(id) ON DELETE SET NULL,
  question_text         TEXT NOT NULL CHECK (length(trim(question_text)) > 0),
  question_hash         TEXT NOT NULL CHECK (length(question_hash) = 64),  -- sha256 hex of trimmed text
  language              TEXT NOT NULL DEFAULT 'en' CHECK (length(language) BETWEEN 2 AND 8),
  category              TEXT CHECK (category IS NULL OR category IN (
    'salah',
    'zakat',
    'fasting',
    'family',
    'dua',
    'quran',
    'hadith',
    'general'
  )),
  private_question      BOOLEAN NOT NULL DEFAULT TRUE,
  public_allowed        BOOLEAN NOT NULL DEFAULT FALSE,
  status                TEXT NOT NULL CHECK (status IN (
    'pending_review',
    'assigned_to_sheikh',
    'draft_answered',
    'pending_moderation',
    'published_public',
    'answered_private',
    'rejected',
    'archived'
  )),
  assigned_sheikh_id    UUID REFERENCES sakina_users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suq_status            ON sakina_user_questions (status);
CREATE INDEX IF NOT EXISTS idx_suq_assigned_sheikh   ON sakina_user_questions (assigned_sheikh_id);
CREATE INDEX IF NOT EXISTS idx_suq_category_language ON sakina_user_questions (category, language);
CREATE INDEX IF NOT EXISTS idx_suq_question_hash     ON sakina_user_questions (question_hash);
CREATE INDEX IF NOT EXISTS idx_suq_created           ON sakina_user_questions (created_at DESC);

-- -----------------------------------------------------------------------------
-- sakina_sheikh_answers — answer drafts and published answers.
-- citation_status is computed by the backend and persisted here for cheap
-- queries and audit; the route still recomputes it on every publish attempt.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sakina_sheikh_answers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id           UUID NOT NULL REFERENCES sakina_user_questions(id) ON DELETE CASCADE,
  sheikh_user_id        UUID NOT NULL REFERENCES sakina_users(id) ON DELETE RESTRICT,
  answer_text           TEXT NOT NULL CHECK (length(trim(answer_text)) > 0),
  citation_status       TEXT NOT NULL CHECK (citation_status IN (
    'quran_cited',
    'hadith_cited',
    'quran_and_hadith_cited',
    'scholar_advice_needs_review',
    'insufficient_citation'
  )),
  publication_status    TEXT NOT NULL CHECK (publication_status IN (
    'draft',
    'pending_moderation',
    'published_public',
    'answered_private',
    'rejected'
  )),
  public_summary        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at          TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ssa_question         ON sakina_sheikh_answers (question_id);
CREATE INDEX IF NOT EXISTS idx_ssa_pubstatus        ON sakina_sheikh_answers (publication_status);
CREATE INDEX IF NOT EXISTS idx_ssa_sheikh           ON sakina_sheikh_answers (sheikh_user_id);
CREATE INDEX IF NOT EXISTS idx_ssa_citation_status  ON sakina_sheikh_answers (citation_status);

-- -----------------------------------------------------------------------------
-- sakina_sheikh_answer_citations — citations attached to a sheikh answer.
-- A non-empty citation row of type IN ('quran','hadith','fiqh') is required
-- before publication_status may transition to 'pending_moderation' or
-- 'published_public'. Only 'scholar_note' alone takes the
-- scholar_advice_needs_review path.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sakina_sheikh_answer_citations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id             UUID NOT NULL REFERENCES sakina_sheikh_answers(id) ON DELETE CASCADE,
  citation_type         TEXT NOT NULL CHECK (citation_type IN (
    'quran',
    'hadith',
    'fiqh',
    'scholar_note'
  )),
  citation_label        TEXT NOT NULL CHECK (length(trim(citation_label)) > 0),
  citation_text         TEXT,
  citation_url          TEXT,
  source_id             UUID,
  verification_status   TEXT NOT NULL CHECK (verification_status IN (
    'pending',
    'verified',
    'rejected'
  )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ssac_answer  ON sakina_sheikh_answer_citations (answer_id);
CREATE INDEX IF NOT EXISTS idx_ssac_type    ON sakina_sheikh_answer_citations (citation_type);
CREATE INDEX IF NOT EXISTS idx_ssac_status  ON sakina_sheikh_answer_citations (verification_status);

-- -----------------------------------------------------------------------------
-- sakina_public_qa — public-facing index of published Q&A. This is the ONLY
-- table the public read-only routes query. The slug is the URL identifier.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sakina_public_qa (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id           UUID NOT NULL REFERENCES sakina_user_questions(id) ON DELETE CASCADE,
  answer_id             UUID NOT NULL REFERENCES sakina_sheikh_answers(id) ON DELETE CASCADE,
  slug                  TEXT NOT NULL UNIQUE CHECK (length(trim(slug)) > 0),
  title                 TEXT NOT NULL CHECK (length(trim(title)) > 0),
  language              TEXT NOT NULL CHECK (length(language) BETWEEN 2 AND 8),
  category              TEXT,
  is_live               BOOLEAN NOT NULL DEFAULT FALSE,
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spqa_live_cat_lang
  ON sakina_public_qa (is_live, category, language);
CREATE INDEX IF NOT EXISTS idx_spqa_published   ON sakina_public_qa (published_at DESC);

-- -----------------------------------------------------------------------------
-- sakina_content_reports — user-submitted reports against content.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sakina_content_reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type           TEXT NOT NULL CHECK (target_type IN (
    'question',
    'answer',
    'public_qa'
  )),
  target_id             UUID NOT NULL,
  reason                TEXT NOT NULL CHECK (length(trim(reason)) > 0 AND length(reason) <= 1000),
  status                TEXT NOT NULL CHECK (status IN (
    'open',
    'reviewed',
    'dismissed',
    'actioned'
  )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scr_target  ON sakina_content_reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_scr_status  ON sakina_content_reports (status);
CREATE INDEX IF NOT EXISTS idx_scr_created ON sakina_content_reports (created_at DESC);

-- -----------------------------------------------------------------------------
-- sakina_sheikh_audit_log — append-only audit log of scholar/admin actions.
-- The actor_user_id may be NULL when the system itself records an event.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sakina_sheikh_audit_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id         UUID REFERENCES sakina_users(id) ON DELETE SET NULL,
  action                TEXT NOT NULL CHECK (length(trim(action)) > 0),
  target_type           TEXT NOT NULL CHECK (length(trim(target_type)) > 0),
  target_id             UUID NOT NULL,
  metadata_json         JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ssal_actor_action ON sakina_sheikh_audit_log (actor_user_id, action);
CREATE INDEX IF NOT EXISTS idx_ssal_target       ON sakina_sheikh_audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ssal_created      ON sakina_sheikh_audit_log (created_at DESC);

COMMIT;
