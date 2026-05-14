/**
 * Content / source-registry public read-only endpoints for the mobile app.
 *
 *   GET /api/content/sources         — count + Arabic notice (never lists names)
 *   GET /api/content/sources/status  — count breakdown by verification status
 *
 * Same backing data as /api/rag/sources/status — re-exposed under /api/content
 * so the mobile app team can write a single namespaced fetch.
 */

import { buildRagStatus } from '../rag/rag-status.js';

const NOTICE_AR =
  'الإجابات والمحتوى الإسلامي مقيد بالمصادر المعتمدة فقط. لا يُعرض محتوى دون مصدر.';

export default async function contentSourcesRoute(fastify) {
  fastify.get('/sources', async (req, reply) => {
    const rag = await buildRagStatus();
    return reply.send({
      ok: true,
      configured: rag.approved_sources > 0,
      approved_sources: rag.approved_sources | 0,
      complete_database: false,
      safe_message_ar: NOTICE_AR,
    });
  });

  fastify.get('/sources/status', async (req, reply) => {
    const rag = await buildRagStatus();
    return reply.send({
      ok: true,
      approved_sources:       rag.approved_sources | 0,
      pending_review_sources: rag.pending_review_sources | 0,
      unverified_sources:     rag.unverified_sources | 0,
      blocked_sources:        rag.blocked_sources | 0,
      complete_database:      false,
      safe_message_ar:        NOTICE_AR,
    });
  });
}
