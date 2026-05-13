/**
 * Trusted-source store for ibadat answers.
 *
 * INTENTIONALLY EMPTY in this scaffold.
 *
 * Real population happens in:
 *   - Sprint 14 (Islamic Knowledge Database) — load mosques of texts
 *     under verified licenses; build embeddings + keyword index.
 *   - Sprint 15 (AI/RAG Safety Gate) — retrieve, score, gate.
 *
 * Until then, every in-scope question MUST resolve to the blocked
 * fallback, because no trusted source is available and unsourced
 * religious answers are forbidden by
 * docs/AI_FATWA_SAFETY_POLICY_AR.md.
 */
export function lookupSources(_question, _categorySlug) {
  return [];
}
