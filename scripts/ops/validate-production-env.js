#!/usr/bin/env node
/**
 * Production-style environment validation for Rahma.
 * Never prints secrets (DATABASE_URL, REDIS_URL, SESSION_SECRET, JWT_*).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { wasmReadiness, getWasmRuntimeMode, isWasmDisableFormallyApproved } from '../../backend/app/src/infra/wasm-probe.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const require = createRequire(path.resolve(REPO_ROOT, 'backend', 'app', 'package.json'));
const { Pool } = require('pg');

const out = {
  ok: false,
  checks: [],
  blockers: [],
};

function check(name, pass, detail = null) {
  out.checks.push({ name, pass, detail });
  if (!pass) out.blockers.push(name);
}

function secretPresent(name) {
  const v = process.env[name];
  return typeof v === 'string' && v.length > 0 && !/CHANGE_ME|REPLACE_ME|placeholder/i.test(v);
}

function looksLikeMockProvider() {
  const donation = String(process.env.DONATION_PROVIDER || '').toLowerCase();
  const llm = String(process.env.LOCAL_LLM_MOCK || '').toLowerCase();
  return donation === 'mock' || llm === 'true';
}

async function main() {
  check('DATABASE_URL_set', secretPresent('DATABASE_URL'), 'configured');
  check('REDIS_URL_set', secretPresent('REDIS_URL'), 'configured');
  check(
    'SESSION_SECRET_set',
    secretPresent('SESSION_SECRET') && process.env.SESSION_SECRET.length >= 32,
    'length_ok',
  );

  const appStoreFiles = [
    'docs/app-store/APPLE_APP_STORE_READINESS_CHECKLIST.md',
    'docs/app-store/GOOGLE_PLAY_READINESS_CHECKLIST.md',
    'docs/app-store/PRIVACY_POLICY_DRAFT.md',
    'docs/app-store/CHILD_SAFETY_POLICY_DRAFT.md',
  ];
  for (const rel of appStoreFiles) {
    const abs = path.join(REPO_ROOT, rel);
    check(`app_store_file:${path.basename(rel)}`, fs.existsSync(abs));
  }

  check('no_mock_providers', !looksLikeMockProvider());

  const wasmMode = getWasmRuntimeMode();
  const wasm = await wasmReadiness({ timeoutMs: 4000 });
  if (wasmMode === 'required') {
    check('wasm_runtime_required', wasm.execution_proven === true, {
      modules: wasm.modules.map((m) => ({
        name: m.name,
        execution_proven: m.execution_proven,
      })),
    });
  } else {
    check('wasm_disable_formally_approved', isWasmDisableFormallyApproved(), { mode: wasmMode });
    check('wasm_execution_proven_false_when_disabled', wasm.execution_proven === false);
  }

  if (!secretPresent('DATABASE_URL')) {
    out.ok = false;
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 8000,
    options: '-c client_encoding=UTF8',
  });

  try {
    await pool.query('SELECT 1');
    check('database_connected', true);

    const ext = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS ok",
    );
    check('pgvector_extension', Boolean(ext.rows[0]?.ok));

    const embCol = await pool.query(`
      SELECT format_type(a.atttypid, a.atttypmod) AS col_type
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'islamic_document_chunks' AND a.attname = 'embedding'
    `);
    const colType = embCol.rows[0]?.col_type || '';
    check('embedding_column_vector', String(colType).startsWith('vector'), { col_type: colType });

    const idx = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'islamic_document_chunks'
        AND indexname = 'idx_islamic_document_chunks_embedding_hnsw'
    `);
    check('hnsw_index', idx.rowCount > 0);

    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM content_sources WHERE source_approved = TRUE AND license_status = 'approved') AS sources,
        (SELECT COUNT(*)::int FROM islamic_documents WHERE source_approved = TRUE) AS documents,
        (SELECT COUNT(*)::int FROM islamic_document_chunks WHERE approved = TRUE) AS chunks,
        (SELECT COUNT(*)::int FROM islamic_document_chunks WHERE embedding IS NOT NULL) AS vector_embeddings,
        (SELECT COUNT(*)::int FROM citation_registry WHERE approved = TRUE) AS citations,
        (SELECT COUNT(*)::int FROM schema_migrations) AS migrations
    `);
    const row = counts.rows[0] || {};
    out.counts = row;
    check('approved_sources_gt_0', Number(row.sources) > 0);
    check('documents_gt_0', Number(row.documents) > 0);
    check('chunks_gt_0', Number(row.chunks) > 0);
    check('vector_embeddings_gt_0', Number(row.vector_embeddings) > 0);
    check('citations_gt_0', Number(row.citations) > 0);

    const orphanCitations = await pool.query(`
      SELECT COUNT(*)::int AS n
      FROM citation_registry cr
      LEFT JOIN islamic_document_chunks c ON c.id = cr.chunk_id
      WHERE c.id IS NULL
    `);
    check('citation_integrity', Number(orphanCitations.rows[0]?.n) === 0);

    const { buildApp } = await import(
      new URL('../../backend/app/src/app.js', import.meta.url).href
    );
    const app = buildApp();
    const rag = await app.inject({
      method: 'POST',
      url: '/api/rag/query',
      payload: {
        question_ar: 'ما هي الآية الأولى من سورة الفاتحة؟',
        language: 'ar',
      },
    });
    const ragBody = rag.json();
    check('rag_query_200', rag.statusCode === 200);
    check('rag_has_citations', Array.isArray(ragBody.citations) && ragBody.citations.length > 0);
    check('rag_vector_or_approved_search', ['vector_search', 'approved_rag_search'].includes(ragBody.retrieval_strategy));
    await app.close();
  } catch (error) {
    check('database_probe', false, String(error.message || error));
  } finally {
    await pool.end().catch(() => {});
  }

  out.ok = out.blockers.length === 0;
  console.log(JSON.stringify(out, null, 2));
  process.exitCode = out.ok ? 0 : 1;
}

main();
