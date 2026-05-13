/**
 * WhatsApp notifier for Sheikh Hasan — DISABLED by default.
 *
 * Contract for this sprint:
 *   - WHATSAPP_ENABLED defaults to 'false'. Every call returns
 *     { ok: false, reason: 'pending_config' } until the operator enables it.
 *   - Even when enabled, this module does NOT make external network calls
 *     in this sprint. The actual provider adapter is intentionally NOT
 *     implemented here — adding any network client (HTTP / SDK) requires
 *     a separate sprint with explicit approval, security review, and
 *     vendor-side privacy-policy review.
 *   - No real phone numbers, tokens, or provider names are stored in the
 *     repo. Operator-side configuration flows via environment variables
 *     (templated in deployment/k3s/secrets/sakina-secrets.template.yaml).
 *
 * The function returns the notification "intent" so route handlers can log
 * the decision deterministically. It never logs the full question body.
 */

const PENDING = Object.freeze({ ok: false, reason: 'pending_config' });

export function isWhatsAppConfigured() {
  const flag = String(process.env.WHATSAPP_ENABLED || '').toLowerCase();
  if (flag !== 'true') return false;
  // Even with the flag, require all three placeholders to be present and
  // non-empty. The env-var NAMES are not secrets; their VALUES come from a
  // Kubernetes Secret resolved at deploy time.
  const provider = process.env.WHATSAPP_PROVIDER;
  const token = process.env.WHATSAPP_API_TOKEN;
  const recipient = process.env.SHEIKH_HASAN_WHATSAPP_TO;
  return Boolean(
    provider && provider.length > 0 &&
    token && token.length > 0 &&
    recipient && recipient.length > 0,
  );
}

/**
 * Notify Sheikh Hasan that a new pending question is waiting.
 *
 * NOTE: This function will NEVER include the question body in the message
 * because of privacy policy. The notification text is a non-sensitive
 * "a new question is waiting in the app" string. The Sheikh opens the
 * application to read the actual question.
 *
 * Returns:
 *   { ok: true,  delivered: true,  intent }  — placeholder for a future
 *      sprint that wires a real provider adapter; today this branch is
 *      unreachable because the function returns PENDING before then.
 *   { ok: false, reason: 'pending_config' }  — current default.
 */
export async function notifyNewQuestion({ question_id } = {}) {
  if (!isWhatsAppConfigured()) return PENDING;
  // Intentionally not implemented: no provider client, no network call.
  // When this is wired in a future sprint, the body MUST remain generic and
  // the message MUST NOT include question content.
  return Object.freeze({
    ok: false,
    reason: 'provider_adapter_not_implemented',
    intent: Object.freeze({
      to: '[redacted-recipient]',
      template: 'sheikh_new_question_waiting',
      payload_keys: ['question_id'],
      question_id: typeof question_id === 'string' ? question_id : null,
    }),
  });
}

export function whatsappStatusForReady() {
  return Object.freeze({
    enabled: String(process.env.WHATSAPP_ENABLED || '').toLowerCase() === 'true',
    configured: isWhatsAppConfigured(),
  });
}
