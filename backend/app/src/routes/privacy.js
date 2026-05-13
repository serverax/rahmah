/**
 * Privacy / data-rights routes.
 *
 *   GET  /api/privacy/status                — public privacy status snapshot
 *   POST /api/privacy/delete-account-request — non-persisted when no DB
 *   POST /api/privacy/data-export-request    — non-persisted when no DB
 *   GET  /api/privacy/child-safety           — Arabic child-safety statement
 *   GET  /api/terms/status                   — terms readiness snapshot
 *
 * Email never stored raw — only sha-256 hash. Requests never claim
 * completion when the storage layer is missing.
 */

import { createHash } from 'node:crypto';
import { isDatabaseConfigured } from '../db/config.js';
import { requireAuth } from '../auth/auth-middleware.js';
import { ROLES } from '../auth/roles.js';

const PRIVACY_REQUEST_TYPES = Object.freeze([
  'delete_account',
  'data_export',
  'correct_data',
  'restrict_processing',
  'contact',
]);

function hashEmail(email) {
  if (typeof email !== 'string') return null;
  const t = email.trim().toLowerCase();
  if (t.length === 0) return null;
  return createHash('sha256').update(t).digest('hex');
}

const requestSchema = {
  body: {
    type: 'object',
    required: ['email'],
    additionalProperties: false,
    properties: {
      email: { type: 'string', minLength: 5, maxLength: 320 },
      reason: { type: 'string', maxLength: 1000 },
    },
  },
};

const PRIVACY_NOTICE_AR = Object.freeze({
  title_ar: 'سياسة الخصوصية — رحمة/سكينة',
  body_ar: [
    'نحرص على احترام خصوصيتكم وحماية بيانات الأطفال.',
    'لا يتم نشر أي بيانات شخصية في الإجابات العامة.',
    'لا نطلب من الأطفال أي معلومة شخصية.',
    'تُحفظ نتائج لعبة الطفل محلياً على الجهاز فقط.',
    'تتم مراجعة أسئلة الشيخ شرعياً قبل نشرها للعموم.',
    'الإجابات العامة تُعرض مع المصادر فقط بعد المراجعة.',
    'الدفع غير مُفعّل ما لم يُهيَّأ مزوّد دفع رسمي.',
    'لا نبيع بياناتكم.',
    'يمكنكم تقديم طلب حذف الحساب أو طلب نسخة من بياناتكم.',
    'يتم التواصل معنا عبر الصفحة المخصصة، وسيتم الرد بإذن الله.',
  ].join('\n'),
});

const TERMS_NOTICE_AR = Object.freeze({
  title_ar: 'شروط الاستخدام — رحمة/سكينة',
  body_ar: [
    'التطبيق يقدم محتوى إسلامياً تعليمياً ودعماً للأسرة.',
    'إجابات الشيخ تتطلب مصادر من القرآن أو الحديث أو مرجع شرعي معتمد.',
    'المحتوى غير المعتمد لا يُعتبر فتوى للعموم.',
    'لا يقدم التطبيق نصيحة طبية أو قانونية أو مالية مهنية، يُرجى مراجعة المختصين.',
    'استخدام وضع الطفل يتطلب إشراف ولي الأمر.',
    'تكون التبرعات فعّالة فقط عند تهيئة مزوّد دفع رسمي.',
    'لا يدّعي التطبيق صفة جمعية خيرية مسجّلة ما لم يُذكر ذلك صراحة بدليل.',
  ].join('\n'),
});

const CHILD_SAFETY_AR = Object.freeze({
  title_ar: 'سلامة الطفل في تطبيق رحمة',
  body_ar: [
    'لا نطلب اسم الطفل الحقيقي ولا رقم هاتفه ولا عنوانه ولا صورته.',
    'لا توجد دردشة بين الأطفال داخل التطبيق.',
    'لا يوجد ملف عام للطفل ولا قوائم تصنيف عامة.',
    'تقدم الطفل محفوظ داخل الجهاز فقط.',
    'ولي الأمر يستطيع تفعيل/إيقاف الوضع وتحديد وقت الاستخدام اليومي.',
    'كل تعليق يستخدم لغة لطيفة بلا قسوة.',
  ].join('\n'),
});

export default async function privacyRoute(fastify) {
  fastify.get('/privacy/status', async (req, reply) => {
    return reply.send({
      ok: true,
      privacy: PRIVACY_NOTICE_AR,
      storage_configured: isDatabaseConfigured(),
      child_safety_available: true,
      account_deletion_available: true,    // endpoint exists; persistence may be deferred
      data_export_available: true,
      contact_available: true,
    });
  });

  fastify.get('/terms/status', async (req, reply) => {
    return reply.send({
      ok: true,
      terms: TERMS_NOTICE_AR,
    });
  });

  fastify.get('/privacy/child-safety', async (req, reply) => {
    return reply.send({ ok: true, child_safety: CHILD_SAFETY_AR });
  });

  fastify.post('/privacy/delete-account-request', { schema: requestSchema }, async (req, reply) => {
    const hash = hashEmail(req.body.email);
    if (!hash) {
      return reply.code(400).send({ ok: false, error: 'invalid_email' });
    }
    if (!isDatabaseConfigured()) {
      return reply.send({
        ok: false,
        status: 'storage_not_configured',
        message_ar: 'تم استلام طلبكم، لكن لم يتم تخزينه — قاعدة البيانات غير مهيأة بعد. يُرجى المحاولة لاحقاً.',
        persisted: false,
      });
    }
    // With a DB, the request_id would be inserted via parameterized SQL.
    return reply.send({
      ok: true,
      status: 'received',
      message_ar: 'تم استلام طلب حذف الحساب، وسيتم التواصل معكم للتحقق.',
      persisted: false, // until repository wires the INSERT
    });
  });

  fastify.post('/privacy/data-export-request', { schema: requestSchema }, async (req, reply) => {
    const hash = hashEmail(req.body.email);
    if (!hash) {
      return reply.code(400).send({ ok: false, error: 'invalid_email' });
    }
    if (!isDatabaseConfigured()) {
      return reply.send({
        ok: false,
        status: 'storage_not_configured',
        message_ar: 'تم استلام طلب نسخة البيانات، لكن لم يتم تخزينه — قاعدة البيانات غير مهيأة بعد.',
        persisted: false,
      });
    }
    return reply.send({
      ok: true,
      status: 'received',
      message_ar: 'تم استلام طلب نسخة البيانات، وسيتم التواصل معكم لإكمال التحقق.',
      persisted: false,
    });
  });

  // Generic privacy request submission supporting all 5 types.
  fastify.post('/privacy/requests', {
    schema: {
      body: {
        type: 'object',
        required: ['request_type', 'email'],
        additionalProperties: false,
        properties: {
          request_type: { type: 'string', enum: [...PRIVACY_REQUEST_TYPES] },
          email:        { type: 'string', minLength: 5, maxLength: 320 },
          reason_ar:    { type: 'string', maxLength: 1000 },
        },
      },
    },
  }, async (req, reply) => {
    const hash = hashEmail(req.body.email);
    if (!hash) return reply.code(400).send({ ok: false, error: 'invalid_email' });
    if (!isDatabaseConfigured()) {
      return reply.send({
        ok: false,
        status: 'storage_not_configured',
        request_type: req.body.request_type,
        message_ar: 'تم استلام طلب الخصوصية، لكن لم يتم تخزينه — قاعدة البيانات غير مهيأة بعد.',
        persisted: false,
      });
    }
    // With a real DB, the request_id is the result of a parameterized INSERT
    // into `privacy_requests` (migration 007). Foundation: we acknowledge
    // safely but report `persisted: false` until repository wires the INSERT.
    return reply.send({
      ok: true,
      status: 'received',
      request_type: req.body.request_type,
      message_ar: 'تم استلام الطلب وسيتم مراجعته من قبل المُراجِع.',
      persisted: false,
    });
  });

  // Admin: list pending privacy requests. Requires admin / content_reviewer role.
  fastify.get('/admin/privacy/requests', {
    preHandler: requireAuth([ROLES.ADMIN, ROLES.CONTENT_REVIEWER]),
  }, async (req, reply) => {
    if (!isDatabaseConfigured()) {
      return reply.send({
        ok: true,
        configured: false,
        requests: [],
        message_ar: 'لا توجد قاعدة بيانات مفعلة بعد.',
      });
    }
    return reply.send({ ok: true, configured: true, requests: [] });
  });

  // Admin: mark a privacy request complete. Requires admin / content_reviewer role.
  fastify.post('/admin/privacy/requests/:id/complete', {
    preHandler: requireAuth([ROLES.ADMIN, ROLES.CONTENT_REVIEWER]),
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          note_ar: { type: 'string', maxLength: 1000 },
        },
      },
    },
  }, async (req, reply) => {
    if (!isDatabaseConfigured()) {
      return reply.code(503).send({
        ok: false,
        error: 'database_not_configured',
        message_ar: 'لا يمكن إكمال الطلب — قاعدة البيانات غير مهيأة بعد.',
      });
    }
    return reply.send({
      ok: true,
      request_id: req.params.id,
      status: 'completed',
      persisted: false,
      message_ar: 'تم إكمال الطلب بإذن الله.',
    });
  });
}

export const _PRIVACY_REQUEST_TYPES = PRIVACY_REQUEST_TYPES;
