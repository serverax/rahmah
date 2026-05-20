-- =============================================================================
-- Rahma migration 017 — self-improvement engine foundation
-- File: backend/db/migrations/017_self_improvement.sql
-- =============================================================================
-- This migration adds deterministic improvement-analysis tables. It stores
-- only anonymised evidence and keeps every approval step explicit. No public
-- release or code generation is implied by the schema itself.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS improvement_signals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source               TEXT NOT NULL,
  signal_type          TEXT NOT NULL,
  screen               TEXT,
  anonymised_evidence  TEXT NOT NULL,
  risk_level           TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  approval_status      TEXT NOT NULL DEFAULT 'detected' CHECK (approval_status IN (
    'detected',
    'drafted',
    'needs_review',
    'approved_for_planning',
    'approved_for_code_generation',
    'rejected',
    'implemented',
    'released'
  )),
  reviewer_admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_reason      TEXT,
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_improvement_signals_type_status ON improvement_signals (signal_type, approval_status);
CREATE INDEX IF NOT EXISTS idx_improvement_signals_source_created ON improvement_signals (source, created_at DESC);

CREATE TABLE IF NOT EXISTS feature_gap_reports (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id            UUID REFERENCES improvement_signals(id) ON DELETE SET NULL,
  source               TEXT NOT NULL,
  gap_type             TEXT NOT NULL,
  title                TEXT NOT NULL,
  problem              TEXT NOT NULL,
  evidence_summary     JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_screens     JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_database_tables JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_apis        JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_level           TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  approval_status      TEXT NOT NULL DEFAULT 'drafted' CHECK (approval_status IN (
    'detected',
    'drafted',
    'needs_review',
    'approved_for_planning',
    'approved_for_code_generation',
    'rejected',
    'implemented',
    'released'
  )),
  reviewer_admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_reason      TEXT,
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feature_gap_reports_type_status ON feature_gap_reports (gap_type, approval_status);

CREATE TABLE IF NOT EXISTS feature_proposals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_report_id        UUID REFERENCES feature_gap_reports(id) ON DELETE SET NULL,
  source               TEXT NOT NULL,
  title                TEXT NOT NULL,
  problem              TEXT NOT NULL,
  evidence             JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_solution   TEXT NOT NULL,
  affected_screens     JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_database_tables JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_apis        JSONB NOT NULL DEFAULT '[]'::jsonb,
  safety_rules         JSONB NOT NULL DEFAULT '[]'::jsonb,
  tests_required       JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_complexity  TEXT NOT NULL,
  priority_score       INTEGER NOT NULL DEFAULT 0 CHECK (priority_score BETWEEN 0 AND 100),
  risk_score           INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  acceptance_criteria  JSONB NOT NULL DEFAULT '{}'::jsonb,
  approval_status      TEXT NOT NULL DEFAULT 'drafted' CHECK (approval_status IN (
    'detected',
    'drafted',
    'needs_review',
    'approved_for_planning',
    'approved_for_code_generation',
    'rejected',
    'implemented',
    'released'
  )),
  reviewer_admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_reason      TEXT,
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feature_proposals_priority_status ON feature_proposals (priority_score DESC, approval_status);

CREATE TABLE IF NOT EXISTS proposal_votes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id          UUID NOT NULL REFERENCES feature_proposals(id) ON DELETE CASCADE,
  reviewer_admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  vote                 TEXT NOT NULL CHECK (vote IN ('approve', 'reject', 'comment')),
  reason               TEXT,
  approval_status      TEXT NOT NULL DEFAULT 'needs_review' CHECK (approval_status IN (
    'detected',
    'drafted',
    'needs_review',
    'approved_for_planning',
    'approved_for_code_generation',
    'rejected',
    'implemented',
    'released'
  )),
  decision_reason      TEXT,
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_proposal ON proposal_votes (proposal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS proposal_approval_status (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id          UUID NOT NULL REFERENCES feature_proposals(id) ON DELETE CASCADE,
  reviewer_admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  approval_status      TEXT NOT NULL CHECK (approval_status IN (
    'detected',
    'drafted',
    'needs_review',
    'approved_for_planning',
    'approved_for_code_generation',
    'rejected',
    'implemented',
    'released'
  )),
  decision_reason      TEXT,
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proposal_approval_status_proposal ON proposal_approval_status (proposal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS generated_dev_tasks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id          UUID NOT NULL REFERENCES feature_proposals(id) ON DELETE CASCADE,
  source               TEXT NOT NULL,
  task_title           TEXT NOT NULL,
  task_detail          TEXT NOT NULL,
  task_order           INTEGER NOT NULL DEFAULT 0,
  risk_level           TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  approval_status      TEXT NOT NULL DEFAULT 'drafted' CHECK (approval_status IN (
    'detected',
    'drafted',
    'needs_review',
    'approved_for_planning',
    'approved_for_code_generation',
    'rejected',
    'implemented',
    'released'
  )),
  reviewer_admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_reason      TEXT,
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_generated_dev_tasks_proposal ON generated_dev_tasks (proposal_id, task_order);

CREATE TABLE IF NOT EXISTS generated_test_plans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id          UUID NOT NULL REFERENCES feature_proposals(id) ON DELETE CASCADE,
  source               TEXT NOT NULL,
  plan_title           TEXT NOT NULL,
  unit_tests           JSONB NOT NULL DEFAULT '[]'::jsonb,
  widget_tests         JSONB NOT NULL DEFAULT '[]'::jsonb,
  integration_tests    JSONB NOT NULL DEFAULT '[]'::jsonb,
  manual_checks        JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_level           TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  approval_status      TEXT NOT NULL DEFAULT 'drafted' CHECK (approval_status IN (
    'detected',
    'drafted',
    'needs_review',
    'approved_for_planning',
    'approved_for_code_generation',
    'rejected',
    'implemented',
    'released'
  )),
  reviewer_admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_reason      TEXT,
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_generated_test_plans_proposal ON generated_test_plans (proposal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS self_improvement_audit_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action               TEXT NOT NULL,
  target_type          TEXT NOT NULL,
  target_id            TEXT NOT NULL,
  source               TEXT NOT NULL,
  anonymised_evidence  JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_level           TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  approval_status      TEXT NOT NULL DEFAULT 'detected' CHECK (approval_status IN (
    'detected',
    'drafted',
    'needs_review',
    'approved_for_planning',
    'approved_for_code_generation',
    'rejected',
    'implemented',
    'released'
  )),
  reviewer_admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_reason      TEXT,
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_self_improvement_audit_target ON self_improvement_audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_self_improvement_audit_status ON self_improvement_audit_log (approval_status, created_at DESC);

COMMIT;
