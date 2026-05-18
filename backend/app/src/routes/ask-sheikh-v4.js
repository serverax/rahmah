/**
 * Ask Sheikh Hasan V4 — Full Workflow Routes.
 *
 * Implements:
 *   - /api/ask-sheikh/questions (Public submission)
 *   - /api/ask-sheikh/public (Public answers)
 *   - /api/sheikh/dashboard/* (Sheikh dashboard)
 *   - /api/admin/ask-sheikh/* (Admin review)
 */

import {
  getSheikhRepository,
} from '../sheikh/sheikh-question-repository.js';
import { requireAuth } from '../auth/auth-middleware.js';
import { ROLES } from '../auth/roles.js';
import { createNotificationService } from '../services/notification-service.js';

const notify = createNotificationService();

const askSchema = {
  body: {
    type: 'object',
    required: ['language', 'display_language_preference'],
    properties: {
      language: { type: 'string', enum: ['ar', 'en'] },
      question_text_ar: { type: 'string', minLength: 5, maxLength: 2000 },
      question_text_en: { type: 'string', minLength: 5, maxLength: 2000 },
      category_id: { type: 'string', format: 'uuid' },
      display_language_preference: { type: 'string', enum: ['ar', 'en', 'both'] },
      is_anonymous: { type: 'boolean', default: true },
    },
  },
};

const answerSchema = {
  body: {
    type: 'object',
    required: ['question_id', 'original_answer_language', 'citations'],
    properties: {
      question_id: { type: 'string', format: 'uuid' },
      answer_text_ar: { type: 'string', minLength: 1 },
      answer_text_en: { type: 'string', minLength: 1 },
      original_answer_language: { type: 'string', enum: ['ar', 'en'] },
      citations: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['source_type'],
          properties: {
            source_type: { type: 'string', enum: ['quran', 'hadith', 'scholarly', 'fatwa_reference', 'other'] },
            source_title_ar: { type: 'string' },
            source_title_en: { type: 'string' },
            reference_ar: { type: 'string' },
            reference_en: { type: 'string' },
            quote_ar: { type: 'string' },
            quote_en: { type: 'string' },
            url: { type: 'string' },
          },
        },
      },
    },
  },
};

export default async function askSheikhV4Route(fastify) {
  // 1. PUBLIC: Submit Question
  fastify.post('/questions', { schema: askSchema }, async (req, reply) => {
    const repo = getSheikhRepository();
    if (!repo) return reply.code(503).send({ ok: false, error: 'service_not_configured' });

    const result = await repo.submitQuestion({
      user_id: req.sakina_principal?.user_id,
      ...req.body,
      ip_hash: null, // would be real hash in prod
      ua_hash: null,
    });

    if (!result.ok) return reply.code(400).send(result);
    return reply.send(result);
  });

  // 2. PUBLIC: List Published Q&A
  fastify.get('/public', async (req, reply) => {
    const repo = getSheikhRepository();
    if (!repo) return reply.code(503).send({ ok: false, error: 'service_not_configured' });

    const { language = 'ar', category } = req.query;
    const items = await repo.listPublicQA({ category_slug: category, language });
    return reply.send({
      ok: true,
      items,
      arabic_available: items.some(i => i.arabic_available),
      english_available: items.some(i => i.english_available),
    });
  });

  // 3. SHEIKH: Dashboard Questions
  fastify.get('/dashboard/questions', { preHandler: requireAuth([ROLES.SHEIKH, ROLES.ADMIN]) }, async (req, reply) => {
    const repo = getSheikhRepository();
    const questions = await repo.listPendingForSheikh();
    return reply.send({ ok: true, questions });
  });

  // 4. SHEIKH: Submit Answer
  fastify.post('/dashboard/answers', { schema: answerSchema, preHandler: requireAuth([ROLES.SHEIKH, ROLES.ADMIN]) }, async (req, reply) => {
    const repo = getSheikhRepository();
    const result = await repo.saveAnswerDraft({
      ...req.body,
      sheikh_user_id: req.sakina_principal.user_id,
    });
    if (!result.ok) return reply.code(400).send(result);
    return reply.send(result);
  });

  // 5. ADMIN: List Pending
  fastify.get('/admin/pending-answers', { preHandler: requireAuth([ROLES.ADMIN]) }, async (req, reply) => {
    const repo = getSheikhRepository();
    const items = await repo.listPendingApprovals();
    return reply.send({ ok: true, items });
  });

  // 6. ADMIN: Approve
  fastify.post('/admin/answers/:id/approve', { preHandler: requireAuth([ROLES.ADMIN]) }, async (req, reply) => {
    const repo = getSheikhRepository();
    const result = await repo.approveAnswer(req.params.id, req.sakina_principal.user_id);
    if (!result.ok) return reply.code(400).send(result);

    // Trigger notification
    if (result.user_id) {
      await notify.createNotification({
        user_id: result.user_id,
        title_ar: 'تمت الإجابة على سؤالك',
        title_en: 'Your question has been answered',
        body_ar: 'لقد قام الشيخ بالإجابة على سؤالك. يمكنك الاطلاع عليها الآن.',
        body_en: 'The Sheikh has answered your question. You can view it now.',
        level: 'info'
      });
    }

    return reply.send(result);
  });

  // 7. ADMIN: Reject
  fastify.post('/admin/answers/:id/reject', { preHandler: requireAuth([ROLES.ADMIN]) }, async (req, reply) => {
    const repo = getSheikhRepository();
    const result = await repo.rejectAnswer(req.params.id, req.sakina_principal.user_id, req.body.reason);
    if (!result.ok) return reply.code(400).send(result);
    return reply.send(result);
  });
}
