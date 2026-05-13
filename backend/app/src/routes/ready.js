import { checkDatabaseHealth } from '../db/health.js';

export default async function readyRoute(fastify) {
  fastify.get('/ready', async () => {
    // Real DB probe. Bounded by a short internal timeout so an unreachable
    // host never stalls /ready. `error_type` is a safe coarse bucket;
    // never the raw error message, never the DSN.
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
      environment: process.env.NODE_ENV || 'staging',
    };
  });
}
