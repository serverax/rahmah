/**
 * /api/engine/status — honest status of the Rahma Control Engine.
 *
 * Sprint 14 contract:
 *   - The Control Engine code is NOT YET implemented. This route returns
 *     `engine_implemented: false` and `mode: "not_implemented"`. The rest
 *     of the response surface is the same shape the future engine will use,
 *     so the frontend / monitor can be built against a stable contract.
 *   - Subsystem-level booleans are sourced from real /ready upstream probes
 *     (DB, RAG, cache) — they reflect the truth of those subsystems, not
 *     a marketing summary.
 */

import { isDatabaseConfigured } from '../db/config.js';
import { isRagRegistryConfigured, isRagRetrievalConfigured } from '../rag/rag-status.js';
import { isSheikhRepositoryConfigured } from '../sheikh/sheikh-question-repository.js';
import { isSheikhAuditConfigured } from '../audit/sheikh-action-audit.js';
import { isAuthConfigured } from '../sheikh/sheikh-auth-policy.js';
import { cacheStatusForReady } from '../cache/index.js';

export default async function engineRoute(fastify) {
  fastify.get('/status', async (req, reply) => {
    const dbConfigured = isDatabaseConfigured();
    const cache = cacheStatusForReady();
    const ragRegistry = isRagRegistryConfigured();
    const ragRetrieval = isRagRetrievalConfigured();

    return reply.send({
      ok: true,
      engine_implemented: false,
      mode: 'not_implemented',
      subsystems: {
        database_configured: dbConfigured,
        sheikh_repository_configured: isSheikhRepositoryConfigured(),
        sheikh_audit_configured: isSheikhAuditConfigured(),
        sheikh_auth_configured: isAuthConfigured(),
        rag_registry_configured: ragRegistry,
        rag_retrieval_configured: ragRetrieval,
        cache_configured: cache.configured,
        cache_mode: cache.mode,
      },
      supported_events_planned: [
        'USER_ASKED_SHEIKH_QUESTION',
        'SHEIKH_DRAFTED_ANSWER',
        'SHEIKH_REQUESTED_PUBLISH',
        'NEW_ISLAMIC_CONTENT_ADDED',
        'CONTENT_REVIEW_REQUESTED',
        'CHILD_GAME_SCENARIO_ADDED',
        'USER_OPENED_HOME',
        'USER_OPENED_CHILD_GAME',
        'USER_SEARCHED_CONTENT',
        'DAILY_CONTENT_REFRESH',
        'SOURCE_VERIFICATION_REQUIRED',
      ],
      // Honest disclaimer surfaced to clients.
      notice_ar: 'محرك التحكم في مرحلة الأساس فقط. لم يتم تفعيل المعالجة الكاملة بعد.',
    });
  });
}
