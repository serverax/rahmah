#!/usr/bin/env node
import { createRequire } from 'node:module';
import { createFallbackEmbedding, normalizeTrustedText } from '../../backend/app/src/rag/trusted-content.js';

const require = createRequire(new URL('../../backend/app/package.json', import.meta.url));
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const question = process.argv[2] || 'ما هي الآية الأولى من سورة الفاتحة؟';
const embedding = createFallbackEmbedding(normalizeTrustedText(question), 24);
const vectorLiteral = `[${embedding.join(',')}]`;

try {
  const vectorAvailable = await pool.query(
    "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS ok",
  );
  const chunkEmbeddingColumn = await pool.query(
    `
    SELECT data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'islamic_document_chunks'
      AND column_name = 'embedding'
    `,
  );
  const hasVectorColumn =
    vectorAvailable.rows[0]?.ok === true &&
    chunkEmbeddingColumn.rows.length > 0;

  if (!hasVectorColumn) {
    const fallback = await pool.query(
      `
      SELECT c.id AS chunk_id,
             jsonb_array_length(c.embedding_jsonb) AS embedding_dims,
             c.embedding_model,
             c.citation_label
      FROM islamic_document_chunks c
      JOIN islamic_documents d ON d.id = c.document_id
      JOIN content_sources s ON s.id = c.source_id
      LEFT JOIN citation_registry cr ON cr.chunk_id = c.id
        AND cr.approved = TRUE AND cr.approval_status = 'approved'
      WHERE c.approved = TRUE
        AND c.approval_status = 'approved'
        AND d.source_approved = TRUE
        AND d.licence_status = 'approved'
        AND s.source_approved = TRUE
        AND s.license_status = 'approved'
        AND c.language = ANY($1::text[])
        AND c.content_type = ANY($2::text[])
        AND c.embedding_jsonb IS NOT NULL
      ORDER BY c.chunk_index ASC
      LIMIT 5
      `,
      [['ar'], ['quran']],
    );
    console.log(JSON.stringify({
      ok: fallback.rows.length > 0,
      mode: 'jsonb_fallback_embeddings',
      pgvector_available: vectorAvailable.rows[0]?.ok === true,
      rows: fallback.rows,
    }, null, 2));
    if (fallback.rows.length === 0) process.exitCode = 1;
    await pool.end().catch(() => {});
    process.exit();
  }

  const res = await pool.query(
    `
    SELECT c.id, (c.embedding <=> $1::vector) AS dist
    FROM islamic_document_chunks c
    JOIN islamic_documents d ON d.id = c.document_id
    JOIN content_sources s ON s.id = c.source_id
    WHERE c.embedding IS NOT NULL
      AND c.approved = TRUE
      AND c.approval_status = 'approved'
      AND d.source_approved = TRUE
      AND d.licence_status = 'approved'
      AND s.source_approved = TRUE
      AND s.license_status = 'approved'
      AND c.language = ANY($2::text[])
      AND c.content_type = ANY($3::text[])
    ORDER BY c.embedding <=> $1::vector
    LIMIT 5
    `,
    [vectorLiteral, ['ar'], ['quran']],
  );
  const full = await pool.query(
    `
    SELECT c.id AS chunk_id, (c.embedding <=> $3::vector) AS vector_distance
    FROM islamic_document_chunks c
    JOIN islamic_documents d ON d.id = c.document_id
    JOIN content_sources s ON s.id = c.source_id
    LEFT JOIN citation_registry cr ON cr.chunk_id = c.id
      AND cr.approved = TRUE AND cr.approval_status = 'approved'
    WHERE c.approved = TRUE AND c.approval_status = 'approved'
      AND d.source_approved = TRUE AND d.licence_status = 'approved'
      AND s.source_approved = TRUE AND s.license_status = 'approved'
      AND c.language = ANY($1::text[]) AND c.content_type = ANY($2::text[])
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> $3::vector
    LIMIT 3
    `,
    [['ar'], ['quran'], vectorLiteral],
  );
  console.log(JSON.stringify({ ok: true, simple: res.rows, full: full.rows }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ ok: false, error: String(error.message || error) }, null, 2));
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
