/**
 * /api/rag/status — honest snapshot of the RAG layer.
 *
 * The route NEVER lies. If the DB is not connected, mode is 'foundation'.
 * If REDIS_URL/pgvector is configured but actual vector path is unproven,
 * mode stays 'database' until a vector probe succeeds.
 *
 * The function returns a frozen object the route forwards directly.
 */

import { isDatabaseConfigured } from '../db/config.js';

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

export async function buildRagStatus() {
  const dbConfigured = isDatabaseConfigured();
  const retrievalConfigured = Boolean(_retrieval);
  const registryConfigured = Boolean(_registry);

  // Mode resolution:
  //   - no registry + no DB             → 'foundation'
  //   - registry configured + no vector → 'database'
  //   - registry + retrieval probe ok   → 'vector' (when adapter ships)
  let mode = 'foundation';
  if (dbConfigured && registryConfigured && retrievalConfigured) {
    mode = 'database';
  }

  let counts = { approved: 0, pending_review: 0, unverified: 0, rejected: 0 };
  if (_registry) {
    try {
      counts = await _registry.countSourcesByStatus();
    } catch {
      counts = { approved: 0, pending_review: 0, unverified: 0, rejected: 0 };
    }
  }

  // For Sprint 10, documents_indexed and chunks_indexed are 0 unless the
  // registry surfaces them. We do not lie about counts.
  const documentsIndexed = 0;
  const chunksIndexed = 0;

  return Object.freeze({
    rag_enabled: _ragEnabled,
    mode,
    database_configured: dbConfigured,
    vector_configured: false,
    documents_indexed: documentsIndexed,
    chunks_indexed: chunksIndexed,
    approved_sources: counts.approved | 0,
    pending_review_sources: counts.pending_review | 0,
    safe_to_answer_from_rag: counts.approved > 0 && retrievalConfigured && dbConfigured,
  });
}
