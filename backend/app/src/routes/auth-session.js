/**
 * /api/auth/session/* + /api/device/register
 *
 * Today these endpoints are operator-pending real-auth surface. The
 * decision logic is in src/auth/{session,device}-service.js. The route
 * layer is a thin schema + dispatch wrapper.
 */

import { decideSessionStart, decideSessionRefresh, decideSessionLogout } from '../auth/session-service.js';
import { decideRegisterDevice } from '../auth/device-service.js';

const startSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      // No fields accepted today. When OIDC ships, the schema requires
      // `id_token` + (optionally) `device_hash`.
    },
  },
};

const refreshSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      // Same — refresh-token presentation is via cookie / header in the
      // real impl, never in body.
    },
  },
};

const deviceSchema = {
  body: {
    type: 'object',
    required: ['platform', 'app_version', 'device_hash'],
    additionalProperties: false,
    properties: {
      platform:    { type: 'string', enum: ['android', 'ios', 'unknown'] },
      app_version: { type: 'string', minLength: 1, maxLength: 32 },
      device_hash: { type: 'string', minLength: 64, maxLength: 64 },
    },
  },
};

export default async function authSessionRoute(fastify) {
  fastify.post('/session/start',   { schema: startSchema },   async (req, reply) => {
    const d = decideSessionStart();
    // 503 when auth is not configured; 400 when configured but the
    // server doesn't accept the grant.
    if (d.error === 'auth_not_configured') return reply.code(503).send(d);
    return reply.code(400).send(d);
  });

  fastify.post('/session/refresh', { schema: refreshSchema }, async (req, reply) => {
    // Refresh-token flow is operator-OIDC dependent; today the route
    // simply reports the current decision shape with tokenValid=false
    // (no token present). When OIDC ships, the host injects validity.
    const d = decideSessionRefresh({ tokenValid: false, principalAllowed: false });
    if (d.error === 'auth_not_configured') return reply.code(503).send(d);
    return reply.code(401).send(d);
  });

  fastify.post('/session/logout',  async (req, reply) => {
    return reply.send(decideSessionLogout());
  });
}

export async function deviceRegistrationRoute(fastify) {
  fastify.post('/register', { schema: deviceSchema }, async (req, reply) => {
    return reply.send(decideRegisterDevice(req.body || {}));
  });
}
