/**
 * backend/app/src/services/library-repository.js
 */

export function createLibraryRepository({ pool } = {}) {
  const hasPool = Boolean(pool);

  async function listApprovedItems(category) {
    if (!hasPool) return [];
    // Only return documents that are verified and approved.
    const sql = `
      SELECT d.id, d.title_ar, d.category, d.language, d.verification_status, d.created_at as published_at,
             s.title_ar as source_name_ar
      FROM sakina_source_documents d
      LEFT JOIN sakina_verified_sources s ON s.id = d.source_id
      WHERE d.verification_status = 'approved' AND ($1::text IS NULL OR d.category = $1)
      ORDER BY d.created_at DESC
      LIMIT 100
    `;
    try {
      const res = await pool.query(sql, [category]);
      return res.rows || [];
    } catch {
      return [];
    }
  }

  async function getItemDetails(id) {
    if (!hasPool) return null;
    const sql = `
      SELECT d.id, d.title_ar, d.category, d.language, d.created_at as published_at,
             s.title_ar as source_name_ar
      FROM sakina_source_documents d
      JOIN sakina_verified_sources s ON s.id = d.source_id
      WHERE d.id = $1 AND d.verification_status = 'approved'
    `;
    try {
      const res = await pool.query(sql, [id]);
      if (!res.rows[0]) return null;
      
      const chunksSql = `
        SELECT chunk_text, citation_label
        FROM sakina_source_chunks
        WHERE document_id = $1 AND verification_status = 'approved'
        ORDER BY id ASC
      `;
      const chunksRes = await pool.query(chunksSql, [id]);
      return {
        ...res.rows[0],
        content: chunksRes.rows.map(r => r.chunk_text).join('\n\n'),
        citations: chunksRes.rows.map(r => r.citation_label)
      };
    } catch {
      return null;
    }
  }

  async function searchLibrary(query) {
    if (!hasPool) return [];
    const sql = `
      SELECT d.id, d.title_ar, d.category, d.verification_status, s.title_ar as source_name_ar
      FROM sakina_source_documents d
      LEFT JOIN sakina_verified_sources s ON s.id = d.source_id
      WHERE d.verification_status = 'approved' AND d.title_ar LIKE $1
      LIMIT 50
    `;
    try {
      const res = await pool.query(sql, [`%${query}%`]);
      return res.rows || [];
    } catch {
      return [];
    }
  }

  return {
    listApprovedItems,
    getItemDetails,
    searchLibrary
  };
}

let _repo = null;
export function configureLibraryRepository({ pool }) { _repo = createLibraryRepository({ pool }); }
export function getLibraryRepository() { return _repo; }
export function isLibraryRepositoryConfigured() { return Boolean(_repo); }

