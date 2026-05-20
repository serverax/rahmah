/**
 * Auth configuration — env-driven, never hardcoded.
 *
 * Modes (default = `not_configured`):
 *   - not_configured  → protected routes return 503 auth_not_configured.
 *   - dev_local       → test/dev only; reads a JSON principal from a request
 *                       header. Refused unless NODE_ENV=test OR
 *                       SAKINA_ALLOW_DEV_AUTH=true.
 *   - external        → operator-supplied provider. A real adapter is not
 *                       shipped this sprint; even with `AUTH_MODE=external`,
 *                       the route returns 401 until a principal is provided.
 *
 * No real secret needs to be present for `not_configured`. The other modes
 * read SESSION_SECRET / SHEIKH_ALLOWED_EMAIL_HASHES from the env.
 * Values stored in env, never in repo.
 */

import { isValidEmailHash } from './email-hash.js';

const ALLOWED_MODES = Object.freeze(['not_configured', 'dev_local', 'external']);

export function getAuthMode() {
  const v = String(process.env.AUTH_MODE || '').toLowerCase();
  if (ALLOWED_MODES.includes(v)) return v;
  return 'not_configured';
}

export function isAuthConfigured() {
  const mode = getAuthMode();
  if (mode === 'not_configured') return false;
  if (mode === 'dev_local') {
    if (process.env.NODE_ENV !== 'test' && process.env.SAKINA_ALLOW_DEV_AUTH !== 'true') {
      return false;
    }
    return true;
  }
  if (mode === 'external') {
    return isValidProductionSessionSecret(process.env.SESSION_SECRET);
  }
  return false;
}

export function isValidProductionSessionSecret(secret) {
  if (typeof secret !== 'string') return false;
  const trimmed = secret.trim();
  if (trimmed.length < 32) return false;
  if (/CHANGE_ME|REPLACE_ME|PLACEHOLDER/i.test(trimmed)) return false;
  if (/^(changeme|change_me|replace_me|placeholder|your[-_]?secret|dev[-_]?secret|secret|password)$/i.test(trimmed)) {
    return false;
  }
  if (/^(.)\1+$/.test(trimmed)) return false;
  return /[a-z]/.test(trimmed) && /[A-Z]/.test(trimmed) && /[0-9]/.test(trimmed);
}

export function isSheikhLoginEnabled() {
  if (!isAuthConfigured()) return false;
  return String(process.env.AUTH_SHEIKH_LOGIN || '').toLowerCase() === 'true';
}

export function isAdminLoginEnabled() {
  if (!isAuthConfigured()) return false;
  return String(process.env.AUTH_ADMIN_LOGIN || '').toLowerCase() === 'true';
}

function parseAllowList(envValue) {
  if (typeof envValue !== 'string' || envValue.length === 0) return new Set();
  const out = new Set();
  for (const part of envValue.split(',')) {
    const trimmed = part.trim();
    if (isValidEmailHash(trimmed)) out.add(trimmed);
  }
  return out;
}

export function getAllowedSheikhEmailHashes() {
  if (!isAuthConfigured()) return new Set();
  return parseAllowList(process.env.SHEIKH_ALLOWED_EMAIL_HASHES);
}

export function getAllowedAdminEmailHashes() {
  if (!isAuthConfigured()) return new Set();
  return parseAllowList(process.env.ADMIN_ALLOWED_EMAIL_HASHES);
}

export const AUTH_NOT_CONFIGURED_AR = 'تسجيل دخول الشيخ غير مفعل بعد';
export const AUTH_UNAUTHENTICATED_AR = 'يلزم تسجيل الدخول قبل المتابعة.';
export const AUTH_FORBIDDEN_AR = 'لا تملك صلاحية لهذا الإجراء.';
