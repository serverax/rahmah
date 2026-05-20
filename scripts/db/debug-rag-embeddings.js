#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const require = createRequire(path.resolve(REPO_ROOT, 'backend', 'app', 'package.json'));
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log(JSON.stringify({ ok: false, blockers: ['DATABASE_URL missing'] }, null, 2));
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000 });
  try {
    const columns = await pool.query(`
      SELECT column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'rag_embeddings'
      ORDER BY ordinal_position
    `);
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'rag_embeddings'
      ORDER BY indexname
    `);
    const opclasses = await pool.query(`
      SELECT opcname
      FROM pg_opclass
      WHERE opcintype = 'vector'::regtype
      ORDER BY opcname
    `);
    let indexAttempt = { ok: true };
    try {
      await pool.query('DROP INDEX IF EXISTS idx_rag_embeddings_embedding_hnsw');
      await pool.query('DROP INDEX IF EXISTS idx_rag_embeddings_embedding_ivfflat');
      await pool.query(`
        ALTER TABLE rag_embeddings
          ALTER COLUMN embedding TYPE vector(24)
          USING CASE
            WHEN embedding IS NULL THEN NULL
            ELSE embedding::vector(24)
          END
      `);
      await pool.query('CREATE INDEX idx_rag_embeddings_embedding_hnsw ON rag_embeddings USING hnsw (embedding vector_cosine_ops)');
    } catch (error) {
      indexAttempt = { ok: false, error: String(error?.message || error) };
    }
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM rag_embeddings`);
    console.log(JSON.stringify({
      ok: true,
      columns: columns.rows,
      indexes: indexes.rows,
      opclasses: opclasses.rows,
      indexAttempt,
      total_rows: count.rows?.[0]?.total || 0,
    }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ ok: false, error: String(error?.message || error) }, null, 2));
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main();
