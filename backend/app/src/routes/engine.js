/**
 * Rahma Control Engine routes.
 *
 *   GET  /api/engine/status            — engine + subsystem snapshot.
 *   POST /api/engine/process-event     — main router.
 *   GET  /api/engine/recommendations   — approved-only recommendations.
 *   GET  /api/engine/review-queue      — list of items currently queued for review.
 */

import { isDatabaseConfigured } from '../db/config.js';
import { isRagRegistryConfigured, isRagRetrievalConfigured } from '../rag/rag-status.js';
import { isSheikhRepositoryConfigured } from '../sheikh/sheikh-question-repository.js';
import { isSheikhAuditConfigured } from '../audit/sheikh-action-audit.js';
import { isAuthConfigured } from '../sheikh/sheikh-auth-policy.js';
import { cacheStatusForReady } from '../cache/index.js';
import {
  processRahmaEvent,
  engineMetadata,
} from '../engine/rahma-control-engine.js';
import { SUPPORTED_EVENTS } from '../engine/engine-types.js';
import { logDecision } from '../engine/audit-logger.js';
import { recommend } from '../engine/recommendation-engine.js';

const processSchema = {
  body: {
    type: 'object',
    required: ['event_type'],
    additionalProperties: true,
    properties: {
      event_type: { type: 'string' },
      actor_type: { type: 'string', enum: ['user', 'sheikh', 'moderator', 'admin', 'system'] },
      payload: { type: 'object' },
    },
  },
};

const ENGINE_NOTICE_AR =
  'محرك التحكم مُفعَّل ويعمل بمنطق حتمي قائم على القواعد، دون أي ذكاء اصطناعي خارجي.';

export default async function engineRoute(fastify) {
  fastify.get('/status', async (req, reply) => {
    const meta = engineMetadata();
    const cache = cacheStatusForReady();
    return reply.send({
      ok: true,
      engine_implemented: meta.engine_implemented,
      mode: meta.mode,
      engine_version: meta.engine_version,
      modules_loaded: meta.modules_loaded,
      modules_loaded_count: meta.modules_loaded.length,
      supported_events: SUPPORTED_EVENTS,
      supported_events_count: SUPPORTED_EVENTS.length,
      safety_rules_loaded: meta.safety_rules_loaded,
      safety_rules_count: meta.safety_rules_loaded.length,
      audit_enabled: isSheikhAuditConfigured(),
      storage_configured: isDatabaseConfigured(),
      subsystems: {
        database_configured: isDatabaseConfigured(),
        sheikh_repository_configured: isSheikhRepositoryConfigured(),
        sheikh_audit_configured: isSheikhAuditConfigured(),
        sheikh_auth_configured: isAuthConfigured(),
        rag_registry_configured: isRagRegistryConfigured(),
        rag_retrieval_configured: isRagRetrievalConfigured(),
        cache_configured: cache.configured,
        cache_mode: cache.mode,
      },
      notice_ar: ENGINE_NOTICE_AR,
    });
  });

  fastify.post('/process-event', { schema: processSchema }, async (req, reply) => {
    const decision = await processRahmaEvent(req.body || {});
    let audit_status = 'not_persisted_audit_not_required';
    if (decision.audit_log_required) {
      // Best-effort: never fail the response on audit error.
      try {
        const r = await logDecision({
          actor_user_id: (req.body && req.body.actor_user_id) || null,
          action: mapEventToAuditAction(req.body && req.body.event_type),
          target_type: (req.body && req.body.payload && req.body.payload.target_type) || 'engine_event',
          target_id: (req.body && req.body.payload && req.body.payload.target_id) || randomId(),
          metadata: { decision: decision.decision, reason: decision.reason },
        });
        audit_status = r.audit_status || 'unknown';
      } catch {
        audit_status = 'not_persisted_error';
      }
    }
    return reply.send({
      ok: true,
      ...decision,
      audit_status,
    });
  });

  fastify.get('/recommendations', async (req, reply) => {
    const audience = String((req.query && req.query.audience) || 'adult');
    const ageBand = String((req.query && req.query.age_band) || '7-9');
    // Without a wired source-repo for recommendations, return an empty list
    // truthfully. No fake items.
    const items = await recommend({ candidates: [], audience, age_band: ageBand, limit: 6 });
    return reply.send({
      ok: true,
      audience,
      age_band: ageBand,
      items: items.items,
      message_ar: items.items.length === 0
        ? 'لا توجد توصيات معتمَدة حالياً.'
        : 'تم تحضير توصيات معتمَدة.',
    });
  });

  fastify.get('/review-queue', async (req, reply) => {
    if (!isDatabaseConfigured()) {
      return reply.code(503).send({
        ok: false,
        error: 'service_not_configured',
        message_ar: 'قائمة المراجعة غير متاحة بدون قاعدة بيانات.',
      });
    }
    // With a DB, the wired repository will return the queue. Foundation:
    // return an empty list with a truthful note.
    return reply.send({
      ok: true,
      items: [],
      message_ar: 'لا توجد عناصر في قائمة المراجعة حالياً.',
    });
  });
}

function randomId() {
  // 16-byte hex; not cryptographic — only used as a target_id fallback.
  let s = '';
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

function mapEventToAuditAction(eventType) {
  switch (eventType) {
    case 'USER_ASKED_SHEIKH_QUESTION':    return 'question_submitted';
    case 'SHEIKH_DRAFTED_ANSWER':         return 'answer_draft_saved';
    case 'SHEIKH_REQUESTED_PUBLISH':      return 'answer_submitted';
    default:                              return 'question_submitted'; // safe fallback that exists in audit allow-list
  }
}
