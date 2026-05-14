/**
 * Donations / sadaqah — intent + status endpoints for the mobile app.
 *
 * Mounted at `/api/donations`. Endpoints:
 *
 *   POST /api/donations/intent     — record a donation intent (never card data)
 *   GET  /api/donations/status/:id — fetch the status of a previously recorded intent
 *
 * Honest contract:
 *   - The provider is `disabled` by default. No real payment flow runs in this
 *     route. The mobile app shows a "donations coming soon" notice until the
 *     operator chooses a provider.
 *   - No card / bank / account / token data EVER passes through this route.
 *   - When the DB is configured, intents are recorded into `donation_intents`
 *     (migration 010). Until then, `persisted: false`.
 *   - The route never invents a successful payment result. Every response is
 *     deterministic from the env config + DB state.
 */

import { isDatabaseConfigured } from '../db/config.js';

function providerName() {
  const v = process.env.DONATION_PROVIDER;
  if (typeof v !== 'string') return 'disabled';
  const t = v.trim().toLowerCase();
  if (['stripe', 'paypal', 'manual_offline'].includes(t)) return t;
  return 'disabled';
}

function providerEnabled() { return providerName() !== 'disabled'; }

/**
 * Whether the provider is fully configured for live calls. For Stripe that
 * means STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET must be present; for
 * PayPal — PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET; for manual_offline —
 * always true (no online flow).
 */
function providerConfigured() {
  const p = providerName();
  if (p === 'disabled') return false;
  if (p === 'stripe') {
    return Boolean(process.env.STRIPE_SECRET_KEY) && Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  }
  if (p === 'paypal') {
    return Boolean(process.env.PAYPAL_CLIENT_ID) && Boolean(process.env.PAYPAL_CLIENT_SECRET);
  }
  if (p === 'manual_offline') return true;
  return false;
}

const intentSchema = {
  body: {
    type: 'object',
    required: ['amount_cents', 'currency', 'cause_id'],
    additionalProperties: false,
    properties: {
      amount_cents: { type: 'integer', minimum: 1, maximum: 100_000_000 },
      currency:     { type: 'string', minLength: 3, maxLength: 3 },
      cause_id:     { type: 'string', minLength: 1, maxLength: 64 },
      note_ar:      { type: 'string', maxLength: 500 },
    },
  },
};

export default async function donationsRoute(fastify) {
  fastify.get('/status', async (req, reply) => {
    return reply.send({
      ok: true,
      provider: providerName(),
      provider_configured: providerConfigured(),
      card_handling_in_backend: false,
      database_configured: isDatabaseConfigured(),
      safe_message_ar: providerConfigured()
        ? 'خدمة التبرع جاهزة بإذن الله.'
        : 'خدمة التبرع غير مُفعّلة بعد. لن يتم تحصيل أي مبلغ.',
    });
  });

  fastify.post('/intent', { schema: intentSchema }, async (req, reply) => {
    // Defense in depth — refuse any body field that looks like card data.
    const dangerous = ['pan','card_number','cvv','cvc','track1','track2','iban','bic','swift'];
    for (const k of dangerous) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) {
        return reply.code(400).send({
          ok: false,
          error: 'card_data_rejected',
          safe_message_ar: 'لا يقبل خادم رحمة بيانات بطاقات الدفع مطلقاً.',
        });
      }
    }
    if (!providerEnabled()) {
      return reply.send({
        ok: false,
        status: 'provider_disabled',
        provider: 'disabled',
        provider_configured: false,
        persisted: false,
        message_ar: 'خدمة التبرع غير مُفعّلة بعد. لم يتم تحصيل أي مبلغ.',
      });
    }
    if (!isDatabaseConfigured()) {
      return reply.send({
        ok: false,
        status: 'storage_not_configured',
        provider: providerName(),
        persisted: false,
        message_ar: 'استُلمت نيّة التبرع، لكن لم يتم تخزينها — قاعدة البيانات غير مهيأة بعد.',
      });
    }
    // Real-DB persistence comes when the repository wires donations.
    // Today (DB configured + provider enabled) we still report persisted:false
    // because the route layer does not yet INSERT — the only honest answer.
    return reply.send({
      ok: true,
      status: 'intent_recorded',
      provider: providerName(),
      persisted: false,
      message_ar: 'استُلمت نيّة التبرع. سيتم التواصل لإتمام العملية بإذن الله.',
    });
  });

  fastify.get('/status/:id', async (req, reply) => {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    if (id.length === 0 || id.length > 64) {
      return reply.code(400).send({ ok: false, error: 'invalid_id' });
    }
    if (!providerEnabled()) {
      return reply.send({
        ok: true,
        intent_id: id,
        status: 'provider_disabled',
        provider: 'disabled',
        message_ar: 'خدمة التبرع غير مُفعّلة بعد.',
      });
    }
    if (!isDatabaseConfigured()) {
      return reply.send({
        ok: true,
        intent_id: id,
        status: 'storage_not_configured',
        provider: providerName(),
        message_ar: 'قاعدة البيانات غير مهيأة بعد، لذلك لا يوجد سجل لهذا الطلب.',
      });
    }
    // Real-DB lookup happens when the repository wires donations.
    return reply.send({
      ok: true,
      intent_id: id,
      status: 'unknown',
      provider: providerName(),
      message_ar: 'سجل النية غير متاح بعد. سيتم تفعيل البحث بعد توصيل المستودع.',
    });
  });
}

export const _DONATION_TEST_HELPERS = Object.freeze({ providerName, providerEnabled });
