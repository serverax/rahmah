/**
 * /api/mobile/sync/status — single-call snapshot the mobile app uses to
 * decide whether to flush its local outbound queue.
 */

import { isDatabaseConfigured } from '../db/config.js';
import { isAuthConfigured } from '../auth/auth-config.js';
import { buildRagStatus } from '../rag/rag-status.js';

export default async function mobileSyncRoute(fastify) {
  fastify.get('/sync/status', async (req, reply) => {
    const rag = await buildRagStatus();
    return reply.send({
      ok: true,
      sync_ready: isDatabaseConfigured() && isAuthConfigured() && rag.approved_sources > 0,
      database: { configured: isDatabaseConfigured() },
      auth:     { configured: isAuthConfigured() },
      content:  { approved_sources: rag.approved_sources | 0 },
      safe_message_ar: 'مزامنة محلية فقط حالياً. سيتم تفعيل المزامنة عند توصيل قاعدة البيانات والمصادر المعتمدة.',
    });
  });
}
