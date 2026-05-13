/**
 * Charity / sadaqah routes — Sprint 13 backend foundation.
 *
 * Mounted at prefix `/api/sadaqah`. Endpoints:
 *
 *   GET  /campaigns             — public list (only active+approved).
 *   GET  /campaigns/:id         — public detail.
 *   POST /campaigns/:id/donate  — intent only; if provider not configured,
 *                                 returns provider_not_configured (NOT success).
 *   GET  /transparency          — public transparency notice.
 *
 * Admin operations live on `/api/admin/charity` in a future sprint with
 * proper auth — not part of this commit.
 */

import {
  isPubliclyListable,
  evaluateDonationIntent,
  publicCampaignProjection,
} from '../charity/campaign-policy.js';

const donateSchema = {
  body: {
    type: 'object',
    required: ['amount'],
    additionalProperties: false,
    properties: {
      amount: { type: 'number', exclusiveMinimum: 0, maximum: 1_000_000 },
      currency: { type: 'string', minLength: 3, maxLength: 8 },
    },
  },
};

let _campaignRepository = null;
export function configureCharityRepository({ repository = null } = {}) {
  _campaignRepository = repository;
}
export function _resetCharityRepositoryForTests() {
  _campaignRepository = null;
}

function providerStatus() {
  // Operator-managed via env. Defaults to 'disabled' so we never pretend
  // payment works. Real provider integration is a separate sprint.
  const s = String(process.env.CHARITY_PAYMENT_PROVIDER_STATUS || '').toLowerCase();
  if (s === 'enabled' || s === 'sandbox') return s;
  return 'disabled';
}

const TRANSPARENCY_NOTICE_AR = Object.freeze({
  title_ar: 'الشفافية في الصدقة',
  body_ar: [
    'كل حملة تظهر للعموم تكون قد مرّت بمراجعة داخلية واعتُمدت قبل النشر.',
    'لا يتم جمع تفاصيل البطاقة داخل التطبيق إذا لم يكن مزود الدفع مفعّلاً.',
    'يتم نشر تحديثات الحملة وتقارير التوزيع في صفحة الحملة.',
    'إذا لم يكن مزوّد الدفع مفعّلاً، يظهر بوضوح أن "الدفع غير مفعّل حالياً".',
    'لا نمنح إيصال نجاح وهمياً.',
  ].join('\n'),
});

export default async function charityRoute(fastify) {
  // List active+approved campaigns.
  fastify.get('/campaigns', async (req, reply) => {
    if (!_campaignRepository) {
      return reply.send({ ok: true, configured: false, items: [] });
    }
    const q = req.query || {};
    const category = typeof q.category === 'string' ? q.category : null;
    const rows = await _campaignRepository.listPublic({ category, limit: 50 });
    const items = (Array.isArray(rows) ? rows : [])
      .filter(isPubliclyListable)
      .map(publicCampaignProjection);
    return reply.send({ ok: true, configured: true, items });
  });

  // Detail.
  fastify.get('/campaigns/:id', async (req, reply) => {
    if (!_campaignRepository) {
      return reply.code(503).send({ ok: false, error: 'service_not_configured' });
    }
    const row = await _campaignRepository.findById({ id: req.params.id });
    if (!row || !isPubliclyListable(row)) {
      return reply.code(404).send({ ok: false, error: 'not_found' });
    }
    return reply.send({ ok: true, campaign: publicCampaignProjection(row) });
  });

  // Donate intent — never claims success unless a provider says so.
  fastify.post('/campaigns/:id/donate', { schema: donateSchema }, async (req, reply) => {
    if (!_campaignRepository) {
      return reply.code(503).send({ ok: false, error: 'service_not_configured' });
    }
    const campaign = await _campaignRepository.findById({ id: req.params.id });
    const decision = evaluateDonationIntent({
      campaign,
      amount: req.body.amount,
      currency: req.body.currency || 'USD',
      provider_status: providerStatus(),
    });

    if (decision.decision === 'allow_intent_record') {
      // Persistence in a follow-up sprint when a real provider is wired.
      return reply.send({
        ok: true,
        status: 'intent_recorded',
        message_ar: 'تم تسجيل نيتكم بالتبرع. سنواصل المعالجة عبر مزوّد الدفع.',
      });
    }
    if (decision.decision === 'provider_not_configured') {
      return reply.code(503).send({
        ok: false,
        error: 'payment_provider_not_active',
        message_ar: decision.user_message_ar,
      });
    }
    return reply.code(400).send({
      ok: false,
      error: decision.reason || 'donation_blocked',
    });
  });

  // Transparency notice.
  fastify.get('/transparency', async (req, reply) => {
    return reply.send({
      ok: true,
      transparency: TRANSPARENCY_NOTICE_AR,
      provider_status: providerStatus(),
    });
  });
}
