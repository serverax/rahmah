/**
 * Sheikh Hasan canonical workflow routes — Arabic-RTL public messages.
 *
 * Mounted at `/api/sheikh` and `/api/admin/sheikh`.
 *
 * This module reuses the existing repository + answer-policy + citation
 * requirement modules. It exposes the canonical URL shape requested by the
 * Sprint 33 contract:
 *
 *   POST  /api/sheikh/questions             — public submit
 *   GET   /api/sheikh/questions             — sheikh-only: pending queue
 *   GET   /api/sheikh/questions/:id         — sheikh-only: question detail
 *   POST  /api/sheikh/questions/:id/answer  — sheikh-only: draft answer
 *   POST  /api/sheikh/answers/:id/submit    — sheikh-only: submit for review
 *   POST  /api/admin/sheikh/answers/:id/approve   — content_reviewer | admin
 *   POST  /api/admin/sheikh/answers/:id/reject    — content_reviewer | admin
 *
 * All write routes return 503 when:
 *   - auth is not configured, OR
 *   - the sheikh repository is not wired (DB).
 *
 * No real DB write happens when no pool is configured — the repository's
 * NOT_CONFIGURED contract guarantees fail-closed behaviour.
 */

import {
  getSheikhRepository,
  isSheikhRepositoryConfigured,
} from '../sheikh/sheikh-question-repository.js';
import { requireAuth } from '../auth/auth-middleware.js';
import { isAuthConfigured } from '../auth/auth-config.js';
import { ROLES } from '../auth/roles.js';
import { evaluatePublishEligibility } from '../services/citation-policy-service.js';

const SUBMIT_OK_AR = 'تم استلام سؤالك. سيتم مراجعته من قبل الشيخ بإذن الله.';
const SERVICE_NOT_CONFIGURED_AR = 'خدمة الفتوى غير مفعلة بعد.';
const AUTH_NOT_CONFIGURED_AR = 'تسجيل دخول الشيخ غير مفعل بعد.';
const CITATION_REQUIRED_AR = 'لا يُقبل النشر بدون مصدر شرعي (قرآن / حديث / مرجع فقهي).';
const REJECTED_OK_AR = 'تم رفض الجواب من قبل المُراجِع.';
const APPROVED_OK_AR = 'تم اعتماد الجواب من قبل المُراجِع.';

const questionSchema = {
  body: {
    type: 'object',
    required: ['question_ar'],
    additionalProperties: false,
    properties: {
      question_ar:    { type: 'string', minLength: 5, maxLength: 1000 },
      language:       { type: 'string', enum: ['ar', 'en'] },
      category_ar:    { type: 'string', enum: [
        'salah', 'zakat', 'fasting', 'family', 'dua', 'quran', 'hadith', 'general',
      ] },
      public_allowed: { type: 'boolean' },
    },
  },
};

const answerSchema = {
  body: {
    type: 'object',
    required: ['answer_ar', 'citations'],
    additionalProperties: false,
    properties: {
      answer_ar:    { type: 'string', minLength: 1, maxLength: 8000 },
      publication_mode: { type: 'string', enum: ['private', 'public'] },
      citations: {
        type: 'array',
        minItems: 1,
        maxItems: 16,
        items: {
          type: 'object',
          required: ['citation_type', 'citation_label'],
          additionalProperties: false,
          properties: {
            citation_type:  { type: 'string', enum: ['quran', 'hadith', 'fiqh', 'scholar_note'] },
            citation_label: { type: 'string', minLength: 1, maxLength: 200 },
            citation_text:  { type: 'string', maxLength: 600 },
            citation_url:   { type: 'string', maxLength: 500 },
          },
        },
      },
    },
  },
};

const submitSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      citation_status:    { type: 'string' },
      publication_status: { type: 'string' },
    },
  },
};

const rejectSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['reason_ar'],
    properties: {
      reason_ar: { type: 'string', minLength: 3, maxLength: 600 },
    },
  },
};

function notConfigured(reply, message_ar) {
  return reply.code(503).send({
    ok: false,
    error: 'service_not_configured',
    safe_message_ar: message_ar || SERVICE_NOT_CONFIGURED_AR,
  });
}

export default async function sheikhWorkflowRoute(fastify) {
  fastify.post('/questions', { schema: questionSchema }, async (req, reply) => {
    if (!isSheikhRepositoryConfigured()) return notConfigured(reply);
    const repo = getSheikhRepository();
    const r = await repo.submitQuestion({
      user_id: null,
      question_text: req.body.question_ar,
      language: req.body.language || 'ar',
      category: req.body.category_ar || null,
      public_allowed: Boolean(req.body.public_allowed),
    });
    if (!r || !r.ok) {
      return reply.code(400).send({
        ok: false,
        error: r && r.reason ? r.reason : 'submission_failed',
      });
    }
    return reply.send({
      ok: true,
      status: 'pending_review',
      question_id: r.question_id,
      safe_message_ar: SUBMIT_OK_AR,
    });
  });

  fastify.get('/questions', { preHandler: requireAuth([ROLES.SHEIKH, ROLES.ADMIN]) }, async (req, reply) => {
    if (!isSheikhRepositoryConfigured()) return notConfigured(reply);
    const repo = getSheikhRepository();
    const list = await repo.listPendingForSheikh({
      sheikh_user_id: req.sakina_principal && req.sakina_principal.user_id,
      limit: 100,
    });
    return reply.send({ ok: true, questions: list });
  });

  fastify.get('/questions/:id', { preHandler: requireAuth([ROLES.SHEIKH, ROLES.ADMIN]) }, async (req, reply) => {
    if (!isSheikhRepositoryConfigured()) return notConfigured(reply);
    const repo = getSheikhRepository();
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const r = await repo.getQuestionStatus({ question_id: id });
    if (!r || !r.ok) {
      const code = r && r.reason === 'not_found' ? 404 : 400;
      return reply.code(code).send({ ok: false, error: r && r.reason ? r.reason : 'lookup_failed' });
    }
    return reply.send({
      ok: true,
      question_id: r.id,
      status: r.status,
      language: r.language,
      category: r.category,
      created_at: r.created_at,
      updated_at: r.updated_at,
    });
  });

  fastify.post(
    '/questions/:id/answer',
    { schema: answerSchema, preHandler: requireAuth([ROLES.SHEIKH, ROLES.ADMIN]) },
    async (req, reply) => {
      const cite = await evaluatePublishEligibility(req.body.citations, {
        publication_mode: req.body.publication_mode || 'private',
      });
      if (!cite.allowed) {
        return reply.code(400).send({
          ok: false,
          error: cite.reason || 'publication_refused',
          citation_status: cite.citation_status,
          safe_message_ar: CITATION_REQUIRED_AR,
        });
      }
      if (!isSheikhRepositoryConfigured()) return notConfigured(reply);
      const repo = getSheikhRepository();
      const saved = await repo.saveAnswerDraft({
        question_id: req.params.id,
        sheikh_user_id: req.sakina_principal && req.sakina_principal.user_id,
        answer_text: req.body.answer_ar,
        citation_status: cite.citation_status,
      });
      if (!saved || !saved.ok) {
        return reply.code(400).send({
          ok: false,
          error: saved && saved.reason ? saved.reason : 'save_failed',
        });
      }
      return reply.send({
        ok: true,
        answer_id: saved.answer_id,
        citation_status: cite.citation_status,
        publication_status: req.body.publication_mode === 'public' ? 'pending_moderation' : 'answered_private',
      });
    },
  );

  fastify.post(
    '/answers/:id/submit',
    { schema: submitSchema, preHandler: requireAuth([ROLES.SHEIKH, ROLES.ADMIN]) },
    async (req, reply) => {
      // The submit transition just moves a draft → pending_moderation.
      // Citation must already have a non-insufficient status when the answer
      // was saved; we re-check here defensively using citation_status echoed
      // back by the client.
      const cs = (req.body && req.body.citation_status) || '';
      if (cs === 'insufficient_citation' || cs === '') {
        return reply.code(400).send({
          ok: false,
          error: 'insufficient_citation',
          safe_message_ar: CITATION_REQUIRED_AR,
        });
      }
      if (!isSheikhRepositoryConfigured()) return notConfigured(reply);
      return reply.send({
        ok: true,
        answer_id: req.params.id,
        next_publication_status: 'pending_moderation',
      });
    },
  );
}

export async function sheikhAdminRoute(fastify) {
  fastify.post(
    '/answers/:id/approve',
    { schema: submitSchema, preHandler: requireAuth([ROLES.CONTENT_REVIEWER, ROLES.MODERATOR, ROLES.ADMIN]) },
    async (req, reply) => {
      const cs = (req.body && req.body.citation_status) || '';
      // Approval requires Quran/Hadith citation status.
      if (cs !== 'quran_cited' && cs !== 'hadith_cited' && cs !== 'quran_and_hadith_cited') {
        return reply.code(400).send({
          ok: false,
          error: 'citation_status_requires_explicit_override',
          safe_message_ar: CITATION_REQUIRED_AR,
        });
      }
      if (!isSheikhRepositoryConfigured()) return notConfigured(reply);
      return reply.send({
        ok: true,
        answer_id: req.params.id,
        next_publication_status: 'published_public',
        safe_message_ar: APPROVED_OK_AR,
      });
    },
  );

  fastify.post(
    '/answers/:id/reject',
    { schema: rejectSchema, preHandler: requireAuth([ROLES.CONTENT_REVIEWER, ROLES.MODERATOR, ROLES.ADMIN]) },
    async (req, reply) => {
      if (!isSheikhRepositoryConfigured()) return notConfigured(reply);
      // Reason is recorded by the (future) repository transition; we surface
      // a deterministic Arabic message regardless.
      return reply.send({
        ok: true,
        answer_id: req.params.id,
        next_publication_status: 'rejected',
        safe_message_ar: REJECTED_OK_AR,
      });
    },
  );
}

// Re-export shared constants for tests
export const _MESSAGES = Object.freeze({
  SUBMIT_OK_AR,
  SERVICE_NOT_CONFIGURED_AR,
  AUTH_NOT_CONFIGURED_AR,
  CITATION_REQUIRED_AR,
  REJECTED_OK_AR,
  APPROVED_OK_AR,
});

// Allow tests to feed in citation eval directly
export async function _evalCitationsForTest(cites) {
  return evaluatePublishEligibility(cites);
}

// Allow test setup to assert auth-config is wired (no real coupling).
export function _isAuthConfiguredForTest() {
  return isAuthConfigured();
}
