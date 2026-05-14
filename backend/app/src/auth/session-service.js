/**
 * session-service — pure decision module + safe wire-shape constructors.
 *
 * NO DB writes here today; the host calls these helpers and is responsible
 * for persistence. NEVER logs tokens. NEVER returns the raw token in
 * a non-authenticated context.
 */

import { isAuthConfigured } from './auth-config.js';
import { authError } from './auth-errors.js';

/**
 * Decide whether a session-start request is allowed.
 *
 * Today, with AUTH_MODE = not_configured, this always returns the
 * auth_not_configured error. When OIDC ships, the host swaps in the
 * real implementation.
 */
export function decideSessionStart() {
  if (!isAuthConfigured()) {
    return Object.freeze({
      ok: false,
      ...authError(
        'auth_not_configured',
        'تسجيل الدخول غير مفعل بعد. سيتم تفعيله عند تكوين مزود الهوية.',
      ),
    });
  }
  // Even when configured, this server NEVER accepts a password grant
  // here. Clients must bring an OIDC-issued token; password-grant flows
  // happen at the IdP, never against Rahma backend.
  return Object.freeze({
    ok: false,
    ...authError(
      'password_grant_not_supported',
      'تسجيل الدخول يتم عبر مزود الهوية المعتمد. لا يقبل هذا الخادم كلمة مرور مباشرة.',
    ),
  });
}

/**
 * Decide whether a session refresh is allowed. Pure: takes the host's
 * verdict on token validity and returns a safe response shape.
 */
export function decideSessionRefresh({ tokenValid, principalAllowed }) {
  if (!isAuthConfigured()) {
    return authError('auth_not_configured',
      'تسجيل الدخول غير مفعل بعد.');
  }
  if (!tokenValid) {
    return authError('session_expired',
      'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.');
  }
  if (!principalAllowed) {
    return authError('forbidden',
      'لا تملك صلاحية الوصول إلى هذه الميزة.');
  }
  return Object.freeze({
    ok: true,
    next_action: 'mint_new_access_token',
  });
}

export function decideSessionLogout() {
  // Logout is always idempotent and safe; the mobile client clears its
  // in-memory token. The backend does not need to "succeed" — it just
  // ACKs.
  return Object.freeze({ ok: true, status: 'acknowledged' });
}
