-- Rahma core schema foundation.
-- Optional pgvector support is documented below and intentionally commented so
-- the migration remains portable when the extension is unavailable.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Optional if the cluster has pgvector installed:
-- CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'parent', 'scholar_reviewer', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_language TEXT NOT NULL DEFAULT 'ar',
  country TEXT,
  city TEXT,
  madhhab_preference TEXT,
  calculation_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  age_group TEXT NOT NULL,
  content_level TEXT NOT NULL DEFAULT 'age_appropriate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('quran', 'hadith', 'dua', 'adhkar', 'tafsir', 'story', 'adhan_audio', 'scholarly_reference', 'manual_admin_entry')),
  source_url TEXT,
  license_status TEXT NOT NULL DEFAULT 'unknown' CHECK (license_status IN ('pending', 'approved', 'rejected', 'restricted', 'unknown')),
  source_approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_sources_provider_type ON content_sources (provider_type);
CREATE INDEX IF NOT EXISTS idx_content_sources_license_status ON content_sources (license_status);
CREATE INDEX IF NOT EXISTS idx_content_sources_source_approved ON content_sources (source_approved);

CREATE TABLE IF NOT EXISTS islamic_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES content_sources(id) ON DELETE RESTRICT,
  content_type TEXT NOT NULL CHECK (content_type IN ('quran', 'hadith', 'dua', 'adhkar', 'tafsir', 'story', 'fatwa_reference', 'general_guidance')),
  title_ar TEXT,
  title_en TEXT,
  body_ar TEXT NOT NULL,
  body_en TEXT,
  topic TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  language TEXT NOT NULL DEFAULT 'ar',
  madhhab TEXT,
  confidence_level TEXT NOT NULL DEFAULT 'medium',
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'pending_review', 'approved', 'rejected', 'needs_scholar_review')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_islamic_content_type ON islamic_content (content_type);
CREATE INDEX IF NOT EXISTS idx_islamic_content_review_status ON islamic_content (review_status);

CREATE TABLE IF NOT EXISTS quran_surahs (
  id BIGSERIAL PRIMARY KEY,
  surah_number INTEGER NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  revelation_type TEXT NOT NULL,
  ayah_count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quran_surahs_number ON quran_surahs (surah_number);

CREATE TABLE IF NOT EXISTS quran_ayahs (
  id BIGSERIAL PRIMARY KEY,
  surah_number INTEGER NOT NULL REFERENCES quran_surahs(surah_number) ON DELETE CASCADE,
  ayah_number INTEGER NOT NULL,
  text_ar TEXT NOT NULL,
  juz INTEGER NOT NULL,
  page_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (surah_number, ayah_number)
);
CREATE INDEX IF NOT EXISTS idx_quran_ayahs_surah_ayah ON quran_ayahs (surah_number, ayah_number);

CREATE TABLE IF NOT EXISTS quran_translations (
  id BIGSERIAL PRIMARY KEY,
  ayah_id BIGINT NOT NULL REFERENCES quran_ayahs(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  translator TEXT NOT NULL,
  translation_text TEXT NOT NULL,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  review_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quran_tafsir (
  id BIGSERIAL PRIMARY KEY,
  ayah_id BIGINT NOT NULL REFERENCES quran_ayahs(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  tafsir_text TEXT NOT NULL,
  tafsir_source TEXT NOT NULL,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  review_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hadith_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_hadith_collections_source_id ON hadith_collections (source_id);

CREATE TABLE IF NOT EXISTS hadith_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES hadith_collections(id) ON DELETE CASCADE,
  hadith_number TEXT NOT NULL,
  book_name TEXT,
  chapter_name TEXT,
  text_ar TEXT NOT NULL,
  text_en TEXT,
  grade TEXT,
  narrator TEXT,
  source_reference TEXT,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  review_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hadith_entries_collection_id ON hadith_entries (collection_id);

CREATE TABLE IF NOT EXISTS dua_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dua_categories_sort_order ON dua_categories (sort_order);

CREATE TABLE IF NOT EXISTS dua_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES dua_categories(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  dua_ar TEXT NOT NULL,
  transliteration TEXT,
  translation_en TEXT,
  source_reference TEXT,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  review_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dua_entries_category_id ON dua_entries (category_id);

CREATE TABLE IF NOT EXISTS adhan_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar TEXT NOT NULL,
  title_en TEXT,
  reciter_name TEXT,
  source_url TEXT,
  license_status TEXT NOT NULL DEFAULT 'unknown',
  approval_status TEXT NOT NULL DEFAULT 'draft',
  file_hash TEXT,
  duration_seconds INTEGER,
  storage_path TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prayer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country TEXT,
  city TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  calculation_method TEXT,
  madhhab TEXT,
  adhan_audio_id UUID REFERENCES adhan_audio(id) ON DELETE SET NULL,
  notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  fajr_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  jummah_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prayer_settings_city_date ON prayer_settings (city, calculation_method);

CREATE TABLE IF NOT EXISTS prayer_times_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT,
  city TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  calculation_method TEXT,
  madhhab TEXT,
  prayer_date DATE NOT NULL,
  fajr TIME NOT NULL,
  sunrise TIME NOT NULL,
  dhuhr TIME NOT NULL,
  asr TIME NOT NULL,
  maghrib TIME NOT NULL,
  isha TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prayer_times_cache_city_date ON prayer_times_cache (city, prayer_date);

CREATE TABLE IF NOT EXISTS ask_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  language TEXT NOT NULL,
  category TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'answered_from_database', 'answered_with_rag', 'needs_scholar_review', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ask_questions_user_status ON ask_questions (user_id, status);

CREATE TABLE IF NOT EXISTS ask_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES ask_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  language TEXT NOT NULL,
  answer_mode TEXT NOT NULL CHECK (answer_mode IN ('database', 'rag', 'llm_draft', 'scholar_review')),
  confidence_level TEXT NOT NULL,
  review_status TEXT NOT NULL,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ask_answers_question_id ON ask_answers (question_id);
CREATE INDEX IF NOT EXISTS idx_ask_answers_review_status ON ask_answers (review_status);

CREATE TABLE IF NOT EXISTS ask_answer_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES ask_answers(id) ON DELETE CASCADE,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  content_id UUID REFERENCES islamic_content(id) ON DELETE SET NULL,
  citation_label TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL,
  item_id UUID NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue (status);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS children_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;