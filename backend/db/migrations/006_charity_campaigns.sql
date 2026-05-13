-- =============================================================================
-- Sakina migration 006 — Charity / sadaqah campaign foundation
-- File: backend/db/migrations/006_charity_campaigns.sql
-- =============================================================================
-- Adds 5 tables for sadaqah campaigns with transparent public information.
-- No payment integration in this migration. Real provider configuration
-- happens in a separate operator-driven sprint with explicit approval.
--
-- Properties:
--   - Campaigns gated by verification_status before public visibility.
--   - Amount columns are NUMERIC, NULL allowed when amount is undisclosed.
--   - Donation "intents" record interest, not actual payment success — until
--     a real provider is wired, no row in this table represents a completed
--     transaction.
--   - Transparency-log table is append-only by convention.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- charity_campaigns — the public-facing campaign record.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS charity_campaigns (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar              TEXT NOT NULL CHECK (length(trim(title_ar)) > 0),
  description_ar        TEXT NOT NULL CHECK (length(trim(description_ar)) > 0),
  category              TEXT NOT NULL CHECK (category IN (
    'food_relief',
    'water_relief',
    'orphan_support',
    'islamic_education',
    'mosque_support',
    'medical_relief',
    'general'
  )),
  target_amount         NUMERIC(14, 2) CHECK (target_amount IS NULL OR target_amount >= 0),
  collected_amount      NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (collected_amount >= 0),
  status                TEXT NOT NULL CHECK (status IN (
    'draft',
    'active',
    'paused',
    'completed',
    'hidden'
  )),
  verification_status   TEXT NOT NULL CHECK (verification_status IN (
    'unverified',
    'pending_review',
    'approved',
    'rejected'
  )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cc_status     ON charity_campaigns (status);
CREATE INDEX IF NOT EXISTS idx_cc_vstatus    ON charity_campaigns (verification_status);
CREATE INDEX IF NOT EXISTS idx_cc_category   ON charity_campaigns (category);
CREATE INDEX IF NOT EXISTS idx_cc_active
  ON charity_campaigns (category)
  WHERE status = 'active' AND verification_status = 'approved';

-- -----------------------------------------------------------------------------
-- charity_campaign_updates — append-only operator updates.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS charity_campaign_updates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           UUID NOT NULL REFERENCES charity_campaigns(id) ON DELETE CASCADE,
  update_type           TEXT NOT NULL CHECK (update_type IN (
    'milestone',
    'distribution_report',
    'thank_you',
    'paused_notice',
    'completion_notice'
  )),
  body_ar               TEXT NOT NULL CHECK (length(trim(body_ar)) > 0),
  evidence_url          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ccu_campaign_created ON charity_campaign_updates (campaign_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- charity_donation_intents — records of user intent to donate. Does NOT
-- represent a completed transaction. Real payment provider integration is
-- a separate sprint.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS charity_donation_intents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           UUID NOT NULL REFERENCES charity_campaigns(id) ON DELETE CASCADE,
  amount                NUMERIC(14, 2) CHECK (amount IS NULL OR amount >= 0),
  currency              TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) BETWEEN 3 AND 8),
  status                TEXT NOT NULL CHECK (status IN (
    'initiated',
    'provider_not_configured',
    'cancelled',
    'completed_external_record'
  )),
  intent_hash           TEXT NOT NULL CHECK (length(intent_hash) = 64),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cdi_campaign  ON charity_donation_intents (campaign_id);
CREATE INDEX IF NOT EXISTS idx_cdi_status    ON charity_donation_intents (status);

-- -----------------------------------------------------------------------------
-- charity_payment_provider_config — operator-managed provider hint. No real
-- credentials in this table; values reference Kubernetes Secret keys.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS charity_payment_provider_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name         TEXT NOT NULL CHECK (provider_name IN (
    'not_configured',
    'sandbox',
    'production'
  )),
  secret_key_ref_name   TEXT,
  webhook_path          TEXT,
  status                TEXT NOT NULL CHECK (status IN ('disabled', 'sandbox', 'enabled')),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (provider_name <> 'not_configured' OR status = 'disabled')
);

-- -----------------------------------------------------------------------------
-- charity_transparency_logs — public-facing transparency notes. Append-only.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS charity_transparency_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           UUID NOT NULL REFERENCES charity_campaigns(id) ON DELETE CASCADE,
  topic                 TEXT NOT NULL CHECK (length(trim(topic)) > 0),
  body_ar               TEXT NOT NULL CHECK (length(trim(body_ar)) > 0),
  evidence_url          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ctl_campaign_created ON charity_transparency_logs (campaign_id, created_at DESC);

COMMIT;
