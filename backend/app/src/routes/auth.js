/**
 * GET /api/auth/status — honest auth-state snapshot.
 *
 * Mounted in app.js at prefix `/api/auth`.
 * Never echoes secrets. Default mode is `not_configured`.
 */

import { buildAuthStatus } from '../auth/auth-status.js';

export default async function authRoute(fastify) {
  fastify.get('/status', async (req, reply) => {
    return reply.send({ ok: true, ...buildAuthStatus() });
  });
}
