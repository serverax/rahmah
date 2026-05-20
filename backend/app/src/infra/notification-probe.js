function envFlag(name, fallback) {
  const v = process.env[name];
  if (typeof v !== 'string') return fallback;
  const t = v.toLowerCase();
  if (t === 'true') return true;
  if (t === 'false') return false;
  return fallback;
}

function secretConfigured(name) {
  const v = process.env[name];
  return typeof v === 'string'
    && v.length >= 20
    && !/CHANGE_ME|REPLACE_ME|placeholder/i.test(v);
}

/**
 * Push notification production readiness (never logs secret values).
 * Local flutter_local_notifications foundation is separate.
 */
export function pushNotificationReadiness() {
  const push_required = envFlag('PUSH_NOTIFICATIONS_PRODUCTION_REQUIRED', true);
  const ios_required = envFlag('IOS_PUSH_REQUIRED', true);
  const fcm_configured = secretConfigured('FCM_SERVER_KEY');
  const apns_configured = secretConfigured('APNS_P8_KEY');
  const push_production_ready = !push_required
    || (fcm_configured && (!ios_required || apns_configured));

  return {
    foundation_ready: true,
    push_required,
    ios_required,
    fcm_configured,
    apns_configured,
    push_production_ready,
    ready: push_production_ready,
  };
}
