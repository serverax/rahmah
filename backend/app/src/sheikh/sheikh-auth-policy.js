/**
 * Sheikh Hasan authentication / authorization policy.
 *
 * Real authentication is intentionally NOT wired in this sprint. Sheikh-only
 * and moderator-only and admin-only routes are protected by a placeholder
 * that returns 503 `auth_not_configured` whenever the operator has not
 * configured an auth context.
 *
 * The contract:
 *   - `isAuthConfigured()` reads `SHEIKH_AUTH_REQUIRED` from the environment.
 *     - 'false' / unset  → 503 (auth_not_configured) on protected routes.
 *     - 'true'           → still 503 unless a real auth principal is provided
 *                          via `req.sheikh_principal` (set by a future
 *                          auth plugin). This is a strict fail-closed gate.
 *   - `requireRole(req, allowedRoles)` returns {ok, status, body}. The caller
 *     is responsible for sending the response.
 *
 * No password hashing here. No JWT signing here. Those belong to the auth
 * plugin that will be added in a future sprint.
 */

export const SHEIKH_ROLES = Object.freeze(['user', 'sheikh', 'moderator', 'admin']);

export function isAuthConfigured() {
  // The flag toggles whether the operator has opted-in to enabling protected
  // routes. Even when 'true', we still require an actual principal — the flag
  // alone does not unlock anything.
  return String(process.env.SHEIKH_AUTH_REQUIRED || '').toLowerCase() === 'true';
}

export function authNotConfiguredBody() {
  return Object.freeze({
    ok: false,
    error: 'auth_not_configured',
    message:
      'Sheikh Hasan authentication is not yet configured in this build. ' +
      'Protected routes will be available once an auth provider is wired.',
  });
}

/**
 * Decide whether a request is allowed for the given roles. Returns:
 *   { ok: true,  principal }                            — allowed
 *   { ok: false, status, body }                         — refused; caller sends response
 *
 * `req.sheikh_principal` is the contract for the (future) auth plugin to set
 * the resolved principal. Today, no plugin sets it — every protected route
 * therefore returns 503.
 */
export function requireRole(req, allowedRoles) {
  if (!isAuthConfigured()) {
    return { ok: false, status: 503, body: authNotConfiguredBody() };
  }
  const principal = req && req.sheikh_principal;
  if (!principal || typeof principal !== 'object') {
    return { ok: false, status: 503, body: authNotConfiguredBody() };
  }
  if (typeof principal.role !== 'string' || !SHEIKH_ROLES.includes(principal.role)) {
    return { ok: false, status: 403, body: Object.freeze({ ok: false, error: 'forbidden' }) };
  }
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!allowed.includes(principal.role)) {
    return { ok: false, status: 403, body: Object.freeze({ ok: false, error: 'forbidden' }) };
  }
  return { ok: true, principal };
}
