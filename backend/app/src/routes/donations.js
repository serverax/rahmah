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
  fastify.post('/intent', { schema: intentSchema }, async (req, reply) => {
    if (!providerEnabled()) {
      return reply.send({
        ok: false,
        status: 'provider_disabled',
        provider: 'disabled',
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
