-- =============================================================================
-- Sakina foundation migration (PostgreSQL)
-- File: backend/db/migrations/001_sakina_foundation.sql
-- =============================================================================
-- Creates the 20 foundational tables for sakina-islamic-app.
--
-- Integrity rule (enforced via DEFERRABLE CONSTRAINT TRIGGER below):
--   No row in ibadat_answers with blocked = FALSE may exist without at
--   least one linked row in ibadat_answer_sources pointing to a record
--   in ibadat_sources.
--
-- All textual content is Arabic-first (text columns are UTF-8 / collation
-- default; the DB should be created with `LC_COLLATE='C'` or `und-x-icu`
-- for predictable Arabic sort order — handled at DB-init time, not here).
-- =============================================================================

BEGIN;

-- Optional extensions (kept minimal). Uncomment when pgvector is required
-- for the knowledge-base in a later sprint:
-- CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()

-- =============================================================================
-- 1. users
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale        TEXT NOT NULL DEFAULT 'ar',
  city          TEXT,
  calc_method   TEXT NOT NULL DEFAULT 'umm_al_qura',
  madhhab_asr   TEXT NOT NULL DEFAULT 'shafii',
  theme         TEXT NOT NULL DEFAULT 'auto',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. prayer_times
-- =============================================================================
CREATE TABLE IF NOT EXISTS prayer_times (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  city          TEXT NOT NULL,
  date_g        DATE NOT NULL,
  fajr          TIME NOT NULL,
  sunrise       TIME NOT NULL,
  dhuhr         TIME NOT NULL,
  asr           TIME NOT NULL,
  maghrib       TIME NOT NULL,
  isha          TIME NOT NULL,
  calc_method   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, city, date_g, calc_method)
);
CREATE INDEX IF NOT EXISTS idx_prayer_times_city_date ON prayer_times (city, date_g);

-- =============================================================================
-- 3. quran_surahs
-- =============================================================================
CREATE TABLE IF NOT EXISTS quran_surahs (
  id                INTEGER PRIMARY KEY CHECK (id BETWEEN 1 AND 114),
  name_ar           TEXT NOT NULL,
  name_en           TEXT NOT NULL,
  revelation_place  TEXT NOT NULL CHECK (revelation_place IN ('makki', 'madani')),
  ayah_count        INTEGER NOT NULL CHECK (ayah_count > 0)
);

-- =============================================================================
-- 4. quran_ayahs
-- =============================================================================
CREATE TABLE IF NOT EXISTS quran_ayahs (
  id            BIGSERIAL PRIMARY KEY,
  surah_id      INTEGER NOT NULL REFERENCES quran_surahs(id) ON DELETE RESTRICT,
  ayah_number   INTEGER NOT NULL CHECK (ayah_number > 0),
  text_uthmani  TEXT NOT NULL,
  juz           INTEGER NOT NULL CHECK (juz BETWEEN 1 AND 30),
  page          INTEGER NOT NULL CHECK (page BETWEEN 1 AND 604),
  UNIQUE (surah_id, ayah_number)
);
CREATE INDEX IF NOT EXISTS idx_quran_ayahs_juz_page ON quran_ayahs (juz, page);

-- =============================================================================
-- 5. quran_tafsir
-- =============================================================================
CREATE TABLE IF NOT EXISTS quran_tafsir (
  id            BIGSERIAL PRIMARY KEY,
  surah_id      INTEGER NOT NULL REFERENCES quran_surahs(id) ON DELETE RESTRICT,
  ayah_number   INTEGER NOT NULL CHECK (ayah_number > 0),
  tafsir_id     TEXT NOT NULL,           -- 'muyassar' | 'saadi' | ...
  text_ar       TEXT NOT NULL,
  UNIQUE (tafsir_id, surah_id, ayah_number)
);

-- =============================================================================
-- 6. quran_translations
-- =============================================================================
CREATE TABLE IF NOT EXISTS quran_translations (
  id            BIGSERIAL PRIMARY KEY,
  surah_id      INTEGER NOT NULL REFERENCES quran_surahs(id) ON DELETE RESTRICT,
  ayah_number   INTEGER NOT NULL CHECK (ayah_number > 0),
  language      TEXT NOT NULL,           -- 'en','fr','ur',...
  translator    TEXT NOT NULL,
  text          TEXT NOT NULL,
  UNIQUE (language, translator, surah_id, ayah_number)
);

-- =============================================================================
-- 7. adhkar_categories
-- =============================================================================
CREATE TABLE IF NOT EXISTS adhkar_categories (
  id        SERIAL PRIMARY KEY,
  slug      TEXT NOT NULL UNIQUE,        -- 'morning','evening','sleep',...
  name_ar   TEXT NOT NULL
);

-- =============================================================================
-- 8. adhkar_items
-- =============================================================================
CREATE TABLE IF NOT EXISTS adhkar_items (
  id            BIGSERIAL PRIMARY KEY,
  category_id   INTEGER NOT NULL REFERENCES adhkar_categories(id) ON DELETE CASCADE,
  text_ar       TEXT NOT NULL,
  repeat_count  INTEGER NOT NULL DEFAULT 1 CHECK (repeat_count > 0),
  source_ref    TEXT NOT NULL                 -- e.g. 'Sahih Bukhari 6306'
);
CREATE INDEX IF NOT EXISTS idx_adhkar_items_category ON adhkar_items (category_id);

-- =============================================================================
-- 9. hijri_events
-- =============================================================================
CREATE TABLE IF NOT EXISTS hijri_events (
  id            SERIAL PRIMARY KEY,
  hijri_month   INTEGER NOT NULL CHECK (hijri_month BETWEEN 1 AND 12),
  hijri_day     INTEGER NOT NULL CHECK (hijri_day BETWEEN 1 AND 30),
  name_ar       TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('eid','sacred','other')),
  UNIQUE (hijri_month, hijri_day, name_ar)
);

-- =============================================================================
-- 10. ramadan_tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS ramadan_tracking (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hijri_year    INTEGER NOT NULL,
  day           INTEGER NOT NULL CHECK (day BETWEEN 1 AND 30),
  fasted        BOOLEAN NOT NULL DEFAULT FALSE,
  taraweeh      BOOLEAN NOT NULL DEFAULT FALSE,
  juz_read      INTEGER NOT NULL DEFAULT 0 CHECK (juz_read BETWEEN 0 AND 30),
  UNIQUE (user_id, hijri_year, day)
);

-- =============================================================================
-- 11. zakat_calculations
-- =============================================================================
CREATE TABLE IF NOT EXISTS zakat_calculations (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN
                ('cash','gold','silver','business','stocks','crypto','currency','livestock','crops')),
  inputs      JSONB NOT NULL,
  result      NUMERIC(20,4) NOT NULL,
  currency    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zakat_user_created ON zakat_calculations (user_id, created_at DESC);

-- =============================================================================
-- 12. worship_goals
-- =============================================================================
CREATE TABLE IF NOT EXISTS worship_goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN
                ('prayer','quran','adhkar','fast','charity')),
  target      INTEGER NOT NULL CHECK (target > 0),
  frequency   TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 13. worship_progress
-- =============================================================================
CREATE TABLE IF NOT EXISTS worship_progress (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id     UUID NOT NULL REFERENCES worship_goals(id) ON DELETE CASCADE,
  date_g      DATE NOT NULL,
  value       INTEGER NOT NULL DEFAULT 0,
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, goal_id, date_g)
);

-- =============================================================================
-- 14. ibadat_categories  (allowlist of scopes the assistant may answer)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ibadat_categories (
  id        SERIAL PRIMARY KEY,
  slug      TEXT NOT NULL UNIQUE,
  name_ar   TEXT NOT NULL,
  allowed   BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================================================================
-- 15. ibadat_questions  (only HASH stored, not raw text — privacy)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ibadat_questions (
  id              BIGSERIAL PRIMARY KEY,
  question_hash   CHAR(64) NOT NULL,               -- sha256 hex of normalized question
  category_id     INTEGER REFERENCES ibadat_categories(id) ON DELETE SET NULL,
  in_scope        BOOLEAN NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_hash)
);

-- =============================================================================
-- 16. ibadat_answers
-- =============================================================================
CREATE TABLE IF NOT EXISTS ibadat_answers (
  id              BIGSERIAL PRIMARY KEY,
  question_id     BIGINT REFERENCES ibadat_questions(id) ON DELETE SET NULL,
  answer_text     TEXT NOT NULL,
  category_id     INTEGER REFERENCES ibadat_categories(id) ON DELETE SET NULL,
  confidence      TEXT NOT NULL CHECK (confidence IN ('high','medium','low')),
  blocked         BOOLEAN NOT NULL DEFAULT FALSE,
  disclaimer      TEXT NOT NULL DEFAULT 'هذه إجابة إرشادية عامة، وليست فتوى شخصية.',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 17. ibadat_sources  (catalog of trusted religious sources)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ibadat_sources (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,              -- 'bukhari','muslim','quran',...
  title_ar      TEXT NOT NULL,
  author_ar     TEXT,
  license_ref   TEXT NOT NULL,                     -- ref to LICENSES.md entry
  verified      BOOLEAN NOT NULL DEFAULT FALSE
);

-- =============================================================================
-- 18. ibadat_answer_sources  (junction: answer ↔ sources, with reference text)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ibadat_answer_sources (
  answer_id        BIGINT NOT NULL REFERENCES ibadat_answers(id) ON DELETE CASCADE,
  source_id        INTEGER NOT NULL REFERENCES ibadat_sources(id) ON DELETE RESTRICT,
  reference_text   TEXT NOT NULL,                  -- 'كتاب الصلاة، باب رقم ...'
  PRIMARY KEY (answer_id, source_id)
);
CREATE INDEX IF NOT EXISTS idx_ias_answer ON ibadat_answer_sources (answer_id);

-- =============================================================================
-- 19. ibadat_audit_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS ibadat_audit_log (
  id                BIGSERIAL PRIMARY KEY,
  question_id       BIGINT REFERENCES ibadat_questions(id) ON DELETE SET NULL,
  category_id       INTEGER REFERENCES ibadat_categories(id) ON DELETE SET NULL,
  in_scope          BOOLEAN NOT NULL,
  retrieved_count   INTEGER NOT NULL DEFAULT 0,
  confidence        TEXT,
  blocked           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 20. dua_messages
-- =============================================================================
CREATE TABLE IF NOT EXISTS dua_messages (
  id        SERIAL PRIMARY KEY,
  slug      TEXT NOT NULL UNIQUE,                  -- 'sadaqah_banner','sadaqah_full',...
  kind      TEXT NOT NULL CHECK (kind IN ('banner','full','fatiha')),
  text_ar   TEXT NOT NULL,
  active    BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================================================================
-- INTEGRITY RULE
-- -----------------------------------------------------------------------------
-- No row in ibadat_answers with blocked = FALSE may exist without at least
-- one linked row in ibadat_answer_sources. Enforced as a DEFERRABLE
-- CONSTRAINT TRIGGER so a single transaction can insert the answer and its
-- source links before the check runs at COMMIT time.
-- =============================================================================

CREATE OR REPLACE FUNCTION trg_ibadat_answer_requires_source()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow blocked answers to exist without sources (they are the rejection rows).
  IF NEW.blocked IS TRUE THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ibadat_answer_sources WHERE answer_id = NEW.id
  ) THEN
    RAISE EXCEPTION
      'ibadat_answers row id=% has blocked=FALSE but no linked ibadat_answer_sources row. '
      'Policy: every non-blocked answer must cite at least one trusted source.',
      NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ibadat_answer_requires_source_ai ON ibadat_answers;
CREATE CONSTRAINT TRIGGER ibadat_answer_requires_source_ai
  AFTER INSERT OR UPDATE ON ibadat_answers
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION trg_ibadat_answer_requires_source();

COMMIT;
