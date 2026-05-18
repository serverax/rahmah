-- 015_user_notifications.sql
-- Adds table for in-app and push notification tracking.

CREATE TABLE IF NOT EXISTS user_notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title_ar    TEXT NOT NULL,
  title_en    TEXT,
  body_ar     TEXT NOT NULL,
  body_en     TEXT,
  level       TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warning', 'urgent')),
  metadata    JSONB DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications (created_at DESC);
