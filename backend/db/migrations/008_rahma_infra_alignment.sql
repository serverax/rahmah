-- =============================================================================
-- Sakina migration 008 — Rahma infra alignment
-- File: backend/db/migrations/008_rahma_infra_alignment.sql
-- =============================================================================
-- Additive, idempotent. Adds the few tables the Rahma infra contract names
-- explicitly but that prior migrations did NOT create:
--   - audit_events (system-wide audit trail; complements sakina_sheikh_audit_log)
--   - children_game_progress (server-side backup of child progress; local-first remains the primary store)
--
-- Tables already covered by previous migrations and NOT duplicated here:
--   users                  -> migration 001 (`users`) and 003 (`sakina_users`)
--   roles, user_roles      -> role column on sakina_users (003)
--   sheikh_profiles        -> sakina_sheikh_profiles (003)
--   islamic_questions      -> sakina_user_questions (003)
--   islamic_answers        -> sakina_sheikh_answers (003)
--   answer_citations       -> sakina_sheikh_answer_citations (003)
--   quran_references / hadith_references
--                          -> islamic_source_registry + islamic_source_documents (004)
--
-- Zero seed data. Zero destructive operations.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- audit_events — append-only system-wide audit trail. The existing
-- sakina_sheikh_audit_log is scoped to scholar/moderator/admin actions on
-- Sheikh Hasan content. This table is for everything else (privacy
-- requests, RAG ingestion, charity events, RBAC denials).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_kind          TEXT NOT NULL CHECK (actor_kind IN (
    'public_user',
    'authenticated_user',
    'sheikh',
    'moderator',
    'content_reviewer',
    'charity_admin',
    'admin',
    'system'
  )),
  actor_id            UUID,                       -- optional, never the email
  actor_email_hash    TEXT CHECK (actor_email_hash IS NULL OR length(actor_email_hash) = 64),
  event_type          TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  target_kind         TEXT NOT NULL CHECK (length(trim(target_kind)) > 0),
  target_id           UUID,
  ip_hash             TEXT CHECK (ip_hash IS NULL OR length(ip_hash) = 64),
  metadata_json       JSONB,
  CHECK (occurred_at <= NOW() + INTERVAL '1 minute')
);
CREATE INDEX IF NOT EXISTS idx_ae_occurred       ON audit_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_event_type     ON audit_events (event_type);
CREATE INDEX IF NOT EXISTS idx_ae_target         ON audit_events (target_kind, target_id);
CREATE INDEX IF NOT EXISTS idx_ae_actor          ON audit_events (actor_kind, actor_id);

-- -----------------------------------------------------------------------------
-- children_game_progress — server-side backup of child-game state.
-- The product contract keeps the primary store local (localStorage on the
-- device). This server-side row exists only when the operator opts in to
-- account-bound progress. No child personal data is stored: only an
-- opaque user_id (UUID), a game scenario id, the answer counters, and the
-- last-updated timestamp.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS children_game_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL,                    -- opaque; not joined to public PII
  scenario_id         TEXT NOT NULL CHECK (length(trim(scenario_id)) > 0),
  attempts_count      INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0),
  correct_count       INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0 AND correct_count <= attempts_count),
  last_state_jsonb    JSONB,                            -- counters + small badges only; NEVER PII
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, scenario_id)
);
CREATE INDEX IF NOT EXISTS idx_cgp_user        ON children_game_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_cgp_scenario    ON children_game_progress (scenario_id);
CREATE INDEX IF NOT EXISTS idx_cgp_updated     ON children_game_progress (updated_at DESC);

COMMIT;
