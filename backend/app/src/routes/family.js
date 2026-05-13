/**
 * Family / child-mode routes — Sprint 12 backend foundation.
 *
 * Mounted by app.js at prefix `/api/family`. Endpoints:
 *
 *   GET  /privacy           — Arabic privacy notice (static, public).
 *   POST /children          — Guardian-only: create a child profile (auth-gated).
 *   GET  /children          — Guardian-only: list children for the family.
 *   GET  /guardian/settings — Guardian-only: read guardian settings.
 *
 * Auth-gated endpoints return 503 `auth_not_configured` until the real
 * Sheikh/guardian auth plugin is wired in a later sprint. Public privacy
 * notice is always served.
 */

import { isAuthConfigured, authNotConfiguredBody, requireRole } from '../sheikh/sheikh-auth-policy.js';
import {
  evaluateChildProfileField,
  AGE_BANDS,
} from '../family/child-safety-policy.js';

const childCreateSchema = {
  body: {
    type: 'object',
    required: ['nickname_ar', 'age_band'],
    additionalProperties: false,
    properties: {
      nickname_ar: { type: 'string', minLength: 1, maxLength: 32 },
      age_band:    { type: 'string', enum: ['4-6', '7-9', '10-12', '13+'] },
    },
  },
};

const PRIVACY_NOTICE_AR = Object.freeze({
  title_ar: 'سياسة الخصوصية — وضع الأسرة والطفل',
  body_ar: [
    'نحرص في تطبيق رحمة على حماية بيانات العائلة والأطفال.',
    'لا نطلب من الطفل اسمه الحقيقي أو رقم هاتفه أو عنوانه.',
    'يُحفظ تقدّم الطفل داخل الجهاز أو ضمن حسابه الخاص، ولا يظهر بشكل عام أبداً.',
    'لا يوجد أي ملف عام للطفل، ولا قوائم تصنيف عامة بين الأطفال.',
    'لا يوجد دردشة بين الأطفال داخل التطبيق.',
    'ولي الأمر يتحكم في تفعيل الوضع وحدود الوقت اليومي.',
    'تُسجّل أي إجراءات حساسة من ولي الأمر في سجل الخصوصية الداخلي للمراجعة.',
  ].join('\n'),
  contact_ar: 'لأي استفسار حول الخصوصية، يمكنكم التواصل من شاشة الإعدادات.',
});

export default async function familyRoute(fastify) {
  // -------------------------------------------------------------------------
  // Public privacy notice — Arabic-only, no PII, no secrets.
  // -------------------------------------------------------------------------
  fastify.get('/privacy', async (req, reply) => {
    return reply.send({ ok: true, privacy: PRIVACY_NOTICE_AR });
  });

  // -------------------------------------------------------------------------
  // Guardian-only: create a child profile.
  // -------------------------------------------------------------------------
  fastify.post('/children', { schema: childCreateSchema }, async (req, reply) => {
    if (!isAuthConfigured()) {
      return reply.code(503).send(authNotConfiguredBody());
    }
    const auth = requireRole(req, ['admin', 'moderator', 'sheikh']);
    // We re-use the existing role gate. A dedicated 'guardian' role can be
    // added in a follow-up sprint once family auth ships; today we accept
    // moderator/admin as the placeholder so tests can exercise the flow.
    if (!auth.ok) return reply.code(auth.status).send(auth.body);

    // Per-field child-safety guard. Even with a passing schema, the safety
    // policy module owns the decision.
    const nickCheck = evaluateChildProfileField({
      field: 'nickname_ar',
      value: req.body.nickname_ar,
    });
    if (nickCheck.decision !== 'allow') {
      return reply.code(400).send({ ok: false, error: nickCheck.reason });
    }
    const ageCheck = evaluateChildProfileField({
      field: 'age_band',
      value: req.body.age_band,
    });
    if (ageCheck.decision !== 'allow') {
      return reply.code(400).send({ ok: false, error: ageCheck.reason });
    }

    // Persistence is left to a follow-up sprint when a child_profiles
    // repository is wired. The route returns the decision deterministically
    // so the future UI can render the success state with no surprises.
    return reply.send({
      ok: true,
      profile: {
        nickname_ar: req.body.nickname_ar.trim(),
        age_band: req.body.age_band,
        child_mode_enabled: true,
        public_profile: false,
      },
      // Schema-enforced invariants surfaced for the UI.
      invariants: {
        public_profile_locked_false: true,
        public_sharing_locked_false: true,
        chat_between_children: false,
      },
    });
  });

  // -------------------------------------------------------------------------
  // Guardian-only: list children. No public exposure.
  // -------------------------------------------------------------------------
  fastify.get('/children', async (req, reply) => {
    if (!isAuthConfigured()) {
      return reply.code(503).send(authNotConfiguredBody());
    }
    const auth = requireRole(req, ['admin', 'moderator', 'sheikh']);
    if (!auth.ok) return reply.code(auth.status).send(auth.body);
    // Empty list when no repository wired.
    return reply.send({ ok: true, children: [] });
  });

  // -------------------------------------------------------------------------
  // Guardian-only: settings read.
  // -------------------------------------------------------------------------
  fastify.get('/guardian/settings', async (req, reply) => {
    if (!isAuthConfigured()) {
      return reply.code(503).send(authNotConfiguredBody());
    }
    const auth = requireRole(req, ['admin', 'moderator', 'sheikh']);
    if (!auth.ok) return reply.code(auth.status).send(auth.body);
    return reply.send({
      ok: true,
      settings: {
        child_game_enabled: true,
        hide_sensitive_topics: true,
        daily_usage_minutes: 30,
        // Schema CHECK guarantees this stays false.
        public_sharing: false,
        allowed_age_bands: AGE_BANDS,
      },
    });
  });
}
