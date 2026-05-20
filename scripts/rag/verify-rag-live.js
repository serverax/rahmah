#!/usr/bin/env node
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const require = createRequire(path.resolve(REPO_ROOT, 'backend', 'app', 'package.json'));
const { Pool } = require('pg');

function safeInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

async function main() {
  const out = {
    db_status: 'DB_NOT_EXECUTED',
    approved_sources: 0,
    documents_indexed: 0,
    chunks_indexed: 0,
    embeddings_indexed: 0,
    citations_indexed: 0,
    last_ingestion_at: null,
    last_verified_at: null,
    rag_ready: false,
    blocker_reason: null,
    algorithm_ready: false,
    algorithm_version: 'rahma-algorithm-v1',
    last_algorithm_test_at: null,
    smoke_test: null,
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
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM content_sources WHERE source_approved = TRUE AND license_status = 'approved' AND content_hash IS NOT NULL) AS approved_sources,
        (SELECT COUNT(*)::int FROM islamic_documents WHERE source_approved = TRUE AND licence_status = 'approved' AND content_hash IS NOT NULL) AS documents_indexed,
        (SELECT COUNT(*)::int FROM islamic_document_chunks WHERE approved = TRUE AND approval_status = 'approved') AS chunks_indexed,
        (SELECT COUNT(*)::int FROM islamic_document_chunks WHERE COALESCE(jsonb_array_length(embedding_jsonb), 0) > 0) AS embeddings_indexed,
        (SELECT COUNT(*)::int FROM citation_registry WHERE approved = TRUE AND approval_status = 'approved') AS citations_indexed,
        (SELECT MAX(finished_at) FROM rag_ingestion_jobs WHERE status = 'succeeded') AS last_ingestion_at,
        (SELECT MAX(created_at) FROM rag_query_audit WHERE safety_status = 'verified_sources') AS last_verified_at,
        (SELECT MAX(created_at) FROM rag_query_audit WHERE algorithm_version IS NOT NULL) AS last_algorithm_test_at,
        (SELECT safety_status FROM rag_query_audit ORDER BY created_at DESC LIMIT 1) AS latest_safety_status
    `);
    const row = counts.rows[0] || {};
    out.approved_sources = safeInt(row.approved_sources);
    out.documents_indexed = safeInt(row.documents_indexed);
    out.chunks_indexed = safeInt(row.chunks_indexed);
    out.embeddings_indexed = safeInt(row.embeddings_indexed);
    out.citations_indexed = safeInt(row.citations_indexed);
    out.last_ingestion_at = row.last_ingestion_at || null;
    out.last_verified_at = row.last_verified_at || null;
    out.last_algorithm_test_at = row.last_algorithm_test_at || null;
    out.algorithm_ready = out.last_algorithm_test_at !== null && ['verified_sources', 'low_confidence', 'scholar_review_required', 'insufficient_sources'].includes(String(row.latest_safety_status || ''));
    const blockers = [];
    if (out.approved_sources === 0) blockers.push('no_approved_sources');
    if (out.documents_indexed === 0) blockers.push('no_documents_indexed');
    if (out.chunks_indexed === 0) blockers.push('no_chunks_indexed');
    if (out.embeddings_indexed === 0) blockers.push('no_embeddings_indexed');
    if (out.citations_indexed === 0) blockers.push('no_citations_indexed');
    if (!out.last_verified_at) blockers.push('no_verified_query');
    out.blocker_reason = blockers[0] || null;
    out.rag_ready = blockers.length === 0;
    out.db_status = out.rag_ready ? 'DB_VERIFIED_LIVE' : 'DB_FAILED';
    out.blockers = blockers;

    const { buildApp } = await import(pathToFileURL(path.resolve(REPO_ROOT, 'backend', 'app', 'src', 'app.js')).href);
    const app = buildApp();
    const smoke = await app.inject({
      method: 'POST',
      url: '/api/rag/query',
      payload: {
        question_ar: 'ما هي الآية الأولى من سورة الفاتحة؟',
        language: 'ar',
        use_live_rag: true,
      },
    });
    const smokeBody = smoke.json();
    out.smoke_test = {
      statusCode: smoke.statusCode,
      safety_status: smokeBody.safety_status || null,
      answer: smokeBody.answer || null,
      answer_ar: smokeBody.answer_ar || null,
      citations: Array.isArray(smokeBody.citations) ? smokeBody.citations : [],
    };
    const postSmokeCounts = await pool.query(`
      SELECT
        (SELECT MAX(created_at) FROM rag_query_audit WHERE safety_status = 'verified_sources') AS last_verified_at,
        (SELECT MAX(created_at) FROM rag_query_audit WHERE algorithm_version IS NOT NULL) AS last_algorithm_test_at
    `);
    out.last_verified_at = postSmokeCounts.rows?.[0]?.last_verified_at || out.last_verified_at || null;
    out.last_algorithm_test_at = postSmokeCounts.rows?.[0]?.last_algorithm_test_at || out.last_algorithm_test_at || null;
    if (smoke.statusCode !== 200 || smokeBody.safety_status !== 'verified_sources' || !Array.isArray(smokeBody.citations) || smokeBody.citations.length === 0) {
      out.rag_ready = false;
      out.blockers.push('smoke_query_failed');
      out.blocker_reason = out.blocker_reason || 'smoke_query_failed';
      out.db_status = 'DB_FAILED';
    }
    if (smoke.statusCode === 200 && smokeBody.safety_status === 'verified_sources' && Array.isArray(smokeBody.citations) && smokeBody.citations.length > 0) {
      if (out.approved_sources > 0 && out.documents_indexed > 0 && out.chunks_indexed > 0 && out.embeddings_indexed > 0 && out.citations_indexed > 0) {
        out.rag_ready = true;
        out.algorithm_ready = true;
        out.db_status = 'DB_VERIFIED_LIVE';
        out.blockers = out.blockers.filter((b) => b !== 'no_verified_query' && b !== 'smoke_query_failed');
        out.blocker_reason = out.blockers[0] || null;
      }
    }

    await app.close();
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = out.rag_ready ? 0 : 1;
  } catch (error) {
    out.blockers.push(String(error?.message || error));
    out.db_status = 'DB_FAILED';
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main();
