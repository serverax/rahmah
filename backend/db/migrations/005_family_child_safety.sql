-- =============================================================================
-- Sakina migration 005 — Family / child safety foundation
-- File: backend/db/migrations/005_family_child_safety.sql
-- =============================================================================
-- Adds 6 tables for guardian-mediated family and child mode.
--
-- Privacy properties enforced at the SQL layer:
--   - Child profiles store ONLY a nickname (no real name, no birth date).
--   - Age is stored as an age-band enum, never an exact date.
--   - The schema deliberately omits contact / address / identity columns for
--     child rows; only nickname_ar + age_band are collected.
--   - Child progress lives in a separate table that explicitly carries
--     `is_private` defaulting to TRUE.
--   - No "leaderboard" table exists.
--   - Privacy audit log captures every guardian action; append-only by
--     convention (no UPDATE exposed by the route layer).
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- family_accounts — guardian-owned root row. Email is hashed only.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_email_hash   TEXT NOT NULL UNIQUE CHECK (length(guardian_email_hash) = 64),
  display_label_ar      TEXT NOT NULL CHECK (length(trim(display_label_ar)) > 0),
  status                TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'closed')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fa_status ON family_accounts (status);

-- -----------------------------------------------------------------------------
-- family_members — guardians or co-guardians within a family. No children
-- here — children are in `child_profiles` so that the data model makes the
-- privacy difference explicit at the schema level.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id             UUID NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL CHECK (role IN ('guardian', 'co_guardian')),
  member_email_hash     TEXT NOT NULL CHECK (length(member_email_hash) = 64),
  display_name_ar       TEXT NOT NULL CHECK (length(trim(display_name_ar)) > 0),
  status                TEXT NOT NULL CHECK (status IN ('active', 'disabled', 'pending')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fm_family_member ON family_members (family_id, member_email_hash);
CREATE INDEX IF NOT EXISTS idx_fm_role ON family_members (role);

-- -----------------------------------------------------------------------------
-- child_profiles — nickname-only profile. NO chat. NO public profile.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS child_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id             UUID NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  nickname_ar           TEXT NOT NULL CHECK (length(trim(nickname_ar)) > 0 AND length(nickname_ar) <= 32),
  age_band              TEXT NOT NULL CHECK (age_band IN ('4-6', '7-9', '10-12', '13+')),
  child_mode_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  public_profile        BOOLEAN NOT NULL DEFAULT FALSE
    -- The CHECK below is the structural commitment that public profile is
    -- always FALSE for children. Schema-level guarantee against accidental flip.
    CHECK (public_profile = FALSE),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cp_family ON child_profiles (family_id);
CREATE INDEX IF NOT EXISTS idx_cp_age    ON child_profiles (age_band);

-- -----------------------------------------------------------------------------
-- child_progress — gameplay/learning progress. is_private defaults TRUE and
-- the SQL CHECK forbids public_share = TRUE entirely.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS child_progress (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id              UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  scenario_ref          TEXT NOT NULL CHECK (length(trim(scenario_ref)) > 0),
  hasanat_awarded       INTEGER NOT NULL DEFAULT 0 CHECK (hasanat_awarded >= 0),
  outcome               TEXT NOT NULL CHECK (outcome IN ('answered_correctly', 'answered_other', 'skipped')),
  is_private            BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_private = TRUE),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cprog_child_created ON child_progress (child_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- guardian_settings — per-family controls.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guardian_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id             UUID NOT NULL UNIQUE REFERENCES family_accounts(id) ON DELETE CASCADE,
  child_game_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  hide_sensitive_topics BOOLEAN NOT NULL DEFAULT TRUE,
  daily_usage_minutes   INTEGER NOT NULL DEFAULT 30 CHECK (daily_usage_minutes BETWEEN 0 AND 240),
  public_sharing        BOOLEAN NOT NULL DEFAULT FALSE
    CHECK (public_sharing = FALSE),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- privacy_audit_log — append-only audit of any privacy-affecting action.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS privacy_audit_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id             UUID REFERENCES family_accounts(id) ON DELETE SET NULL,
  actor_email_hash      TEXT CHECK (actor_email_hash IS NULL OR length(actor_email_hash) = 64),
  action                TEXT NOT NULL CHECK (length(trim(action)) > 0),
  target_type           TEXT NOT NULL CHECK (length(trim(target_type)) > 0),
  target_id             UUID,
  metadata_jsonb        JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pal_family_created ON privacy_audit_log (family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pal_target ON privacy_audit_log (target_type, target_id);

COMMIT;
