-- =============================================================================
-- 001_system_roles.sql — seed the canonical role catalogue.
-- Mirrors backend/app/src/auth/roles.js (single source of truth).
--
-- Idempotent: ON CONFLICT (name) DO NOTHING. No UPDATE; no DELETE.
-- =============================================================================
BEGIN;

INSERT INTO roles (name, description) VALUES
  ('public_user',      'Anonymous mobile user — no principal'),
  ('user',             'Authenticated mobile user'),
  ('sheikh',           'Scholar with answer-drafting capability'),
  ('moderator',        'Reviews sheikh answers'),
  ('content_reviewer', 'Approves/rejects sheikh answers and privacy requests'),
  ('charity_admin',    'Manages charity causes (when wired)'),
  ('admin',            'Superset role')
ON CONFLICT (name) DO NOTHING;

COMMIT;
