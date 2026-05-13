/**
 * Public read-only RAG status route.
 *
 * Mounted by app.js at prefix `/api/rag`. Endpoints:
 *   GET /status         — honest snapshot of the RAG layer.
 *   GET /sources/status — counts by verification status; never lists names.
 */

import { buildRagStatus, isRagRetrievalConfigured } from '../rag/rag-status.js';
import { decideRagAnswer } from '../rag/answer-gate.js';

const REGISTRY_NOTICE_AR =
  'سجل المصادر الإسلامية. لا تظهر إجابات إلا من المصادر المعتمدة بعد المراجعة.';

const querySchema = {
  body: {
    type: 'object',
    required: ['question_ar'],
    additionalProperties: false,
    properties: {
      question_ar: { type: 'string', minLength: 3, maxLength: 1000 },
      language:    { type: 'string', enum: ['ar', 'en'] },
      limit:       { type: 'integer', minimum: 1, maximum: 8 },
    },
  },
};

let _retrieval = null;
export function configureRagRouteRetrieval(retrieval) { _retrieval = retrieval || null; }
export function _resetRagRouteForTests() { _retrieval = null; }

export default async function ragRoute(fastify) {
  fastify.get('/status', async (req, reply) => {
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
    // Real retrieval adapter is operator-injected via configureRagRouteRetrieval.
    // When absent, decideRagAnswer reports rag_unavailable truthfully.
    let candidates = null;
    if (_retrieval && typeof _retrieval.retrieve === 'function') {
      const r = await _retrieval.retrieve({
        question: req.body.question_ar,
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
