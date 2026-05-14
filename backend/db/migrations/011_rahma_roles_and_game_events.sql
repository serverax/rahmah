-- =============================================================================
-- Sakina migration 011 — Rahma roles + children-game alignment
-- File: backend/db/migrations/011_rahma_roles_and_game_events.sql
-- =============================================================================
-- Adds the few tables the Rahma backend contract names but earlier
-- migrations did NOT explicitly create:
--   - roles                          (role catalogue separate from sakina_users.role column)
--   - user_roles                     (many-to-many user ↔ role)
--   - children_game_profiles         (opaque per-user game profile, no PII)
--   - children_game_events           (append-only event log; counters only)
--
-- Additive, idempotent. Zero seed data. Zero destructive ops.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- roles — canonical catalogue. The string `name` is the wire-level role
-- identifier; the backend enforces it via auth/roles.js.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL UNIQUE CHECK (name IN (
    'public_user',
    'user',
    'sheikh',
    'moderator',
    'content_reviewer',
    'charity_admin',
    'admin'
  )),
  description           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- user_roles — many-to-many. user_id is opaque (UUID), matching the rest
-- of the mobile data model. role_id references roles(id).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL,
  role_id               UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by            UUID,                            -- opaque actor id
  revoked_at            TIMESTAMPTZ,
  UNIQUE (user_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_ur_user   ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_ur_active ON user_roles (user_id, revoked_at);

-- -----------------------------------------------------------------------------
-- children_game_profiles — opaque per-user profile for the game. Stores
-- ONLY counters and prefs. No name, no age (only age_band), no device id.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS children_game_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL,
  age_band              TEXT NOT NULL CHECK (age_band IN ('4-6','7-9','10-12','13+')),
  preferred_language    TEXT NOT NULL DEFAULT 'ar' CHECK (length(preferred_language) BETWEEN 2 AND 8),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_cgp_age_band ON children_game_profiles (age_band);

-- -----------------------------------------------------------------------------
-- children_game_events — append-only event log: started, completed, etc.
-- NEVER stores answer text, NEVER stores child PII.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS children_game_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  profile_id            UUID NOT NULL REFERENCES children_game_profiles(id) ON DELETE CASCADE,
  scenario_id           TEXT NOT NULL CHECK (length(trim(scenario_id)) > 0 AND length(scenario_id) <= 64),
  event_type            TEXT NOT NULL CHECK (event_type IN (
    'scenario_started',
    'scenario_completed',
    'attempt_recorded',
    'badge_earned'
  )),
  attempts_count        INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0),
  correct_count         INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0 AND correct_count <= attempts_count)
);
CREATE INDEX IF NOT EXISTS idx_cge_profile  ON children_game_events (profile_id);
CREATE INDEX IF NOT EXISTS idx_cge_scenario ON children_game_events (scenario_id);
CREATE INDEX IF NOT EXISTS idx_cge_occurred ON children_game_events (occurred_at DESC);

COMMIT;
