/**
 * password-policy — pure module.
 *
 * Used only when AUTH_MODE supports a local-password flow (rarely;
 * default is OIDC-via-external). When called, validates a candidate
 * password against the operator-defined policy. NEVER logs the
 * candidate.
 */

const MIN_LEN = 12;
const MAX_LEN = 128;

export function validatePasswordPolicy(candidate) {
  if (typeof candidate !== 'string') {
    return { ok: false, reason: 'invalid_type' };
  }
  const len = candidate.length;
  if (len < MIN_LEN) return { ok: false, reason: 'too_short', min_length: MIN_LEN };
  if (len > MAX_LEN) return { ok: false, reason: 'too_long',  max_length: MAX_LEN };
  if (!/[A-Z]/.test(candidate))  return { ok: false, reason: 'missing_uppercase' };
  if (!/[a-z]/.test(candidate))  return { ok: false, reason: 'missing_lowercase' };
  if (!/[0-9]/.test(candidate))  return { ok: false, reason: 'missing_digit' };
  const symbolMatch = /[!@#$%^&*()_+\-={};:'",.<>?/\\|`~]/.test(candidate)
    || candidate.includes('[')
    || candidate.includes(']');
  if (!symbolMatch) return { ok: false, reason: 'missing_symbol' };
  // Reject the most common breached passwords. Not exhaustive — the real
  // check would call a have-i-been-pwned compromise check at registration.
  const lower = candidate.toLowerCase();
  for (const bad of ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome']) {
    if (lower.includes(bad)) return { ok: false, reason: 'common_password' };
  }
  return { ok: true, reason: null };
}

export const PASSWORD_POLICY = Object.freeze({
  min_length: MIN_LEN,
  max_length: MAX_LEN,
  require_uppercase: true,
  require_lowercase: true,
  require_digit: true,
  require_symbol: true,
});
