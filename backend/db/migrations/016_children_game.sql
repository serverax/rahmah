-- 016_children_game.sql
-- Adds tables for children Islamic game scenarios and progress.

CREATE TABLE IF NOT EXISTS children_scenarios (
  id              BIGSERIAL PRIMARY KEY,
  age_group       TEXT NOT NULL CHECK (age_group IN ('4-6', '7-9', '10-12')),
  category        TEXT NOT NULL, -- e.g. 'manners', 'prayer', 'wudu', 'prophets'
  title_ar        TEXT NOT NULL,
  body_ar         TEXT NOT NULL,
  options_json    JSONB NOT NULL, -- list of {id, text_ar, is_correct, explanation_ar}
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS children_progress (
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  scenario_id     BIGINT REFERENCES children_scenarios(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_children_scenarios_status ON children_scenarios (status, age_group);
