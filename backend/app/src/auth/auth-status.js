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

export function buildAuthStatus() {
  const configured = isAuthConfigured();
  return Object.freeze({
    auth_configured: configured,
    mode: getAuthMode(),
    sheikh_login_enabled: isSheikhLoginEnabled(),
    admin_login_enabled: isAdminLoginEnabled(),
    safe_message_ar: configured
      ? 'إعداد تسجيل الدخول مفعَّل. يُرجى استخدام مزوّد الهوية المعتمد.'
      : AUTH_NOT_CONFIGURED_AR,
  });
}
