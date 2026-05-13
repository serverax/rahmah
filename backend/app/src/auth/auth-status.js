/**
 * Auth status summarizer. Returns a frozen object the route forwards as JSON.
 * Never echoes secrets. Never reports auth_configured=true unless the env is
 * actually configured.
 */

import {
  getAuthMode,
  isAuthConfigured,
  isSheikhLoginEnabled,
  isAdminLoginEnabled,
  AUTH_NOT_CONFIGURED_AR,
} from './auth-config.js';
import { ALL_ROLES } from './roles.js';

/**
 * Provider name reported in /api/auth/status. Read-only mirror of the
 * AUTH_PROVIDER env var. Never includes secrets — only the safe identifier
 * the operator chose to expose.
 */
function safeProviderName() {
  const v = process.env.AUTH_PROVIDER;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (t.length === 0 || t.length > 64) return null;
  if (!/^[a-z0-9_.-]+$/i.test(t)) return null;
  return t;
}

function oidcIssuerConfigured() {
  const i = process.env.OIDC_ISSUER;
  return typeof i === 'string' && /^https?:\/\//i.test(i);
}

function oidcClientIdConfigured() {
  const c = process.env.OIDC_CLIENT_ID;
  return typeof c === 'string' && c.trim().length > 0;
}

function oidcClientSecretConfigured() {
  const s = process.env.OIDC_CLIENT_SECRET;
  return typeof s === 'string' && s.length >= 16;
}

export function buildAuthStatus() {
  const configured = isAuthConfigured();
  return Object.freeze({
    auth_configured: configured,
    mode: getAuthMode(),
    provider: configured ? safeProviderName() : null,
    sheikh_login_enabled: isSheikhLoginEnabled(),
    admin_login_enabled: isAdminLoginEnabled(),
    roles_supported: ALL_ROLES,
    oidc: Object.freeze({
      issuer_configured:        oidcIssuerConfigured(),
      client_id_configured:     oidcClientIdConfigured(),
      client_secret_configured: oidcClientSecretConfigured(),
    }),
    safe_message_ar: configured
      ? 'إعداد تسجيل الدخول مفعَّل. يُرجى استخدام مزوّد الهوية المعتمد.'
      : AUTH_NOT_CONFIGURED_AR,
  });
}
