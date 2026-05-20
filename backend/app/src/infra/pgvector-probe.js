/**
 * Live pgvector readiness probe (requires DATABASE_URL + connected pool).
 */

export async function pgvectorReadiness(pool) {
  if (!pool) {
    return {
      configured: false,
      extension_present: false,
      embedding_column_present: false,
      vector_index_present: false,
      vector_rows: 0,
      ready: false,
    };
  }

  try {
    const ext = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS present
    `);
    const extensionPresent = Boolean(ext.rows?.[0]?.present);

    const col = await pool.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'islamic_document_chunks'
        AND column_name = 'embedding'
      LIMIT 1
    `);
    const embeddingColumnPresent = col.rowCount > 0;

    let vectorIndexPresent = false;
    if (embeddingColumnPresent) {
      const idx = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'islamic_document_chunks'
      `);
      const names = new Set((idx.rows || []).map((r) => String(r.indexname).toLowerCase()));
      vectorIndexPresent = names.has('idx_islamic_document_chunks_embedding_hnsw')
        || names.has('idx_islamic_document_chunks_embedding_ivfflat');
    }

    let vectorRows = 0;
    if (extensionPresent && embeddingColumnPresent) {
      const count = await pool.query(`
        SELECT COUNT(*)::int AS n
        FROM islamic_document_chunks
        WHERE embedding IS NOT NULL
      `);
      vectorRows = Number(count.rows?.[0]?.n || 0);
    }

    const ready = extensionPresent
      && embeddingColumnPresent
      && vectorIndexPresent
      && vectorRows > 0;

    return {
      configured: extensionPresent,
      extension_present: extensionPresent,
      embedding_column_present: embeddingColumnPresent,
      vector_index_present: vectorIndexPresent,
      vector_rows: vectorRows,
      ready,
    };
  } catch {
    return {
      configured: false,
      extension_present: false,
      embedding_column_present: false,
      vector_index_present: false,
      vector_rows: 0,
      ready: false,
    };
  }
}
