-- =============================================================================
-- Sakina migration 010 — Rahma mobile alignment
-- File: backend/db/migrations/010_rahma_mobile_alignment.sql
-- =============================================================================
-- Adds mobile-specific tables the prior migrations did NOT create:
--   - mobile_sessions      (opaque session token hash + device hash; no PII)
--   - device_registrations (per-device install metadata)
--   - push_notification_tokens (apns/fcm tokens, hashed; no raw)
--   - donation_intents     (mobile-only foundation; provider gated, no card data ever)
--   - donation_audit       (append-only)
--
-- Existing tables NOT duplicated:
--   users / sakina_users        -> 001 / 003
--   sheikh_profiles             -> 003
--   sheikh_answers / citations  -> 003
--   children_game_progress      -> 008
--
-- Zero seed data. Additive. No destructive ops.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS mobile_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL,                      -- opaque app-side user id
  session_token_hash    TEXT NOT NULL UNIQUE CHECK (length(session_token_hash) = 64),
  device_hash           TEXT NOT NULL CHECK (length(device_hash) = 64),
  app_version           TEXT NOT NULL CHECK (length(trim(app_version)) > 0 AND length(app_version) <= 32),
  platform              TEXT NOT NULL CHECK (platform IN ('android','ios','unknown')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL,
  revoked_at            TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ms_user      ON mobile_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_ms_expires   ON mobile_sessions (expires_at DESC);

CREATE TABLE IF NOT EXISTS device_registrations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID,                                -- nullable for anonymous installs
  device_hash           TEXT NOT NULL UNIQUE CHECK (length(device_hash) = 64),
  platform              TEXT NOT NULL CHECK (platform IN ('android','ios','unknown')),
  app_version           TEXT NOT NULL,
  locale                TEXT NOT NULL DEFAULT 'ar',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dr_user      ON device_registrations (user_id);
CREATE INDEX IF NOT EXISTS idx_dr_platform  ON device_registrations (platform);

CREATE TABLE IF NOT EXISTS push_notification_tokens (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id             UUID NOT NULL REFERENCES device_registrations(id) ON DELETE CASCADE,
  token_hash            TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),  -- sha-256 of raw token, never store raw
  provider              TEXT NOT NULL CHECK (provider IN ('apns','fcm')),
  registered_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at            TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pnt_device  ON push_notification_tokens (device_id);

CREATE TABLE IF NOT EXISTS donation_intents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID,                                -- nullable for guest intent
  amount_cents          BIGINT NOT NULL CHECK (amount_cents > 0),
  currency              TEXT NOT NULL CHECK (length(currency) = 3),
  cause_id              TEXT NOT NULL CHECK (length(trim(cause_id)) > 0),
  provider              TEXT NOT NULL CHECK (provider IN ('disabled','stripe','paypal','manual_offline')) DEFAULT 'disabled',
  status                TEXT NOT NULL CHECK (status IN (
    'intent_recorded','provider_disabled','provider_pending','succeeded','failed','refunded'
  )) DEFAULT 'intent_recorded',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_di_user     ON donation_intents (user_id);
CREATE INDEX IF NOT EXISTS idx_di_status   ON donation_intents (status);
CREATE INDEX IF NOT EXISTS idx_di_cause    ON donation_intents (cause_id);

CREATE TABLE IF NOT EXISTS donation_audit (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id             UUID NOT NULL REFERENCES donation_intents(id) ON DELETE CASCADE,
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event                 TEXT NOT NULL CHECK (length(trim(event)) > 0),
  metadata_json         JSONB
);
CREATE INDEX IF NOT EXISTS idx_da_intent   ON donation_audit (intent_id);
CREATE INDEX IF NOT EXISTS idx_da_occurred ON donation_audit (occurred_at DESC);

COMMIT;
