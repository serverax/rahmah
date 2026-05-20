/**
 * /api/rag/status — honest snapshot of the RAG layer.
 *
 * The route NEVER lies. If the DB is not connected, mode is 'foundation'.
 * If REDIS_URL/pgvector is configured but actual vector path is unproven,
 * mode stays 'database' until a vector probe succeeds.
 *
 * The function returns a frozen object the route forwards directly.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { isDatabaseConfigured } from '../db/config.js';
import { getPool } from '../db/client.js';
import { isRahmaAlgorithmConfigured, RAHMA_ALGORITHM_VERSION } from '../services/rahma-algorithm.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

let _seedPolicyChecked = false;
let _seedPolicyExists = false;
async function detectSeedPolicy() {
  if (_seedPolicyChecked) return _seedPolicyExists;
  try {
    await fs.stat(path.join(REPO_ROOT, 'data', 'islamic-sources', 'REVIEW_POLICY.md'));
    _seedPolicyExists = true;
  } catch {
    _seedPolicyExists = false;
  }
  _seedPolicyChecked = true;
  return _seedPolicyExists;
}

let _registry = null;
let _retrieval = null;
let _ragEnabled = true;

export function configureRag({ registry = null, retrieval = null, enabled = true } = {}) {
  _registry = registry;
  _retrieval = retrieval;
  _ragEnabled = Boolean(enabled);
}

export function _resetRagForTests() {
  _registry = null;
  _retrieval = null;
  _ragEnabled = true;
}

export function isRagRegistryConfigured() { return Boolean(_registry); }
export function isRagRetrievalConfigured() { return Boolean(_retrieval); }

function safeInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function buildCountsFallback(counts = {}) {
  return {
    approved_sources: safeInt(counts.approved),
    pending_review_sources: safeInt(counts.pending_review),
    unverified_sources: safeInt(counts.unverified),
    blocked_sources: safeInt(counts.rejected),
    documents_indexed: 0,
    chunks_indexed: 0,
    embeddings_indexed: 0,
    citations_indexed: 0,
    last_ingestion_at: null,
    last_verified_at: null,
    last_algorithm_test_at: null,
    blocker_reason: null,
    rag_ready: false,
    algorithm_ready: false,
    algorithm_version: RAHMA_ALGORITHM_VERSION,
  };
}

async function queryLiveCounts(pool) {
  const counts = await pool.query(`
    SELECT
      COUNT(*) FILTER (
        WHERE source_approved = TRUE
          AND license_status = 'approved'
          AND content_hash IS NOT NULL
          AND trust_level IS NOT NULL
      )::int AS approved_sources,
      COUNT(*) FILTER (
        WHERE source_approved = FALSE
          AND license_status IN ('pending', 'unknown')
      )::int AS pending_review_sources,
      COUNT(*) FILTER (
        WHERE source_approved = FALSE
          AND license_status = 'rejected'
      )::int AS blocked_sources,
      COUNT(*) FILTER (
        WHERE source_approved = FALSE
          AND license_status NOT IN ('pending', 'unknown', 'rejected')
      )::int AS unverified_sources,
      COALESCE((
        SELECT COUNT(DISTINCT id)::int
        FROM islamic_documents
        WHERE source_approved = TRUE
          AND licence_status = 'approved'
          AND approval_status = 'approved'
      ), 0) AS documents_indexed,
      COALESCE((
        SELECT COUNT(*)::int
        FROM islamic_document_chunks
        WHERE approved = TRUE
          AND approval_status = 'approved'
      ), 0) AS chunks_indexed,
      COALESCE((
        SELECT COUNT(*)::int
        FROM islamic_document_chunks
        WHERE approved = TRUE
          AND approval_status = 'approved'
          AND COALESCE(jsonb_array_length(embedding_jsonb), 0) > 0
      ), 0) AS embeddings_indexed,
      COALESCE((
        SELECT COUNT(*)::int
        FROM citation_registry
        WHERE approved = TRUE
          AND approval_status = 'approved'
      ), 0) AS citations_indexed,
      (SELECT MAX(finished_at) FROM rag_ingestion_jobs WHERE status = 'succeeded') AS last_ingestion_at,
      (SELECT MAX(created_at) FROM rag_query_audit WHERE safety_status = 'verified_sources') AS last_verified_at,
      (SELECT MAX(created_at) FROM rag_query_audit WHERE algorithm_version IS NOT NULL) AS last_algorithm_test_at,
      EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS vector_configured
  `);

  const row = counts.rows?.[0] || {};
  const approved_sources = safeInt(row.approved_sources);
  const documents_indexed = safeInt(row.documents_indexed);
  const chunks_indexed = safeInt(row.chunks_indexed);
  const embeddings_indexed = safeInt(row.embeddings_indexed);
  const citations_indexed = safeInt(row.citations_indexed);
  const last_ingestion_at = row.last_ingestion_at || null;
  const last_verified_at = row.last_verified_at || null;
  const last_algorithm_test_at = row.last_algorithm_test_at || null;
  const rag_ready = approved_sources > 0
    && documents_indexed > 0
    && chunks_indexed > 0
    && embeddings_indexed > 0
    && citations_indexed > 0
    && Boolean(last_verified_at);
  const algorithm_ready = isRahmaAlgorithmConfigured() && Boolean(last_algorithm_test_at);
  const blockers = [];
  if (approved_sources === 0) blockers.push('no_approved_sources');
  if (documents_indexed === 0) blockers.push('no_documents_indexed');
  if (chunks_indexed === 0) blockers.push('no_chunks_indexed');
  if (embeddings_indexed === 0) blockers.push('no_embeddings_indexed');
  if (citations_indexed === 0) blockers.push('no_citations_indexed');
  if (!last_verified_at) blockers.push('no_verified_query');
  if (!algorithm_ready) blockers.push('algorithm_not_ready');

  return {
    approved_sources,
    pending_review_sources: safeInt(row.pending_review_sources),
    unverified_sources: safeInt(row.unverified_sources),
    blocked_sources: safeInt(row.blocked_sources),
    documents_indexed,
    chunks_indexed,
    embeddings_indexed,
    citations_indexed,
    last_ingestion_at,
    last_verified_at,
    last_algorithm_test_at,
    rag_ready,
    algorithm_ready,
    algorithm_version: RAHMA_ALGORITHM_VERSION,
    blocker_reason: blockers[0] || null,
    blockers,
    mode: 'live',
    vector_configured: Boolean(row.vector_configured),
    safe_to_answer_from_rag: rag_ready,
  };
}

async function queryLiveCountsDirect(dsn) {
  const transient = new Pool({ connectionString: dsn, max: 1, connectionTimeoutMillis: 5000 });
  try {
    return await queryLiveCounts(transient);
  } finally {
    await transient.end().catch(() => {});
  }
}

export async function buildRagStatus({ preferLive = false } = {}) {
  const dbConfigured = isDatabaseConfigured();
  const retrievalConfigured = Boolean(_retrieval);
  const registryConfigured = Boolean(_registry);

  // Mode resolution:
  //   - no registry + no DB             → 'foundation'
  //   - registry configured + no vector → 'database'
  //   - registry + retrieval probe ok   → 'vector' (when adapter ships)
  let mode = 'foundation';
  const seedPolicyExists = await detectSeedPolicy();

  if (dbConfigured && registryConfigured && retrievalConfigured) {
    mode = 'database';
  }

  if (preferLive && dbConfigured) {
    try {
      if (typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0) {
        const live = await queryLiveCountsDirect(process.env.DATABASE_URL);
        return Object.freeze({
          rag_enabled: _ragEnabled,
          mode: live.mode,
          database_configured: dbConfigured,
          vector_configured: live.vector_configured,
          documents_indexed: live.documents_indexed,
          chunks_indexed: live.chunks_indexed,
          embeddings_indexed: live.embeddings_indexed,
          citations_indexed: live.citations_indexed,
          approved_sources: live.approved_sources,
          pending_review_sources: live.pending_review_sources,
          unverified_sources: live.unverified_sources,
          blocked_sources: live.blocked_sources,
          last_ingestion_at: live.last_ingestion_at,
          last_verified_at: live.last_verified_at,
          last_algorithm_test_at: live.last_algorithm_test_at,
          blocker_reason: live.blocker_reason,
          algorithm_ready: live.algorithm_ready,
          algorithm_version: live.algorithm_version,
          complete_database: false,
          safe_to_answer_from_rag: live.safe_to_answer_from_rag,
          rag_ready: live.rag_ready,
          ingestion_supported: true,
          seed_policy_exists: seedPolicyExists,
          blockers: live.blockers,
        });
      }
      const pool = getPool();
      if (pool) {
        const live = await queryLiveCounts(pool);
        return Object.freeze({
          rag_enabled: _ragEnabled,
          mode: live.mode,
          database_configured: dbConfigured,
          vector_configured: live.vector_configured,
          documents_indexed: live.documents_indexed,
          chunks_indexed: live.chunks_indexed,
          embeddings_indexed: live.embeddings_indexed,
          citations_indexed: live.citations_indexed,
          approved_sources: live.approved_sources,
          pending_review_sources: live.pending_review_sources,
          unverified_sources: live.unverified_sources,
          blocked_sources: live.blocked_sources,
          last_ingestion_at: live.last_ingestion_at,
          last_verified_at: live.last_verified_at,
          last_algorithm_test_at: live.last_algorithm_test_at,
          blocker_reason: live.blocker_reason,
          algorithm_ready: live.algorithm_ready,
          algorithm_version: live.algorithm_version,
          complete_database: false,
          safe_to_answer_from_rag: live.safe_to_answer_from_rag,
          rag_ready: live.rag_ready,
          ingestion_supported: true,
          seed_policy_exists: seedPolicyExists,
          blockers: live.blockers,
        });
      }
    } catch {
      // Fall through to the foundation/registry path.
    }
  }

  const counts = _registry
    ? await _registry.countSourcesByStatus().catch(() => ({ approved: 0, pending_review: 0, unverified: 0, rejected: 0 }))
    : { approved: 0, pending_review: 0, unverified: 0, rejected: 0 };

  const fallback = buildCountsFallback(counts);
  return Object.freeze({
    rag_enabled: _ragEnabled,
    mode,
    database_configured: dbConfigured,
    vector_configured: false,
    documents_indexed: fallback.documents_indexed,
    chunks_indexed: fallback.chunks_indexed,
    embeddings_indexed: fallback.embeddings_indexed,
    citations_indexed: fallback.citations_indexed,
    approved_sources: fallback.approved_sources,
    pending_review_sources: fallback.pending_review_sources,
    unverified_sources: fallback.unverified_sources,
    blocked_sources: fallback.blocked_sources,
    last_ingestion_at: fallback.last_ingestion_at,
    last_verified_at: fallback.last_verified_at,
    last_algorithm_test_at: fallback.last_algorithm_test_at,
    blocker_reason: fallback.blocker_reason,
    algorithm_ready: fallback.algorithm_ready,
    algorithm_version: fallback.algorithm_version,
    complete_database: false,
    safe_to_answer_from_rag: fallback.approved_sources > 0 && retrievalConfigured && dbConfigured,
    rag_ready: false,
    ingestion_supported: true,
    seed_policy_exists: seedPolicyExists,
    blockers: [],
  });
}
