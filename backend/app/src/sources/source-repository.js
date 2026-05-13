/**
 * Verified Islamic source repository.
 *
 * For Sprint 5 this is a foundation only:
 *   - When NO pg pool is injected, lookups return [] (fail-closed).
 *   - When a pool IS injected, lookups query only `approved` chunks via
 *     parameterized SQL. Values are never interpolated.
 *
 * Answer generation is NOT in this module's scope; it is wired off entirely
 * in this sprint. The repository's role is to surface chunks; the caller
 * (the ibadat route) decides what to do — and currently still always
 * returns the blocked fallback.
 */

const NORMALIZED_LIMIT_MAX = 8;
const NORMALIZED_LIMIT_DEFAULT = 4;

function normalizeLimit(limit) {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return NORMALIZED_LIMIT_DEFAULT;
  if (limit < 1) return 1;
  if (limit > NORMALIZED_LIMIT_MAX) return NORMALIZED_LIMIT_MAX;
  return Math.floor(limit);
}

function normalizeLanguage(language) {
  if (typeof language !== 'string') return 'ar';
  const trimmed = language.trim().toLowerCase();
  if (trimmed.length < 2 || trimmed.length > 8) return 'ar';
  return trimmed;
}

export function createSourceRepository({ pool } = {}) {
  // No pool → empty repo. Safe fail-closed default for Sprint 5.
  const hasPool = Boolean(pool);

  async function lookupVerifiedSources({ question: _question, scope: _scope, language, limit } = {}) {
    if (!hasPool) return [];

    const lang = normalizeLanguage(language);
    const n    = normalizeLimit(limit);

    // Parameterized SQL — values are bound via $1, $2, never concatenated.
    // We deliberately do NOT filter by `scope` text yet — the scope→source
    // mapping is built in Sprint 6+. For now we limit to language+approved
    // and surface the latest chunks; the citation validator + ibadat route
    // will still reject the entire lookup until full retrieval lands.
    const sql = `
      SELECT
        c.id              AS id,
        d.title           AS title,
        c.citation_label  AS citation_label,
        c.citation_url    AS citation_url,
        c.chunk_text      AS chunk_text,
        s.authority_level AS authority_level,
        s.source_type     AS source_type,
        c.language        AS language
      FROM sakina_source_chunks c
      JOIN sakina_source_documents d ON d.id = c.document_id
      JOIN sakina_verified_sources s ON s.id = d.source_id
      WHERE c.verification_status = 'approved'
        AND d.verification_status = 'approved'
        AND s.verification_status = 'approved'
        AND c.language = $1
      ORDER BY c.created_at DESC
      LIMIT $2
    `;
    try {
      const res = await pool.query(sql, [lang, n]);
      return (res.rows || []).map((r) => ({
        id:              r.id,
        title:           r.title,
        citation_label:  r.citation_label,
        citation_url:    r.citation_url,
        chunk_text:      r.chunk_text,
        authority_level: r.authority_level,
        source_type:     r.source_type,
        language:        r.language,
      }));
    } catch {
      // Swallow — caller treats empty array as "no verified source", which
      // is the safe fail-closed outcome. The error is NOT logged with any
      // query or parameter content, to avoid leaking question or DSN.
      return [];
    }
  }

  return { lookupVerifiedSources };
}
