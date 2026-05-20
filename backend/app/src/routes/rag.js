/**
 * Public read-only RAG status route.
 *
 * Mounted by app.js at prefix `/api/rag`. Endpoints:
 *   GET /status         — honest snapshot of the RAG layer.
 *   GET /sources/status — counts by verification status; never lists names.
 */

import { createRequire } from 'node:module';
import { buildRagStatus, isRagRetrievalConfigured } from '../rag/rag-status.js';
import { decideRagAnswer } from '../rag/answer-gate.js';
import { getRahmaAlgorithm, isRahmaAlgorithmConfigured } from '../services/rahma-algorithm.service.js';
import { isDatabaseConfigured } from '../db/config.js';

const REGISTRY_NOTICE_AR =
  'سجل المصادر الإسلامية. لا تظهر إجابات إلا من المصادر المعتمدة بعد المراجعة.';

const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const querySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    anyOf: [
      { required: ['question_ar'] },
      { required: ['question'] },
    ],
    properties: {
      question_ar: { type: 'string', minLength: 3, maxLength: 1000 },
      question:    { type: 'string', minLength: 3, maxLength: 1000 },
      mode:        { type: 'string', maxLength: 32 },
      child_safe:  { type: 'boolean' },
      use_live_rag:{ type: 'boolean' },
      language:    { type: 'string', enum: ['ar', 'en'] },
      limit:       { type: 'integer', minimum: 1, maximum: 8 },
      lat:         { type: 'number' },
      lng:         { type: 'number' },
      method:      { type: 'string', maxLength: 32 },
      asr_method:  { type: 'string', maxLength: 32 },
      timezone:    { type: 'number' },
      date:        { type: 'string', maxLength: 64 },
    },
  },
};

let _retrieval = null;
export function configureRagRouteRetrieval(retrieval) { _retrieval = retrieval || null; }
export function _resetRagRouteForTests() { _retrieval = null; }

export default async function ragRoute(fastify) {
  fastify.get('/status', async (req, reply) => {
    if (isDatabaseConfigured() && typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 2,
        connectionTimeoutMillis: 5000,
      });
      try {
        await pool.query('SELECT 1');
        const counts = await pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM content_sources WHERE source_approved = TRUE AND license_status = 'approved' AND content_hash IS NOT NULL) AS approved_sources,
            (SELECT COUNT(*)::int FROM content_sources cs WHERE cs.source_approved = FALSE AND EXISTS (SELECT 1 FROM source_approvals sa WHERE sa.source_id = cs.id AND sa.approval_status = 'pending_review')) AS pending_review_sources,
            (SELECT COUNT(*)::int FROM content_sources cs WHERE cs.source_approved = FALSE AND EXISTS (SELECT 1 FROM source_approvals sa WHERE sa.source_id = cs.id AND sa.approval_status = 'rejected')) AS blocked_sources,
            (SELECT COUNT(*)::int FROM content_sources cs WHERE cs.source_approved = FALSE AND NOT EXISTS (SELECT 1 FROM source_approvals sa WHERE sa.source_id = cs.id AND sa.approval_status IN ('pending_review', 'rejected'))) AS unverified_sources,
            (SELECT COUNT(*)::int FROM islamic_documents WHERE source_approved = TRUE AND licence_status = 'approved' AND content_hash IS NOT NULL) AS documents_indexed,
            (SELECT COUNT(*)::int FROM islamic_document_chunks WHERE approved = TRUE AND approval_status = 'approved') AS chunks_indexed,
            (SELECT COUNT(*)::int FROM islamic_document_chunks WHERE COALESCE(jsonb_array_length(embedding_jsonb), 0) > 0) AS embeddings_indexed,
            (SELECT COUNT(*)::int FROM citation_registry WHERE approved = TRUE AND approval_status = 'approved') AS citations_indexed,
            (SELECT MAX(finished_at) FROM rag_ingestion_jobs WHERE status = 'succeeded') AS last_ingestion_at,
            (SELECT MAX(created_at) FROM rag_query_audit WHERE safety_status = 'verified_sources') AS last_verified_at,
            (SELECT MAX(created_at) FROM rag_query_audit WHERE algorithm_version IS NOT NULL) AS last_algorithm_test_at,
            EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS vector_configured
        `);
        const row = counts.rows?.[0] || {};
        const approved_sources = Number(row.approved_sources || 0);
        const documents_indexed = Number(row.documents_indexed || 0);
        const chunks_indexed = Number(row.chunks_indexed || 0);
        const embeddings_indexed = Number(row.embeddings_indexed || 0);
        const citations_indexed = Number(row.citations_indexed || 0);
        const last_verified_at = row.last_verified_at || null;
        const last_algorithm_test_at = row.last_algorithm_test_at || null;
        const rag_ready = approved_sources > 0
          && documents_indexed > 0
          && chunks_indexed > 0
          && embeddings_indexed > 0
          && citations_indexed > 0
          && Boolean(last_verified_at);
        const algorithm_ready = Boolean(last_algorithm_test_at) && isRahmaAlgorithmConfigured();
        const blockers = [];
        if (approved_sources === 0) blockers.push('no_approved_sources');
        if (documents_indexed === 0) blockers.push('no_documents_indexed');
        if (chunks_indexed === 0) blockers.push('no_chunks_indexed');
        if (embeddings_indexed === 0) blockers.push('no_embeddings_indexed');
        if (citations_indexed === 0) blockers.push('no_citations_indexed');
        if (!last_verified_at) blockers.push('no_verified_query');
        if (!algorithm_ready) blockers.push('algorithm_not_ready');

        return reply.send({
          ok: true,
          rag_enabled: true,
          mode: 'live',
          database_configured: true,
          vector_configured: Boolean(row.vector_configured),
          documents_indexed,
          chunks_indexed,
          embeddings_indexed,
          citations_indexed,
          approved_sources,
          pending_review_sources: Number(row.pending_review_sources || 0),
          unverified_sources: Number(row.unverified_sources || 0),
          blocked_sources: Number(row.blocked_sources || 0),
          last_ingestion_at: row.last_ingestion_at || null,
          last_verified_at,
          last_algorithm_test_at,
          blocker_reason: blockers[0] || null,
          algorithm_ready,
          algorithm_version: 'rahma-algorithm-v1',
          complete_database: false,
          safe_to_answer_from_rag: rag_ready,
          rag_ready,
          ingestion_supported: true,
          seed_policy_exists: true,
          blockers,
        });
      } catch {
        // Fall through to the foundation snapshot below.
      } finally {
        await pool.end().catch(() => {});
      }
    }

    const status = await buildRagStatus();
    return reply.send({ ok: true, ...status });
  });

  fastify.get('/sources/status', async (req, reply) => {
    const status = await buildRagStatus();
    return reply.send({
      ok: true,
      approved_sources:        status.approved_sources | 0,
      pending_review_sources:  status.pending_review_sources | 0,
      unverified_sources:      status.unverified_sources | 0,
      blocked_sources:         status.blocked_sources | 0,
      complete_database:       false,
      ingestion_supported:     status.ingestion_supported,
      safe_message_ar:         REGISTRY_NOTICE_AR,
    });
  });

  fastify.post('/query', { schema: querySchema }, async (req, reply) => {
    const question = String(req.body.question_ar || req.body.question || '').trim();
    const algorithm = getRahmaAlgorithm();
    if (algorithm && isRahmaAlgorithmConfigured() && question.length > 0 && typeof algorithm.answerQuestion === 'function') {
      const result = await algorithm.answerQuestion({
        ...req.body,
        question,
        question_ar: question,
        language: req.body.language || 'ar',
        child_safe: Boolean(req.body.child_safe),
      });
      return reply.send({
        ok: true,
        answer: result.answer || null,
        answer_ar: result.answer || null,
        citations: Array.isArray(result.citations) ? result.citations : [],
        safety_status: result.safety_status || 'system_error',
        requires_scholar_review: Boolean(result.requires_scholar_review),
        learning_recommendation: result.learning_recommendation || null,
        audit_id: result.audit_id || null,
        language: result.language || req.body.language || 'ar',
        intent: result.intent || 'unknown',
        risk_level: result.risk_level || 'medium',
        retrieval_strategy: result.retrieval_strategy || null,
        algorithm_version: result.algorithm_version || null,
      });
    }

    // Real retrieval adapter is operator-injected via configureRagRouteRetrieval.
    // When absent, decideRagAnswer reports rag_unavailable truthfully.
    let candidates = null;
    if (_retrieval && typeof _retrieval.retrieve === 'function') {
      const r = await _retrieval.retrieve({
        question,
        language: req.body.language || 'ar',
        limit:    req.body.limit || 4,
      });
      candidates = r && Array.isArray(r.candidates) ? r.candidates : [];
    }
    const decision = decideRagAnswer({
      retrieval_candidates: candidates,
      retrieval_available:  Boolean(_retrieval) && isRagRetrievalConfigured(),
    });
    return reply.send({ ok: true, ...decision });
  });
}
