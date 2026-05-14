-- =============================================================================
-- Sakina migration 009 — Rahma WASM audit
-- File: backend/db/migrations/009_rahma_wasm_audit.sql
-- =============================================================================
-- Audit trails for every WASM policy evaluation the backend trusts.
-- Append-only by convention: the route layer never exposes UPDATE.
--
-- These tables are decoupled from the existing sakina_sheikh_audit_log so
-- the WASM evaluations can be queried independently for parity checks
-- (JS-vs-WASM identical decisions) and security audits.
--
-- Zero seed data. Idempotent. No destructive ops.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Generic WASM policy decision log.
CREATE TABLE IF NOT EXISTS wasm_policy_audit (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  module_name         TEXT NOT NULL CHECK (length(trim(module_name)) > 0),
  module_version      TEXT NOT NULL CHECK (length(trim(module_version)) > 0),
  input_hash          TEXT NOT NULL CHECK (length(input_hash) = 64),   -- sha-256 hex
  decision            TEXT NOT NULL CHECK (length(trim(decision)) > 0),
  reason              TEXT,
  parity_js_decision  TEXT,                              -- decision produced by the JS implementation, if compared
  parity_match        BOOLEAN,                           -- TRUE iff WASM and JS produced identical decisions
  metadata_json       JSONB
);
CREATE INDEX IF NOT EXISTS idx_wpa_module   ON wasm_policy_audit (module_name, module_version);
CREATE INDEX IF NOT EXISTS idx_wpa_decision ON wasm_policy_audit (decision);
CREATE INDEX IF NOT EXISTS idx_wpa_occurred ON wasm_policy_audit (occurred_at DESC);

-- 2. Citation-gate specific audit.
CREATE TABLE IF NOT EXISTS wasm_citation_audit (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answer_id           UUID,                              -- optional FK to sakina_sheikh_answers
  input_hash          TEXT NOT NULL CHECK (length(input_hash) = 64),
  citation_status     TEXT NOT NULL CHECK (citation_status IN (
    'quran_cited',
    'hadith_cited',
    'quran_and_hadith_cited',
    'scholar_advice_needs_review',
    'insufficient_citation'
  )),
  can_publish_public  BOOLEAN NOT NULL,
  can_publish_private BOOLEAN NOT NULL,
  reason              TEXT
);
CREATE INDEX IF NOT EXISTS idx_wca_answer    ON wasm_citation_audit (answer_id);
CREATE INDEX IF NOT EXISTS idx_wca_status    ON wasm_citation_audit (citation_status);
CREATE INDEX IF NOT EXISTS idx_wca_occurred  ON wasm_citation_audit (occurred_at DESC);

-- 3. Child-safety audit. NEVER stores body_ar — only its sha-256.
CREATE TABLE IF NOT EXISTS wasm_child_safety_audit (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  body_hash           TEXT NOT NULL CHECK (length(body_hash) = 64),
  age_band            TEXT NOT NULL CHECK (age_band IN ('4-6','7-9','10-12','13+')),
  decision            TEXT NOT NULL CHECK (decision IN ('allow','block')),
  reason              TEXT,
  sensitive_topic     TEXT
);
CREATE INDEX IF NOT EXISTS idx_wcsa_decision  ON wasm_child_safety_audit (decision);
CREATE INDEX IF NOT EXISTS idx_wcsa_age_band  ON wasm_child_safety_audit (age_band);
CREATE INDEX IF NOT EXISTS idx_wcsa_occurred  ON wasm_child_safety_audit (occurred_at DESC);

-- 4. Rule-engine audit for content visibility decisions.
CREATE TABLE IF NOT EXISTS wasm_rule_engine_audit (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  item_kind                TEXT NOT NULL CHECK (length(trim(item_kind)) > 0),
  item_id                  UUID,
  verification_status      TEXT NOT NULL,
  has_citation             BOOLEAN NOT NULL,
  is_published             BOOLEAN NOT NULL,
  is_test_fixture          BOOLEAN NOT NULL,
  show_in_public_list      BOOLEAN NOT NULL,
  public_visible           BOOLEAN NOT NULL,
  private_visible          BOOLEAN NOT NULL,
  reason                   TEXT
);
CREATE INDEX IF NOT EXISTS idx_wrea_item     ON wasm_rule_engine_audit (item_kind, item_id);
CREATE INDEX IF NOT EXISTS idx_wrea_occurred ON wasm_rule_engine_audit (occurred_at DESC);

COMMIT;
