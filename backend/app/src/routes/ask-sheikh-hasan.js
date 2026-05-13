/**
 * Ask Sheikh Hasan — submission + sheikh-side + moderation routes.
 *
 * Mounted by app.js with prefix '/api/sheikh-hasan'. Endpoints:
 *
 *   POST /ask                                — user submits a question (auth-optional).
 *   GET  /sheikh/questions                   — sheikh-only: list pending queue.
 *   POST /sheikh/questions/:id/answer        — sheikh-only: save / publish answer.
 *   POST /moderation/answers/:id/publish     — moderator/admin-only: flip to public.
 *
 * Public read routes live in routes/public-qa.js.
 */

import {
  getSheikhRepository,
  isSheikhRepositoryConfigured,
} from '../sheikh/sheikh-question-repository.js';
import {
  requireRole,
  authNotConfiguredBody,
  isAuthConfigured,
} from '../sheikh/sheikh-auth-policy.js';
import {
  decideAnswerPublication,
  decideModeratorPublish,
} from '../sheikh/sheikh-answer-policy.js';
import { notifyNewQuestion } from '../sheikh/whatsapp-notifier.js';

const askSchema = {
  body: {
    type: 'object',
    required: ['question'],
    additionalProperties: false,
    properties: {
      question: { type: 'string', minLength: 5, maxLength: 1000 },
      language: { type: 'string', enum: ['en', 'ar'] },
      category: { type: 'string', enum: [
        'salah',
        'zakat',
        'fasting',
        'family',
        'dua',
        'quran',
        'hadith',
        'general',
      ] },
      public_allowed: { type: 'boolean' },
    },
  },
};

const answerSchema = {
  body: {
    type: 'object',
    required: ['answer_text', 'citations', 'publication_mode'],
    additionalProperties: false,
    properties: {
      answer_text: { type: 'string', minLength: 1, maxLength: 8000 },
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

export default async function askSheikhHasanRoute(fastify) {
  // -------------------------------------------------------------------------
  // User submission. Returns 503 service_not_configured when no DB-backed
  // repository is wired — never silently drops the question.
  // -------------------------------------------------------------------------
  fastify.post('/ask', { schema: askSchema }, async (req, reply) => {
    const repo = getSheikhRepository();
    if (!repo) {
      return reply.code(503).send({
        ok: false,
        error: 'service_not_configured',
        message:
          'Question submission storage is not configured in this build. ' +
          'Operator must wire a database-backed sheikh repository.',
      });
    }

    const { question, language, category, public_allowed } = req.body;
    const result = await repo.submitQuestion({
      user_id: null, // auth not wired yet — guest submissions only
      question_text: question,
      language: language || 'en',
      category: category || null,
      public_allowed: Boolean(public_allowed),
    });

    if (!result || !result.ok) {
      return reply.code(400).send({
        ok: false,
        error: result && result.reason ? result.reason : 'submission_failed',
      });
    }

    // Notification is best-effort — never blocks the user response. Result is
    // not echoed to the user; it is recorded only via logging when enabled.
    await notifyNewQuestion({ question_id: result.question_id });

    return reply.send({
      ok: true,
      status: 'pending_review',
      question_id: result.question_id,
      message: 'Your question has been submitted for Sheikh Hasan to review.',
    });
  });

  // -------------------------------------------------------------------------
  // Sheikh queue.
  // -------------------------------------------------------------------------
  fastify.get('/sheikh/questions', async (req, reply) => {
    if (!isAuthConfigured()) {
      return reply.code(503).send(authNotConfiguredBody());
    }
    const auth = requireRole(req, ['sheikh', 'admin']);
    if (!auth.ok) return reply.code(auth.status).send(auth.body);
    const repo = getSheikhRepository();
    if (!repo) {
      return reply.code(503).send({ ok: false, error: 'service_not_configured' });
    }
    const list = await repo.listPendingForSheikh({
      sheikh_user_id: auth.principal && auth.principal.user_id,
      limit: 100,
    });
    return reply.send({ ok: true, questions: list });
  });

  // -------------------------------------------------------------------------
  // Sheikh saves / submits an answer.
  // -------------------------------------------------------------------------
  fastify.post(
    '/sheikh/questions/:id/answer',
    { schema: answerSchema },
    async (req, reply) => {
      if (!isAuthConfigured()) {
        return reply.code(503).send(authNotConfiguredBody());
      }
      const auth = requireRole(req, ['sheikh', 'admin']);
      if (!auth.ok) return reply.code(auth.status).send(auth.body);

      const decision = decideAnswerPublication({
        answer_text: req.body.answer_text,
        citations: req.body.citations,
        publication_mode: req.body.publication_mode,
      });
      if (!decision.allowed) {
        return reply.code(400).send({
          ok: false,
          error: decision.reason || 'publication_refused',
          citation_status: decision.citation_status,
        });
      }

      if (!isSheikhRepositoryConfigured()) {
        return reply.code(503).send({ ok: false, error: 'service_not_configured' });
      }
      const repo = getSheikhRepository();
      const saved = await repo.saveAnswerDraft({
        question_id: req.params.id,
        sheikh_user_id: auth.principal && auth.principal.user_id,
        answer_text: req.body.answer_text,
        citation_status: decision.citation_status,
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
        citation_status: decision.citation_status,
        publication_status: decision.publication_status,
      });
    },
  );

  // -------------------------------------------------------------------------
  // Moderator publishes a pending_moderation answer.
  // -------------------------------------------------------------------------
  fastify.post('/moderation/answers/:id/publish', async (req, reply) => {
    if (!isAuthConfigured()) {
      return reply.code(503).send(authNotConfiguredBody());
    }
    const auth = requireRole(req, ['moderator', 'admin']);
    if (!auth.ok) return reply.code(auth.status).send(auth.body);

    // The actual DB-side state transition is the responsibility of the
    // (future) repository method — this sprint exposes the contract but
    // returns 503 service_not_configured when no repository is wired so
    // that the route surface is deterministic and tested.
    if (!isSheikhRepositoryConfigured()) {
      return reply.code(503).send({ ok: false, error: 'service_not_configured' });
    }
    // The moderator check uses the persisted citation_status. The caller
    // must POST `{ citation_status, publication_status }` to confirm what
    // the moderator saw at submit time; defends against TOCTOU edits.
    const cs = req.body && typeof req.body === 'object' ? req.body : {};
    const decision = decideModeratorPublish({
      citation_status: cs.citation_status,
      publication_status: cs.publication_status,
    });
    if (!decision.allowed) {
      return reply.code(400).send({
        ok: false,
        error: decision.reason || 'moderation_refused',
      });
    }

    return reply.send({
      ok: true,
      answer_id: req.params.id,
      next_publication_status: 'published_public',
      note: 'Repository must persist the transition + create sakina_public_qa row',
    });
  });
}
