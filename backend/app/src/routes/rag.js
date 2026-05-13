/**
 * Public read-only RAG status route.
 *
 * Mounted by app.js at prefix `/api/rag`. Endpoints:
 *   GET /status — honest snapshot of the RAG layer.
 */

import { buildRagStatus } from '../rag/rag-status.js';

export default async function ragRoute(fastify) {
  fastify.get('/status', async (req, reply) => {
    const status = await buildRagStatus();
    return reply.send({ ok: true, ...status });
  });
}
