/**
 * device-service — register-device decision (pure).
 *
 * Mobile app submits `{ platform, app_version, device_hash }`.
 * The host calls this helper to validate input shape and decide the
 * response. NEVER stores the raw `device_id`; the mobile client hashes
 * it locally before sending.
 */

import { isDatabaseConfigured } from '../db/config.js';

const PLATFORMS = ['android', 'ios', 'unknown'];
const HEX64 = /^[a-f0-9]{64}$/i;

export function validateDeviceRegistration({ platform, app_version, device_hash } = {}) {
  if (!PLATFORMS.includes(platform)) {
    return { ok: false, reason: 'invalid_platform' };
  }
  if (typeof app_version !== 'string' || app_version.length === 0 || app_version.length > 32) {
    return { ok: false, reason: 'invalid_app_version' };
  }
  if (typeof device_hash !== 'string' || !HEX64.test(device_hash)) {
    return { ok: false, reason: 'invalid_device_hash' };
  }
  return { ok: true, reason: null };
}

export function decideRegisterDevice(input) {
  const check = validateDeviceRegistration(input);
  if (!check.ok) {
    return Object.freeze({ ok: false, persisted: false, reason: check.reason });
  }
  if (!isDatabaseConfigured()) {
    return Object.freeze({
      ok: true,
      persisted: false,
      reason: 'database_not_configured',
      message_ar: 'تم استلام التسجيل محلياً، سيتم تخزينه عند توصيل قاعدة البيانات.',
    });
  }
  // With a DB, the repository INSERT lands as a future wiring. Honest
  // foundation reply for now.
  return Object.freeze({
    ok: true,
    persisted: false,
    platform: input.platform,
    app_version: input.app_version,
  });
}
