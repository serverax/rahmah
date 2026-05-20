#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const require = createRequire(path.resolve(REPO_ROOT, 'backend', 'app', 'package.json'));
const { Pool } = require('pg');

const REQUIRED = {
  content_sources: [
    'source_id',
    'title_ar',
    'title_en',
    'provider_name',
    'source_type',
    'official_url',
    'local_reference',
    'licence_status',
    'attribution_required',
    'offline_storage_allowed',
    'commercial_use_allowed',
    'authenticity_level',
    'trust_level',
    'source_approved',
    'approved_by',
    'approved_at',
    'content_hash',
    'version',
    'notes',
    'created_at',
    'updated_at',
  ],
  islamic_documents: [
    'source_id',
    'title_ar',
    'title_en',
    'source_type',
    'provider_name',
    'official_url',
    'local_reference',
    'licence_status',
    'source_approved',
    'approved_by',
    'approved_at',
    'content_hash',
    'version',
    'created_at',
    'updated_at',
  ],
  islamic_document_chunks: [
    'document_id',
    'source_id',
    'chunk_index',
    'chunk_text',
    'normalized_text',
    'language',
    'content_type',
    'citation_label',
    'approved',
    'embedding_model',
    'embedding_jsonb',
    'metadata',
    'content_hash',
    'created_at',
    'updated_at',
  ],
  citation_registry: [
    'source_id',
    'document_id',
    'chunk_id',
    'citation_label',
    'reference_label',
    'source_title_ar',
    'source_title_en',
    'source_type',
    'official_url',
    'local_reference',
    'approved',
    'content_hash',
    'created_at',
    'updated_at',
  ],
  rag_ingestion_jobs: [
    'job_type',
    'status',
    'source_id',
    'source_count',
    'document_count',
    'chunk_count',
    'embedding_count',
    'citation_count',
    'started_at',
    'finished_at',
    'created_at',
    'updated_at',
  ],
  rag_query_audit: [
    'question_hash',
    'normalized_question',
    'language',
    'mode',
    'intent',
    'risk_level',
    'safety_status',
    'source_ids',
    'document_ids',
    'chunk_ids',
    'citation_ids',
    'algorithm_version',
    'created_at',
    'updated_at',
  ],
  scholar_review_queue: [
    'question_hash',
    'question_text',
    'normalized_question',
    'category',
    'language',
    'risk_level',
    'status',
    'source_ids',
    'chunk_ids',
    'created_at',
    'updated_at',
  ],
};

async function main() {
  const out = {
    ok: false,
    db_status: 'DB_NOT_EXECUTED',
    required_tables: Object.keys(REQUIRED),
    missing_tables: [],
    missing_columns: [],
    pgvector_available: false,
    blockers: [],
  };

  if (!process.env.DATABASE_URL) {
    out.blockers.push('DATABASE_URL is missing or test DB unavailable');
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 5_000,
    options: '-c client_encoding=UTF8',
  });
  try {
    await pool.query('SELECT 1');
    out.db_status = 'DB_CONNECTED';
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const tableSet = new Set((tables.rows || []).map((r) => r.table_name));
    for (const [table, columns] of Object.entries(REQUIRED)) {
      if (!tableSet.has(table)) {
        out.missing_tables.push(table);
        continue;
      }
      const colRows = await pool.query(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        `,
        [table],
      );
      const have = new Set((colRows.rows || []).map((r) => r.column_name));
      for (const column of columns) {
        if (!have.has(column)) out.missing_columns.push(`${table}.${column}`);
      }
    }
    const vector = await pool.query("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS ok");
    out.pgvector_available = Boolean(vector.rows?.[0]?.ok);

    if (out.missing_tables.length > 0) out.blockers.push('missing_required_tables');
    if (out.missing_columns.length > 0) out.blockers.push('missing_required_columns');
    out.ok = out.blockers.length === 0;
    out.db_status = out.ok ? 'DB_SCHEMA_VERIFIED' : 'DB_SCHEMA_FAILED';
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = out.ok ? 0 : 1;
  } catch (error) {
    out.db_status = 'DB_FAILED';
    out.blockers.push(String(error?.message || error));
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main();
