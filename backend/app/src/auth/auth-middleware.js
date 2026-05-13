/**
 * Auth middleware factory.
 *
 *   - `not_configured` → 503 { error: 'auth_not_configured' }
 *   - `dev_local` (tests only) → reads `x-sakina-test-principal` JSON header
 *   - `external`               → expects req.sakina_principal to be set by an
 *                                upstream adapter (not shipped this sprint)
 *
 * Never:
 *   - stores or echoes a token
 *   - returns a fake-success when not configured
 *   - hardcodes user identities
 */

import {
  getAuthMode,
  isAuthConfigured,
  getAllowedSheikhEmailHashes,
  getAllowedAdminEmailHashes,
  AUTH_NOT_CONFIGURED_AR,
  AUTH_UNAUTHENTICATED_AR,
  AUTH_FORBIDDEN_AR,
} from './auth-config.js';

const TEST_HEADER = 'x-sakina-test-principal';

function readDevPrincipal(req) {
  if (process.env.NODE_ENV !== 'test' && process.env.SAKINA_ALLOW_DEV_AUTH !== 'true') return null;
  const raw = req.headers && req.headers[TEST_HEADER];
  if (!raw || typeof raw !== 'string') return null;
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    if (!['sheikh', 'moderator', 'admin'].includes(p.role)) return null;
    return Object.freeze({
      role: p.role,
      user_id: typeof p.user_id === 'string' ? p.user_id : null,
      email_hash: typeof p.email_hash === 'string' && p.email_hash.length === 64 ? p.email_hash : null,
      source: 'dev_local',
    });
  } catch {
    return null;
  }
}

function isAllowed(principal, allowedRoles) {
  if (!principal || !allowedRoles || allowedRoles.length === 0) return false;
  if (!allowedRoles.includes(principal.role)) return false;
  if (principal.role === 'sheikh') {
    const allow = getAllowedSheikhEmailHashes();
    if (allow.size > 0 && !allow.has(principal.email_hash)) return false;
  }
  if (principal.role === 'admin') {
    const allow = getAllowedAdminEmailHashes();
    if (allow.size > 0 && !allow.has(principal.email_hash)) return false;
  }
  return true;
}

export function requireAuth(allowedRoles) {
  return async function preHandler(req, reply) {
    if (!isAuthConfigured()) {
      return reply.code(503).send({
        ok: false,
        error: 'auth_not_configured',
        message_ar: AUTH_NOT_CONFIGURED_AR,
      });
    }
    const mode = getAuthMode();
    let principal = null;
    if (mode === 'dev_local') principal = readDevPrincipal(req);
    else if (mode === 'external')
      principal = (req.sakina_principal && typeof req.sakina_principal === 'object') ? req.sakina_principal : null;
    if (!principal) {
      return reply.code(401).send({
        ok: false,
        error: 'unauthenticated',
        message_ar: AUTH_UNAUTHENTICATED_AR,
      });
    }
    if (!isAllowed(principal, allowedRoles)) {
      return reply.code(403).send({
        ok: false,
        error: 'forbidden',
        message_ar: AUTH_FORBIDDEN_AR,
      });
    }
    req.sakina_principal = principal;
  };
}
