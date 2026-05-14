/**
 * Sheikh login route (mobile API).
 *
 * Mounted at `/api/sheikh/login`. This is the foundation endpoint the
 * mobile app calls to verify whether scholar sign-in is available on the
 * current backend.
 *
 * Today the backend ships with `AUTH_MODE=not_configured` by default, so
 * `POST /api/sheikh/login` returns `503 auth_not_configured`. The real
 * login flow runs through the operator-configured OIDC provider (see
 * `docs/api/RAHMA_AUTH_CONTRACT.md`); the mobile app obtains a JWT from
 * the IdP and uses it via `Authorization: Bearer <jwt>` on the
 * `/api/sheikh/*` routes — there is no password-grant endpoint here.
 */

import {
  isAuthConfigured,
  getAuthMode,
  AUTH_NOT_CONFIGURED_AR,
} from '../auth/auth-config.js';

export default async function sheikhLoginRoute(fastify) {
  fastify.post('/login', async (req, reply) => {
    if (!isAuthConfigured()) {
      return reply.code(503).send({
        ok: false,
        error: 'auth_not_configured',
        mode: getAuthMode(),
        password_grant_supported: false,
        message_ar: AUTH_NOT_CONFIGURED_AR,
        guidance_ar:
          'يتم تسجيل دخول الشيخ عبر مزود الهوية المعتمد من المشغل، وليس عبر كلمة مرور هنا.',
      });
    }
    // When auth is configured (external mode), the route directs the
    // mobile app to obtain a token from the OIDC provider. We never
    // accept a raw password here.
    return reply.code(400).send({
      ok: false,
      error: 'password_grant_not_supported',
      mode: getAuthMode(),
      message_ar:
        'تسجيل الدخول يتم عبر مزود الهوية المعتمد. لا يقبل هذا الخادم كلمة مرور مباشرة.',
    });
  });
}
