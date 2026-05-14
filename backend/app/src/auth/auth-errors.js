/**
 * auth-errors — canonical error shape and codes for the auth surface.
 *
 * The error code is machine-readable; the `safe_message_ar` is user-facing.
 * NEVER includes the candidate password / token / DSN.
 */

export const AUTH_ERROR_CODES = Object.freeze([
  'auth_not_configured',
  'password_grant_not_supported',
  'unauthenticated',
  'forbidden',
  'invalid_email',
  'invalid_password',
  'common_password',
  'session_expired',
  'session_revoked',
  'invalid_device',
  'rate_limited',
]);

export function authError(code, safeMessageAr) {
  if (!AUTH_ERROR_CODES.includes(code)) {
    code = 'auth_not_configured';
  }
  return Object.freeze({
    ok: false,
    error: code,
    safe_message_ar: safeMessageAr || 'حدث خطأ. حاول مرة أخرى لاحقاً.',
  });
}
