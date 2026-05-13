import { checkDatabaseHealth } from '../db/health.js';
import { isSourceRetrievalConfigured } from '../safety/source-store-status.js';

export default async function readyRoute(fastify) {
  fastify.get('/ready', async () => {
    const db = await checkDatabaseHealth({ timeoutMs: 1500 });

    return {
      ok: true,
      service: 'sakina-backend',
      database: db,
      ibadat: {
        scope: 'ibadat',
        source_required: true,
        answer_without_source_blocked: true,
      },
      sources: {
        registry_required: true,
        retrieval_configured: isSourceRetrievalConfigured(),
        answer_generation_enabled: false,
        verified_sources_required: true,
      },
      environment: process.env.NODE_ENV || 'staging',
    };
  });
}
