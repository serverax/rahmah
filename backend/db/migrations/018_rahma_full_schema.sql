-- =============================================================================
-- Rahma migration 018 — full PostgreSQL schema completion
-- File: backend/db/migrations/018_rahma_full_schema.sql
-- =============================================================================
-- This migration is additive. It completes the schema for:
--   - core users/access/privacy
--   - Quran content metadata
--   - Hadith content metadata
--   - Dua / adhkar
--   - Prayer / azan
--   - RAG / embeddings / retrieval
--   - Ask Sheikh Hasan / scholar review
--   - children learning
--   - library / bookmarks / downloads
--
-- Rules:
--   - No fake seed data.
--   - No secrets.
--   - All Islamic content remains gated by source approval.
--   - pgcrypto is required for UUID generation.
--   - pgvector is optional; if unavailable, the schema still applies.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS vector';
  END IF;
END
$$;

-- =============================================================================
-- 1. Core users and access
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('user', 'parent', 'scholar', 'sheikh', 'admin', 'moderator', 'content_reviewer', 'charity_admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check') THEN
    ALTER TABLE users
      ADD CONSTRAINT users_status_check
      CHECK (status IN ('active', 'suspended', 'deleted'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone ON users (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);

CREATE TABLE IF NOT EXISTS user_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_language   TEXT NOT NULL DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en', 'auto')),
  country              TEXT,
  city                 TEXT,
  madhhab_preference   TEXT,
  calculation_method   TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_language ON user_profiles (preferred_language);

CREATE TABLE IF NOT EXISTS user_devices (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  device_hash          TEXT NOT NULL UNIQUE CHECK (length(device_hash) = 64),
  device_name          TEXT,
  platform             TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web', 'unknown')),
  app_version          TEXT NOT NULL,
  locale               TEXT NOT NULL DEFAULT 'ar',
  push_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  trusted              BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices (user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_platform ON user_devices (platform);

CREATE TABLE IF NOT EXISTS user_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id            UUID REFERENCES user_devices(id) ON DELETE SET NULL,
  session_token_hash   TEXT NOT NULL UNIQUE CHECK (length(session_token_hash) = 64),
  refresh_token_hash   TEXT UNIQUE CHECK (length(refresh_token_hash) = 64),
  session_kind         TEXT NOT NULL DEFAULT 'guest' CHECK (session_kind IN ('guest', 'device', 'passwordless', 'oidc')),
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  expires_at           TIMESTAMPTZ NOT NULL,
  last_seen_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_device ON user_sessions (device_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions (expires_at DESC);

CREATE TABLE IF NOT EXISTS user_preferences (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id            UUID REFERENCES user_devices(id) ON DELETE CASCADE,
  language             TEXT NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en', 'auto')),
  theme                TEXT NOT NULL DEFAULT 'auto' CHECK (theme IN ('auto', 'light', 'dark', 'emerald', 'ivory')),
  font_size            NUMERIC(4,2) NOT NULL DEFAULT 1.00 CHECK (font_size >= 0.75 AND font_size <= 1.75),
  child_mode_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  prayer_location_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  guest_mode_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  show_sources_always  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_preferences_user ON user_preferences (user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_preferences_device ON user_preferences (device_id) WHERE device_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_consents (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id            UUID REFERENCES user_devices(id) ON DELETE CASCADE,
  consent_type         TEXT NOT NULL CHECK (consent_type IN (
    'privacy',
    'terms',
    'notifications',
    'location',
    'child_profile',
    'content_sources',
    'data_export',
    'data_delete'
  )),
  consent_version      TEXT NOT NULL,
  consent_value        BOOLEAN NOT NULL,
  source               TEXT,
  consented_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at           TIMESTAMPTZ,
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents (user_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_device ON user_consents (device_id, consent_type);

CREATE TABLE IF NOT EXISTS user_delete_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  request_type         TEXT NOT NULL DEFAULT 'account_delete' CHECK (request_type IN ('account_delete', 'data_export', 'consent_withdraw')),
  status               TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'in_review', 'approved', 'processing', 'completed', 'rejected')),
  reason               TEXT,
  requested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at         TIMESTAMPTZ,
  processed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_delete_requests_user ON user_delete_requests (user_id, status);

-- =============================================================================
-- 2. Quran module
-- =============================================================================

ALTER TABLE quran_surahs
  ADD COLUMN IF NOT EXISTS surah_number INTEGER,
  ADD COLUMN IF NOT EXISTS arabic_name TEXT,
  ADD COLUMN IF NOT EXISTS english_name TEXT,
  ADD COLUMN IF NOT EXISTS revelation_type TEXT,
  ADD COLUMN IF NOT EXISTS display_order INTEGER,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE quran_surahs
SET
  surah_number = COALESCE(surah_number, id),
  arabic_name = COALESCE(arabic_name, name_ar),
  english_name = COALESCE(english_name, name_en),
  revelation_type = COALESCE(revelation_type, revelation_place),
  display_order = COALESCE(display_order, id)
WHERE
  surah_number IS NULL
  OR arabic_name IS NULL
  OR english_name IS NULL
  OR revelation_type IS NULL
  OR display_order IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_quran_surahs_surah_number ON quran_surahs (surah_number);
CREATE INDEX IF NOT EXISTS idx_quran_surahs_display_order ON quran_surahs (display_order);

ALTER TABLE quran_ayahs
  ADD COLUMN IF NOT EXISTS arabic_text TEXT,
  ADD COLUMN IF NOT EXISTS normalized_text TEXT,
  ADD COLUMN IF NOT EXISTS hizb INTEGER,
  ADD COLUMN IF NOT EXISTS page_number INTEGER,
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE quran_ayahs
SET
  arabic_text = COALESCE(arabic_text, text_uthmani),
  page_number = COALESCE(page_number, page)
WHERE arabic_text IS NULL OR page_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_quran_ayahs_approved ON quran_ayahs (approved) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_quran_ayahs_source ON quran_ayahs (source_id);

ALTER TABLE quran_translations
  ADD COLUMN IF NOT EXISTS ayah_id BIGINT,
  ADD COLUMN IF NOT EXISTS translation_text TEXT,
  ADD COLUMN IF NOT EXISTS translator_name TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE quran_translations
SET
  translation_text = COALESCE(translation_text, text),
  translator_name = COALESCE(translator_name, translator)
WHERE translation_text IS NULL OR translator_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_quran_translations_ayah ON quran_translations (ayah_id);
CREATE INDEX IF NOT EXISTS idx_quran_translations_language ON quran_translations (language);

CREATE TABLE IF NOT EXISTS quran_tafsir_notes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ayah_id              BIGINT NOT NULL REFERENCES quran_ayahs(id) ON DELETE CASCADE,
  language             TEXT NOT NULL DEFAULT 'ar',
  tafsir_text          TEXT NOT NULL,
  tafsir_source        TEXT NOT NULL,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quran_tafsir_notes_ayah ON quran_tafsir_notes (ayah_id);
CREATE INDEX IF NOT EXISTS idx_quran_tafsir_notes_approved ON quran_tafsir_notes (approved) WHERE approved = true;

CREATE TABLE IF NOT EXISTS quran_bookmarks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  ayah_id              BIGINT NOT NULL REFERENCES quran_ayahs(id) ON DELETE CASCADE,
  note                 TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ayah_id)
);

CREATE TABLE IF NOT EXISTS quran_audio_assets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  reciter_name         TEXT NOT NULL,
  surah_id             INTEGER REFERENCES quran_surahs(surah_number) ON DELETE SET NULL,
  ayah_number          INTEGER,
  title_ar             TEXT,
  title_en             TEXT,
  file_path            TEXT,
  source_url           TEXT,
  license_status       TEXT NOT NULL DEFAULT 'needs_review' CHECK (license_status IN ('approved', 'needs_review', 'rejected', 'restricted', 'unknown')),
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at          TIMESTAMPTZ,
  file_hash            TEXT,
  duration_seconds     INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quran_audio_assets_surah ON quran_audio_assets (surah_id, ayah_number);

-- =============================================================================
-- 3. Hadith module
-- =============================================================================

CREATE TABLE IF NOT EXISTS hadith_collections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar             TEXT NOT NULL,
  title_en             TEXT,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  license_status       TEXT NOT NULL DEFAULT 'needs_review' CHECK (license_status IN ('approved', 'needs_review', 'rejected', 'restricted', 'unknown')),
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hadith_books (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id        UUID NOT NULL REFERENCES hadith_collections(id) ON DELETE CASCADE,
  book_number          TEXT,
  title_ar             TEXT NOT NULL,
  title_en             TEXT,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hadith_books_collection ON hadith_books (collection_id);

CREATE TABLE IF NOT EXISTS hadith_records (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id        UUID NOT NULL REFERENCES hadith_collections(id) ON DELETE CASCADE,
  book_id              UUID REFERENCES hadith_books(id) ON DELETE SET NULL,
  hadith_number        TEXT NOT NULL,
  arabic_text          TEXT NOT NULL,
  translation_text     TEXT,
  narrator             TEXT,
  grade                TEXT,
  reference_label      TEXT,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hadith_records_collection ON hadith_records (collection_id);
CREATE INDEX IF NOT EXISTS idx_hadith_records_book ON hadith_records (book_id);

CREATE TABLE IF NOT EXISTS hadith_translations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hadith_record_id     UUID NOT NULL REFERENCES hadith_records(id) ON DELETE CASCADE,
  language             TEXT NOT NULL,
  translation_text     TEXT NOT NULL,
  translator_name      TEXT,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hadith_translations_record ON hadith_translations (hadith_record_id);

CREATE TABLE IF NOT EXISTS hadith_grades (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hadith_record_id     UUID NOT NULL REFERENCES hadith_records(id) ON DELETE CASCADE,
  grade_value          TEXT NOT NULL,
  grading_body         TEXT,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. Dua and adhkar module
-- =============================================================================

CREATE TABLE IF NOT EXISTS dua_categories (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar             TEXT NOT NULL,
  title_en             TEXT,
  description_ar       TEXT,
  description_en       TEXT,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS duas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id          UUID NOT NULL REFERENCES dua_categories(id) ON DELETE CASCADE,
  title_ar             TEXT NOT NULL,
  title_en             TEXT,
  arabic_text          TEXT NOT NULL,
  transliteration      TEXT,
  source_reference     TEXT NOT NULL,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_duas_category ON duas (category_id);
CREATE INDEX IF NOT EXISTS idx_duas_approved ON duas (approved) WHERE approved = true;

CREATE TABLE IF NOT EXISTS dua_translations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dua_id               UUID NOT NULL REFERENCES duas(id) ON DELETE CASCADE,
  language             TEXT NOT NULL DEFAULT 'en',
  translation_text     TEXT NOT NULL,
  translator_name      TEXT,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dua_translations_dua ON dua_translations (dua_id);

CREATE TABLE IF NOT EXISTS dua_audio_assets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dua_id               UUID REFERENCES duas(id) ON DELETE SET NULL,
  title_ar             TEXT,
  title_en             TEXT,
  reciter_name         TEXT,
  file_path            TEXT,
  source_url           TEXT,
  license_status       TEXT NOT NULL DEFAULT 'needs_review' CHECK (license_status IN ('approved', 'needs_review', 'rejected', 'restricted', 'unknown')),
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at          TIMESTAMPTZ,
  file_hash            TEXT,
  duration_seconds     INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_favourite_duas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  dua_id               UUID NOT NULL REFERENCES duas(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, dua_id)
);

-- =============================================================================
-- 5. Prayer and Azan module
-- =============================================================================

CREATE TABLE IF NOT EXISTS prayer_locations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country              TEXT,
  city                 TEXT,
  latitude             NUMERIC(10,7) NOT NULL,
  longitude            NUMERIC(10,7) NOT NULL,
  timezone             TEXT NOT NULL,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prayer_locations_city ON prayer_locations (country, city);

CREATE TABLE IF NOT EXISTS prayer_calculation_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_code          TEXT NOT NULL,
  method_name          TEXT NOT NULL,
  madhab               TEXT NOT NULL CHECK (madhab IN ('shafi', 'hanafi')),
  parameters_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_prayer_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  calculation_method   TEXT NOT NULL,
  madhab               TEXT NOT NULL CHECK (madhab IN ('shafi', 'hanafi')),
  location_lat         NUMERIC(10,7),
  location_lng         NUMERIC(10,7),
  city                 TEXT,
  country              TEXT,
  azan_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  selected_azan_audio_id UUID REFERENCES azan_audio_assets(id) ON DELETE SET NULL,
  reminder_minutes_before INTEGER NOT NULL DEFAULT 10,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS azan_audio_assets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar             TEXT NOT NULL,
  title_en             TEXT,
  reciter_name         TEXT NOT NULL,
  file_path            TEXT NOT NULL,
  source_url           TEXT,
  license_status       TEXT NOT NULL CHECK (license_status IN ('approved', 'needs_review', 'rejected', 'restricted', 'unknown')),
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at          TIMESTAMPTZ,
  file_hash            TEXT,
  duration_seconds     INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_azan_audio_assets_approved ON azan_audio_assets (approved) WHERE approved = true;

CREATE TABLE IF NOT EXISTS azan_audio_approvals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azan_audio_asset_id  UUID NOT NULL REFERENCES azan_audio_assets(id) ON DELETE CASCADE,
  reviewer_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  status               TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'needs_review')),
  reason               TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_schedule (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_type    TEXT NOT NULL,
  prayer_name          TEXT,
  minutes_before       INTEGER NOT NULL DEFAULT 0,
  enabled              BOOLEAN NOT NULL DEFAULT TRUE,
  scheduled_for_time   TIME,
  timezone             TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_schedule_user ON notification_schedule (user_id, notification_type);

-- =============================================================================
-- 6. RAG / embeddings / retrieval
-- =============================================================================

CREATE TABLE IF NOT EXISTS rag_documents (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  title                TEXT NOT NULL,
  document_type        TEXT NOT NULL CHECK (document_type IN ('quran', 'hadith', 'dua', 'fiqh', 'article', 'children', 'prayer')),
  language             TEXT NOT NULL DEFAULT 'ar',
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  approval_status      TEXT NOT NULL DEFAULT 'pending_review' CHECK (approval_status IN ('pending_review', 'approved', 'rejected', 'blocked')),
  effective_from       DATE,
  effective_to         DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rag_documents_type_status ON rag_documents (document_type, approval_status);
CREATE INDEX IF NOT EXISTS idx_rag_documents_source ON rag_documents (source_id);

CREATE TABLE IF NOT EXISTS rag_chunks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id          UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  chunk_text           TEXT NOT NULL,
  chunk_order          INTEGER NOT NULL DEFAULT 0,
  language             TEXT NOT NULL DEFAULT 'ar',
  content_type         TEXT NOT NULL DEFAULT 'article',
  citation_label       TEXT NOT NULL,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_document ON rag_chunks (document_id, chunk_order);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_approved ON rag_chunks (approved) WHERE approved = true;

CREATE TABLE IF NOT EXISTS rag_embeddings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id             UUID NOT NULL REFERENCES rag_chunks(id) ON DELETE CASCADE,
  embedding_model      TEXT NOT NULL,
  embedding_jsonb      JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    BEGIN
      ALTER TABLE rag_embeddings ADD COLUMN IF NOT EXISTS embedding vector;
    EXCEPTION WHEN undefined_object THEN
      NULL;
    END;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_rag_embeddings_chunk ON rag_embeddings (chunk_id);
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_model ON rag_embeddings (embedding_model);

CREATE TABLE IF NOT EXISTS rag_retrieval_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  query_text           TEXT NOT NULL,
  language             TEXT NOT NULL DEFAULT 'ar',
  retrieved_chunk_ids  JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_chunks_count INTEGER NOT NULL DEFAULT 0,
  llm_called           BOOLEAN NOT NULL DEFAULT FALSE,
  refusal_reason       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rag_retrieval_logs_created ON rag_retrieval_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS rag_answer_cache (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash        TEXT NOT NULL CHECK (length(question_hash) = 64),
  normalized_question  TEXT NOT NULL,
  answer_text          TEXT NOT NULL,
  language             TEXT NOT NULL DEFAULT 'ar',
  citation_json        JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_ids           JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rag_answer_cache_question_hash ON rag_answer_cache (question_hash);

CREATE TABLE IF NOT EXISTS rag_rejected_answers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash        TEXT NOT NULL CHECK (length(question_hash) = 64),
  refusal_reason       TEXT NOT NULL,
  language             TEXT NOT NULL DEFAULT 'ar',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rag_policy_results (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash        TEXT NOT NULL CHECK (length(question_hash) = 64),
  decision             TEXT NOT NULL CHECK (decision IN ('allow', 'block', 'needs_review')),
  reason               TEXT,
  citation_json        JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_ids           JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rag_policy_results_decision ON rag_policy_results (decision, created_at DESC);

-- =============================================================================
-- 7. Ask Sheikh Hasan / scholar review
-- =============================================================================

CREATE TABLE IF NOT EXISTS scholar_questions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  question_text        TEXT NOT NULL,
  category             TEXT NOT NULL,
  language             TEXT NOT NULL DEFAULT 'ar',
  privacy_level        TEXT NOT NULL CHECK (privacy_level IN ('private', 'public_anonymised')),
  urgency              TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high')),
  status               TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'answered', 'rejected', 'needs_more_info')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scholar_questions_status ON scholar_questions (status, created_at DESC);

CREATE TABLE IF NOT EXISTS scholar_answers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id          UUID NOT NULL REFERENCES scholar_questions(id) ON DELETE CASCADE,
  reviewer_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  answer_text          TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'published')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scholar_answer_sources (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id            UUID NOT NULL REFERENCES scholar_answers(id) ON DELETE CASCADE,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  citation_label       TEXT NOT NULL,
  citation_url         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scholar_review_status (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id          UUID NOT NULL REFERENCES scholar_questions(id) ON DELETE CASCADE,
  reviewer_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  status               TEXT NOT NULL CHECK (status IN ('submitted', 'under_review', 'answered', 'rejected', 'needs_more_info')),
  reason               TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public_qa (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id          UUID NOT NULL REFERENCES scholar_questions(id) ON DELETE CASCADE,
  answer_id            UUID NOT NULL REFERENCES scholar_answers(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  slug                 TEXT NOT NULL UNIQUE,
  language             TEXT NOT NULL DEFAULT 'ar',
  category             TEXT NOT NULL,
  published            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_qa_category ON public_qa (category, language);

-- =============================================================================
-- 8. Children learning module
-- =============================================================================

CREATE TABLE IF NOT EXISTS children_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  display_name         TEXT NOT NULL,
  age_group            TEXT NOT NULL CHECK (age_group IN ('3-5', '6-8', '9-12', '13+')),
  content_level        TEXT NOT NULL DEFAULT 'starter',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_children_profiles_parent ON children_profiles (parent_user_id);

CREATE TABLE IF NOT EXISTS children_learning_paths (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id     UUID NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
  title_ar             TEXT NOT NULL,
  title_en             TEXT,
  description          TEXT,
  age_group            TEXT NOT NULL CHECK (age_group IN ('3-5', '6-8', '9-12', '13+')),
  goals_json           JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS children_game_scenarios (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar             TEXT NOT NULL,
  title_en             TEXT,
  scenario_text        TEXT NOT NULL,
  age_min              INTEGER NOT NULL,
  age_max              INTEGER NOT NULL,
  category             TEXT NOT NULL,
  options              JSONB NOT NULL,
  correct_option       TEXT NOT NULL,
  explanation          TEXT,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  child_safe           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (age_min >= 3 AND age_max >= age_min)
);
CREATE INDEX IF NOT EXISTS idx_children_game_scenarios_category ON children_game_scenarios (category, age_min, age_max);

CREATE TABLE IF NOT EXISTS children_game_attempts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id     UUID NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
  scenario_id          UUID NOT NULL REFERENCES children_game_scenarios(id) ON DELETE CASCADE,
  selected_option      TEXT,
  is_correct           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_children_game_attempts_child ON children_game_attempts (child_profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS children_rewards (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id     UUID REFERENCES children_profiles(id) ON DELETE CASCADE,
  reward_type          TEXT NOT NULL,
  reward_points        INTEGER NOT NULL DEFAULT 0,
  label_ar             TEXT NOT NULL,
  label_en             TEXT,
  description          TEXT,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS children_safety_flags (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id     UUID REFERENCES children_profiles(id) ON DELETE CASCADE,
  entity_type          TEXT NOT NULL,
  entity_id            TEXT NOT NULL,
  flag_type            TEXT NOT NULL,
  reason               TEXT,
  severity             TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'blocked', 'resolved')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parent_controls (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_profile_id     UUID NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
  allowed_categories_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocked_topics_json  JSONB NOT NULL DEFAULT '[]'::jsonb,
  chat_mode_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  ask_sheikh_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_user_id, child_profile_id)
);

-- =============================================================================
-- 9. Library/content module
-- =============================================================================

CREATE TABLE IF NOT EXISTS library_categories (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 TEXT NOT NULL UNIQUE,
  title_ar             TEXT NOT NULL,
  title_en             TEXT,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id          UUID REFERENCES library_categories(id) ON DELETE SET NULL,
  source_id            UUID REFERENCES islamic_source_registry(id) ON DELETE SET NULL,
  title_ar             TEXT NOT NULL,
  title_en             TEXT,
  content_type         TEXT NOT NULL CHECK (content_type IN ('quran', 'hadith', 'dua', 'prayer', 'children', 'fiqh', 'library', 'article')),
  language             TEXT NOT NULL DEFAULT 'ar',
  summary              TEXT,
  body_text            TEXT NOT NULL,
  approved             BOOLEAN NOT NULL DEFAULT FALSE,
  published            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_library_items_category ON library_items (category_id);
CREATE INDEX IF NOT EXISTS idx_library_items_content_type ON library_items (content_type, language);

CREATE TABLE IF NOT EXISTS library_item_tags (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_item_id      UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  tag                  TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_library_item_tags_item ON library_item_tags (library_item_id, tag);

CREATE TABLE IF NOT EXISTS user_library_bookmarks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  library_item_id      UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  note                 TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, library_item_id)
);

CREATE TABLE IF NOT EXISTS library_downloads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  library_item_id      UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  download_status      TEXT NOT NULL DEFAULT 'queued' CHECK (download_status IN ('queued', 'downloaded', 'failed', 'expired')),
  file_hash            TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
