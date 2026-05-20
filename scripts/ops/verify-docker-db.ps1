# Verify Rahma Docker Postgres (no secrets printed)
$ErrorActionPreference = 'Stop'
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { 'postgresql://rahma_user:rahma_local_dev_only@127.0.0.1:5436/rahma' }
node -e @"
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const ext = await p.query(\"SELECT 1 FROM pg_extension WHERE extname = 'vector'\");
  const mig = await p.query('SELECT COUNT(*)::int AS n FROM schema_migrations');
  const col = await p.query(\`
    SELECT format_type(a.atttypid, a.atttypmod) AS col_type
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'islamic_document_chunks' AND a.attname = 'embedding'
  \`);
  const idx = await p.query(\`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_islamic_document_chunks_embedding_hnsw'
  \`);
  const counts = await p.query(\`
    SELECT
      (SELECT COUNT(*)::int FROM content_sources WHERE source_approved = TRUE AND license_status = 'approved') AS sources,
      (SELECT COUNT(*)::int FROM islamic_documents WHERE source_approved = TRUE) AS documents,
      (SELECT COUNT(*)::int FROM islamic_document_chunks WHERE approved = TRUE) AS chunks,
      (SELECT COUNT(*)::int FROM islamic_document_chunks WHERE embedding IS NOT NULL) AS embeddings,
      (SELECT COUNT(*)::int FROM citation_registry WHERE approved = TRUE) AS citations
  \`);
  console.log(JSON.stringify({
    pgvector: ext.rowCount > 0,
    migrations: mig.rows[0].n,
    embedding_column: col.rows[0]?.col_type,
    hnsw_index: idx.rowCount > 0,
    counts: counts.rows[0],
  }, null, 2));
  await p.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
"@
