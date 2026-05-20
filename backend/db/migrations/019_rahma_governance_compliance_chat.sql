-- =============================================================================
-- Rahma migration 019 — governance, compliance, chat, health, WASM
-- File: backend/db/migrations/019_rahma_governance_compliance_chat.sql
-- =============================================================================
-- Additive migration only.
-- No seed rows.
-- No secrets.
-- No destructive operations.
-- This migration completes missing Rahma schema areas:
--   - chat conversations/messages
--   - safety/moderation/reporting
--   - notifications
--   - privacy/compliance
--   - admin governance
--   - system health/readiness tracking
--   - WASM runtime governance
--   - optional payments/subscriptions
--   - source approval enforcement helpers
--
-- Approved Islamic content may be used by RAG/chat only when:
--   - source_id exists
--   - the source row is approved
--   - the content row is approved/published where applicable
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Source approval metadata on the canonical registry used by the live backend.
-- -----------------------------------------------------------------------------
ALTER TABLE islamic_source_registry
  ADD COLUMN IF NOT EXISTS source_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_isr_source_approved
  ON islamic_source_registry (source_approved, verification_status)
  WHERE source_approved = true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'islamic_source_registry_approval_consistency') THEN
    ALTER TABLE islamic_source_registry
      ADD CONSTRAINT islamic_source_registry_approval_consistency
      CHECK (
        source_approved = false
        OR (
          verification_status = 'approved'
          AND approved_by_user_id IS NOT NULL
          AND approved_at IS NOT NULL
        )
      );
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION rahma_enforce_approved_source()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  source_ok BOOLEAN;
BEGIN
  IF COALESCE(NEW.approved, false) THEN
    IF NEW.source_id IS NULL THEN
      RAISE EXCEPTION 'approved or published content requires source_id';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM islamic_source_registry s
      WHERE s.id = NEW.source_id
        AND s.verification_status = 'approved'
        AND s.source_approved = true
    ) INTO source_ok;

    IF NOT source_ok THEN
      RAISE EXCEPTION 'approved or published content requires an approved source';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION rahma_enforce_scholar_answer_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('approved', 'published') THEN
    IF NEW.reviewer_id IS NULL OR NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'scholar answers marked approved/published require reviewer_id and approved_at';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION rahma_enforce_azan_audio_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.approved = true AND NEW.license_status <> 'approved' THEN
    RAISE EXCEPTION 'azan audio approved=true requires license_status=approved';
  END IF;

  IF NEW.approved = true AND (NEW.approved_by IS NULL OR NEW.approved_at IS NULL) THEN
    RAISE EXCEPTION 'azan audio approved=true requires approved_by and approved_at';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION rahma_enforce_library_publication()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.published = true AND NEW.approved = false THEN
    RAISE EXCEPTION 'published library content must be approved';
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1. Chat conversations/messages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_conversations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  title                TEXT NOT NULL DEFAULT 'New conversation',
  mode                 TEXT NOT NULL DEFAULT 'ask_sheikh' CHECK (mode IN (
    'ask_sheikh',
    'quran_search',
    'prayer_azan',
    'children',
    'learning'
  )),
  language             TEXT NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en', 'auto')),
  child_safe           BOOLEAN NOT NULL DEFAULT FALSE,
  summary               TEXT,
  favourite            BOOLEAN NOT NULL DEFAULT FALSE,
  archived              BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_mode ON chat_conversations (mode, language);

CREATE TABLE IF NOT EXISTS chat_messages (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id      UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_role          TEXT NOT NULL CHECK (sender_role IN ('user', 'assistant', 'system', 'scholar', 'moderator')),
  message_text         TEXT NOT NULL,
  mode                 TEXT CHECK (mode IS NULL OR mode IN (
    'ask_sheikh',
    'quran_search',
    'prayer_azan',
    'children',
    'learning'
  )),
  language             TEXT NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en', 'auto')),
  status               TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'refused', 'blocked', 'no_source', 'answer_ready', 'pending_review')),
  refusal_reason       TEXT,
  citations_json       JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_ids           JSONB NOT NULL DEFAULT '[]'::jsonb,
  child_safe           BOOLEAN NOT NULL DEFAULT FALSE,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages (status, created_at DESC);

CREATE TABLE IF NOT EXISTS user_reports (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  message_id           UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  report_type          TEXT NOT NULL DEFAULT 'general' CHECK (report_type IN (
    'general',
    'unsafe_answer',
    'child_safety',
    'citation_problem',
    'scholar_review',
    'privacy',
    'technical'
  )),
  report_text          TEXT,
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'rejected')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS moderation_results (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type          TEXT NOT NULL DEFAULT 'content',
  target_id            TEXT NOT NULL DEFAULT '',
  policy_name          TEXT NOT NULL DEFAULT 'default',
  result               TEXT NOT NULL DEFAULT 'pass' CHECK (result IN ('pass', 'warn', 'block')),
  reason               TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_moderation_results_target ON moderation_results (target_type, target_id);

CREATE TABLE IF NOT EXISTS safety_policies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key           TEXT NOT NULL UNIQUE,
  policy_name          TEXT NOT NULL,
  policy_scope         TEXT NOT NULL DEFAULT 'general',
  description          TEXT,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocked_questions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash        TEXT NOT NULL CHECK (length(question_hash) = 64),
  normalized_question  TEXT NOT NULL,
  category             TEXT NOT NULL,
  reason               TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blocked_questions_hash ON blocked_questions (question_hash);

CREATE TABLE IF NOT EXISTS unsafe_answer_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash        TEXT NOT NULL CHECK (length(question_hash) = 64),
  answer_hash          TEXT NOT NULL CHECK (length(answer_hash) = 64),
  refusal_reason       TEXT NOT NULL,
  source_ids           JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS child_safety_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id     UUID REFERENCES children_profiles(id) ON DELETE SET NULL,
  event_type           TEXT NOT NULL,
  target_type          TEXT NOT NULL,
  target_id            TEXT NOT NULL,
  result               TEXT NOT NULL CHECK (result IN ('pass', 'warn', 'block')),
  reason               TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_child_safety_events_child ON child_safety_events (child_profile_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 1b. RAG and content indexes required by the contract.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rag_documents_approved ON rag_documents (approved) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_rag_chunks_source ON rag_chunks (source_id);
CREATE INDEX IF NOT EXISTS idx_library_items_approved ON library_items (approved) WHERE approved = true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rag_embeddings'
      AND column_name = 'embedding'
  ) THEN
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rag_embeddings_embedding_hnsw ON rag_embeddings USING hnsw (embedding vector_cosine_ops)';
    EXCEPTION
      WHEN OTHERS THEN
        BEGIN
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rag_embeddings_embedding_ivfflat ON rag_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
        EXCEPTION
          WHEN OTHERS THEN
            NULL;
        END;
    END;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 2. Notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_templates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key         TEXT NOT NULL UNIQUE,
  channel              TEXT NOT NULL CHECK (channel IN ('push', 'email', 'sms', 'local')),
  language             TEXT NOT NULL DEFAULT 'ar',
  title                TEXT NOT NULL,
  body_template        TEXT NOT NULL,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type    TEXT NOT NULL,
  channel              TEXT NOT NULL DEFAULT 'local' CHECK (channel IN ('push', 'email', 'sms', 'local')),
  enabled              BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start    TIME,
  quiet_hours_end      TIME,
  timezone             TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, notification_type, channel)
);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences (user_id, enabled);

CREATE TABLE IF NOT EXISTS notification_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_type    TEXT NOT NULL,
  template_key         TEXT REFERENCES notification_templates(template_key) ON DELETE SET NULL,
  payload_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status               TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  scheduled_for        TIMESTAMPTZ,
  sent_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_events_user ON notification_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_type    TEXT NOT NULL,
  channel              TEXT NOT NULL CHECK (channel IN ('push', 'email', 'sms', 'local')),
  status               TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  error_message        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_user ON notification_delivery_log (user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Privacy / compliance
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS privacy_policy_versions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version              TEXT NOT NULL,
  language             TEXT NOT NULL DEFAULT 'en',
  policy_text          TEXT NOT NULL,
  published_at         TIMESTAMPTZ,
  active               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (version, language)
);

CREATE TABLE IF NOT EXISTS user_policy_acceptance (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  policy_version_id    UUID NOT NULL REFERENCES privacy_policy_versions(id) ON DELETE CASCADE,
  accepted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash              TEXT CHECK (ip_hash IS NULL OR length(ip_hash) = 64),
  device_id            UUID REFERENCES user_devices(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, policy_version_id)
);

CREATE TABLE IF NOT EXISTS data_processing_records (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  processing_type      TEXT NOT NULL,
  purpose              TEXT NOT NULL,
  lawful_basis         TEXT,
  retention_until      TIMESTAMPTZ,
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  consent_type         TEXT NOT NULL,
  consent_value        BOOLEAN NOT NULL,
  consent_version      TEXT NOT NULL,
  event_source         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consent_events_user ON consent_events (user_id, consent_type, created_at DESC);

CREATE TABLE IF NOT EXISTS deletion_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  request_type         TEXT NOT NULL DEFAULT 'account_delete' CHECK (request_type IN ('account_delete', 'data_export', 'consent_withdraw')),
  status               TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'in_review', 'approved', 'processing', 'completed', 'rejected')),
  reason               TEXT,
  requested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user ON deletion_requests (user_id, status);

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events (created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. Admin governance
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  display_name         TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'disabled')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_roles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key             TEXT NOT NULL UNIQUE,
  title                TEXT NOT NULL,
  description          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_permissions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key       TEXT NOT NULL UNIQUE,
  title                TEXT NOT NULL,
  description          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key           TEXT NOT NULL UNIQUE,
  title                TEXT NOT NULL,
  description          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id        UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action               TEXT NOT NULL,
  target_type          TEXT NOT NULL,
  target_id            TEXT,
  before_json          JSONB,
  after_json           JSONB,
  reason               TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log (created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. System health / readiness
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_health_snapshots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component            TEXT NOT NULL,
  status               TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  details_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_system_health_snapshots_component ON system_health_snapshots (component, created_at DESC);

CREATE TABLE IF NOT EXISTS integration_checks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name           TEXT NOT NULL,
  target               TEXT,
  status               TEXT NOT NULL CHECK (status IN ('pass', 'warn', 'block', 'unknown')),
  details_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_integration_checks_name ON integration_checks (check_name, created_at DESC);

CREATE TABLE IF NOT EXISTS readiness_history (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_connected   BOOLEAN NOT NULL DEFAULT FALSE,
  rag_configured       BOOLEAN NOT NULL DEFAULT FALSE,
  llm_configured       BOOLEAN NOT NULL DEFAULT FALSE,
  wasm_runtime_configured BOOLEAN NOT NULL DEFAULT FALSE,
  mobile_api_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  production_ready     BOOLEAN NOT NULL DEFAULT FALSE,
  blockers             JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_readiness_history_created ON readiness_history (created_at DESC);

CREATE TABLE IF NOT EXISTS deployment_audit_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_name      TEXT NOT NULL,
  environment          TEXT NOT NULL,
  status               TEXT NOT NULL CHECK (status IN ('planned', 'deployed', 'failed', 'rolled_back')),
  blockers             JSONB NOT NULL DEFAULT '[]'::jsonb,
  details_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deployment_audit_log_created ON deployment_audit_log (created_at DESC);

-- -----------------------------------------------------------------------------
-- 6. WASM runtime governance
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wasm_modules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name          TEXT NOT NULL UNIQUE,
  module_type          TEXT NOT NULL CHECK (module_type IN ('policy_gate', 'citation_verifier', 'child_safety', 'prayer_rules', 'zakat_rules')),
  version              TEXT NOT NULL,
  file_path            TEXT NOT NULL,
  file_hash            TEXT NOT NULL CHECK (length(file_hash) = 64),
  active               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wasm_execution_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id            UUID NOT NULL REFERENCES wasm_modules(id) ON DELETE CASCADE,
  input_hash           TEXT NOT NULL CHECK (length(input_hash) = 64),
  result               TEXT NOT NULL CHECK (result IN ('allow', 'block', 'needs_review', 'error')),
  execution_ms         INTEGER NOT NULL DEFAULT 0 CHECK (execution_ms >= 0),
  error_message        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wasm_execution_logs_module ON wasm_execution_logs (module_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wasm_policy_results (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id            UUID REFERENCES wasm_modules(id) ON DELETE SET NULL,
  request_id           TEXT NOT NULL,
  input_hash           TEXT NOT NULL CHECK (length(input_hash) = 64),
  decision             TEXT NOT NULL CHECK (decision IN ('allow', 'block', 'needs_review')),
  reasons_json         JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wasm_policy_results_request ON wasm_policy_results (request_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 7. Optional payments / subscriptions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key             TEXT NOT NULL UNIQUE,
  title                TEXT NOT NULL,
  description          TEXT,
  price_cents          INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency             TEXT NOT NULL DEFAULT 'USD',
  billing_period       TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly', 'lifetime')),
  features_json        JSONB NOT NULL DEFAULT '[]'::jsonb,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_customers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider             TEXT NOT NULL,
  provider_customer_id TEXT NOT NULL,
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_customer_id),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id              UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  provider             TEXT,
  provider_subscription_id TEXT,
  auto_renew           BOOLEAN NOT NULL DEFAULT TRUE,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions (user_id, status);

CREATE TABLE IF NOT EXISTS payment_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider             TEXT NOT NULL,
  event_type           TEXT NOT NULL,
  event_id             TEXT NOT NULL UNIQUE,
  payload_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  subscription_id      UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  provider_invoice_id   TEXT,
  amount_cents         INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  currency             TEXT NOT NULL DEFAULT 'USD',
  status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'void', 'refunded')),
  issued_at            TIMESTAMPTZ,
  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices (user_id, status);

-- -----------------------------------------------------------------------------
-- 8. Constraints and triggers enforcing approved-source usage
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rahma_enforce_rag_document_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.approved = true AND (NEW.source_id IS NULL) THEN
    RAISE EXCEPTION 'approved RAG documents require source_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION rahma_enforce_rag_chunk_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.approved = true THEN
    IF NEW.source_id IS NULL THEN
      RAISE EXCEPTION 'approved RAG chunks require source_id';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM islamic_source_registry s
      WHERE s.id = NEW.source_id
        AND s.verification_status = 'approved'
        AND s.source_approved = true
    ) THEN
      RAISE EXCEPTION 'approved RAG chunks require an approved source';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION rahma_enforce_library_publication_with_source()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.published = true AND NEW.approved = false THEN
    RAISE EXCEPTION 'published library items require approved=true';
  END IF;
  IF NEW.approved = true THEN
    IF NEW.source_id IS NULL THEN
      RAISE EXCEPTION 'approved library items require source_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quran_audio_assets_approval ON quran_audio_assets;
CREATE TRIGGER trg_quran_audio_assets_approval
BEFORE INSERT OR UPDATE ON quran_audio_assets
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_approved_source();

DROP TRIGGER IF EXISTS trg_hadith_collections_approval ON hadith_collections;
CREATE TRIGGER trg_hadith_collections_approval
BEFORE INSERT OR UPDATE ON hadith_collections
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_approved_source();

DROP TRIGGER IF EXISTS trg_hadith_books_approval ON hadith_books;
CREATE TRIGGER trg_hadith_books_approval
BEFORE INSERT OR UPDATE ON hadith_books
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_approved_source();

DROP TRIGGER IF EXISTS trg_hadith_records_approval ON hadith_records;
CREATE TRIGGER trg_hadith_records_approval
BEFORE INSERT OR UPDATE ON hadith_records
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_approved_source();

DROP TRIGGER IF EXISTS trg_hadith_translations_approval ON hadith_translations;
CREATE TRIGGER trg_hadith_translations_approval
BEFORE INSERT OR UPDATE ON hadith_translations
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_approved_source();

DROP TRIGGER IF EXISTS trg_hadith_grades_approval ON hadith_grades;
CREATE TRIGGER trg_hadith_grades_approval
BEFORE INSERT OR UPDATE ON hadith_grades
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_approved_source();

DROP TRIGGER IF EXISTS trg_duas_approval ON duas;
CREATE TRIGGER trg_duas_approval
BEFORE INSERT OR UPDATE ON duas
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_approved_source();

DROP TRIGGER IF EXISTS trg_dua_translations_approval ON dua_translations;
CREATE TRIGGER trg_dua_translations_approval
BEFORE INSERT OR UPDATE ON dua_translations
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_approved_source();

DROP TRIGGER IF EXISTS trg_dua_audio_assets_approval ON dua_audio_assets;
CREATE TRIGGER trg_dua_audio_assets_approval
BEFORE INSERT OR UPDATE ON dua_audio_assets
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_approved_source();

DROP TRIGGER IF EXISTS trg_prayer_locations_approval ON prayer_locations;
CREATE TRIGGER trg_prayer_locations_approval
BEFORE INSERT OR UPDATE ON prayer_locations
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_approved_source();

DROP TRIGGER IF EXISTS trg_prayer_calculation_settings_approval ON prayer_calculation_settings;
CREATE TRIGGER trg_prayer_calculation_settings_approval
BEFORE INSERT OR UPDATE ON prayer_calculation_settings
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_approved_source();

DROP TRIGGER IF EXISTS trg_azan_audio_assets_approval ON azan_audio_assets;
CREATE TRIGGER trg_azan_audio_assets_approval
BEFORE INSERT OR UPDATE ON azan_audio_assets
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_azan_audio_approval();

DROP TRIGGER IF EXISTS trg_rag_documents_approval ON rag_documents;
CREATE TRIGGER trg_rag_documents_approval
BEFORE INSERT OR UPDATE ON rag_documents
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_rag_document_approval();

DROP TRIGGER IF EXISTS trg_rag_chunks_approval ON rag_chunks;
CREATE TRIGGER trg_rag_chunks_approval
BEFORE INSERT OR UPDATE ON rag_chunks
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_rag_chunk_approval();

DROP TRIGGER IF EXISTS trg_library_items_publication ON library_items;
CREATE TRIGGER trg_library_items_publication
BEFORE INSERT OR UPDATE ON library_items
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_library_publication_with_source();

DROP TRIGGER IF EXISTS trg_scholar_answers_approval ON scholar_answers;
CREATE TRIGGER trg_scholar_answers_approval
BEFORE INSERT OR UPDATE ON scholar_answers
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_scholar_answer_approval();

DROP TRIGGER IF EXISTS trg_public_qa_published ON public_qa;
CREATE OR REPLACE FUNCTION rahma_enforce_public_qa_publish()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.published = true THEN
    IF NOT EXISTS (
      SELECT 1
      FROM scholar_answers a
      WHERE a.id = NEW.answer_id
        AND a.status IN ('approved', 'published')
    ) THEN
      RAISE EXCEPTION 'published public_qa rows require an approved/published answer';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_public_qa_published
BEFORE INSERT OR UPDATE ON public_qa
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_public_qa_publish();

DROP TRIGGER IF EXISTS trg_islamic_source_registry_approval ON islamic_source_registry;
CREATE OR REPLACE FUNCTION rahma_enforce_source_registry_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source_approved = true THEN
    IF NEW.verification_status <> 'approved' THEN
      RAISE EXCEPTION 'source_approved=true requires verification_status=approved';
    END IF;
    IF NEW.approved_by_user_id IS NULL OR NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'source_approved=true requires approved_by_user_id and approved_at';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_islamic_source_registry_approval
BEFORE INSERT OR UPDATE ON islamic_source_registry
FOR EACH ROW EXECUTE FUNCTION rahma_enforce_source_registry_approval();

COMMIT;
