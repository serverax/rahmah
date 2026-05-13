import { isDatabaseConfigured } from '../safety/db-status.js';

export default async function readyRoute(fastify) {
  fastify.get('/ready', async () => {
    // We do NOT attempt a real DB connection from this scaffold. Real
    // connectivity probing belongs to Sprint 3+ once a Postgres pod is
    // actually reachable. Reporting `connected: false` until then is the
    // only honest value.
    return {
      ok: true,
      service: 'sakina-backend',
      database: {
        configured: isDatabaseConfigured(),
        connected: false,
      },
      ibadat: {
        scope: 'ibadat',
        source_required: true,
        answer_without_source_blocked: true,
      },
      environment: process.env.NODE_ENV || 'staging',
    };
  });
}
