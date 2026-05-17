-- =============================================================================
-- Rahma migration 014 — Native Modules Foundation
-- File: backend/db/migrations/014_native_modules_foundation.sql
-- =============================================================================
-- Adds foundation for Quran, Prayer, and Mosque features.
-- =============================================================================

BEGIN;

-- 1. quran_surahs
CREATE TABLE IF NOT EXISTS quran_surahs (
  id                    INTEGER PRIMARY KEY,
  name_ar               TEXT NOT NULL,
  name_en               TEXT NOT NULL,
  revelation_type       TEXT NOT NULL CHECK (revelation_type IN ('Meccan', 'Medinan')),
  total_ayahs           INTEGER NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. quran_ayahs
CREATE TABLE IF NOT EXISTS quran_ayahs (
  id                    INTEGER PRIMARY KEY,
  surah_id              INTEGER NOT NULL REFERENCES quran_surahs(id) ON DELETE CASCADE,
  ayah_number           INTEGER NOT NULL,
  text_ar               TEXT NOT NULL,
  text_en               TEXT,
  audio_url             TEXT,
  page_number           INTEGER,
  juz_number            INTEGER,
  UNIQUE (surah_id, ayah_number)
);
CREATE INDEX IF NOT EXISTS idx_qa_surah ON quran_ayahs (surah_id);

-- 3. user_bookmarks (Quran)
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES sakina_users(id) ON DELETE CASCADE,
  ayah_id               INTEGER NOT NULL REFERENCES quran_ayahs(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ayah_id)
);

-- 4. prayer_calculation_settings
CREATE TABLE IF NOT EXISTS user_prayer_settings (
  user_id               UUID PRIMARY KEY REFERENCES sakina_users(id) ON DELETE CASCADE,
  calculation_method    TEXT NOT NULL DEFAULT 'MuslimWorldLeague',
  asr_method            TEXT NOT NULL DEFAULT 'Standard',
  latitude              NUMERIC(10, 7),
  longitude             NUMERIC(10, 7),
  city                  TEXT,
  country               TEXT,
  timezone              TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. user_azan_preferences
CREATE TABLE IF NOT EXISTS user_azan_preferences (
  user_id               UUID REFERENCES sakina_users(id) ON DELETE CASCADE,
  prayer_name           TEXT NOT NULL CHECK (prayer_name IN ('Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha')),
  is_enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  sound_type            TEXT NOT NULL DEFAULT 'default',
  reminder_minutes      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, prayer_name)
);

COMMIT;
