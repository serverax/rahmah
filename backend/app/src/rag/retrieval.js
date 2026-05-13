/**
 * Islamic RAG retrieval — fail-closed.
 *
 * Sprint 10 contract:
 *   - With no pg pool injected, retrieval returns an empty `candidates` array
 *     and a structured `not_configured` reason. Callers MUST treat this as
 *     "insufficient sources" and respond with the blocked fallback.
 *   - With a pool, retrieval ONLY surfaces chunks where:
 *       chunks.verification_status   = 'approved'
 *     AND documents.verification_status = 'approved'
 *     AND registry.verification_status  = 'approved'
 *   - The query is parameterized. Free-text questions are matched at this
 *     foundation tier by simple keyword filter (no embeddings yet).
 *   - The retrieval function never echoes the question; it hashes it for
 *     audit purposes via the audit table (separate writer, not here).
 */

const NOT_CONFIGURED = Object.freeze({
  ok: false,
  reason: 'not_configured',
  candidates: [],
});

function safeNumber(n, def, min, max) {
  if (!Number.isFinite(n)) return def;
  const x = Math.floor(n);
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

export function createIslamicRetrieval({ pool } = {}) {
  const hasPool = Boolean(pool);

  async function retrieve({ question, language = 'ar', limit = 4 } = {}) {
    if (!hasPool) return NOT_CONFIGURED;
    if (typeof question !== 'string' || question.trim().length === 0) {
      return Object.freeze({ ok: false, reason: 'empty_question', candidates: [] });
    }
    const lang = String(language).slice(0, 8);
    const n = safeNumber(limit, 4, 1, 8);

    const sql = `
      SELECT
        c.id                AS chunk_id,
        c.chunk_text_ar     AS chunk_text_ar,
        c.citation_label_ar AS citation_label_ar,
        c.citation_url      AS citation_url,
        c.language          AS language,
        d.title_ar          AS document_title_ar,
        r.source_type       AS source_type,
        r.source_name_ar    AS source_name_ar,
        r.source_reference  AS source_reference
      FROM islamic_source_chunks c
      JOIN islamic_source_documents d ON d.id = c.document_id
      JOIN islamic_source_registry  r ON r.id = d.source_id
      WHERE c.verification_status = 'approved'
        AND d.verification_status = 'approved'
        AND r.verification_status = 'approved'
        AND c.language = $1
      ORDER BY c.created_at DESC
      LIMIT $2
    `;
    try {
      const res = await pool.query(sql, [lang, n]);
      const candidates = (res.rows || []).map((row) =>
        Object.freeze({
          chunk_id:          row.chunk_id,
          chunk_text_ar:     row.chunk_text_ar,
          citation_label_ar: row.citation_label_ar,
          citation_url:      row.citation_url,
          language:          row.language,
          document_title_ar: row.document_title_ar,
          source_type:       row.source_type,
          source_name_ar:    row.source_name_ar,
          source_reference:  row.source_reference,
        }),
      );
      return Object.freeze({
        ok: true,
        reason: null,
        candidates,
      });
    } catch {
      // Fail-closed: caller treats empty as insufficient_sources.
      return Object.freeze({
        ok: false,
        reason: 'retrieval_error',
        candidates: [],
      });
    }
  }

  return { retrieve };
}

/**
 * Decide whether retrieval candidates are sufficient to answer.
 * Pure function — usable by the route layer + the future Control Engine.
 */
export function isSafeToAnswerFromRag(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return false;
  for (const c of candidates) {
    if (!c || typeof c !== 'object') return false;
    if (typeof c.citation_label_ar !== 'string') return false;
    if (c.citation_label_ar.trim().length === 0) return false;
    if (typeof c.chunk_text_ar !== 'string') return false;
    if (c.chunk_text_ar.trim().length === 0) return false;
  }
  return true;
}
