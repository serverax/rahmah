/**
 * Public cited Q&A routes — read-only listing + detail + report submission.
 *
 * Mounted by app.js with prefix '/api/public/sheikh-hasan'. Endpoints:
 *
 *   GET  /qa                — list live public Q&A.
 *   GET  /qa/:slug          — detail with citations.
 *   POST /qa/:slug/report   — submit a content report.
 *
 * No user identity is ever returned by these endpoints. The projection
 * helper in sheikh-answer-policy.js enforces the allowed fields.
 */

import {
  getSheikhRepository,
  isSheikhRepositoryConfigured,
} from '../sheikh/sheikh-question-repository.js';
import { publicAnswerProjection } from '../sheikh/sheikh-answer-policy.js';
import {
  getPublicQAList,
  setPublicQAList,
  getPublicQADetail,
  setPublicQADetail,
} from '../cache/index.js';

const reportSchema = {
  body: {
    type: 'object',
    required: ['reason'],
    additionalProperties: false,
    properties: {
      reason: { type: 'string', minLength: 1, maxLength: 1000 },
    },
  },
};

export default async function publicQARoute(fastify) {
  // -------------------------------------------------------------------------
  // List live public Q&A. Empty list when no repository — never throws.
  // -------------------------------------------------------------------------
  fastify.get('/qa', async (req, reply) => {
    const repo = getSheikhRepository();
    if (!repo) {
      return reply.send({ ok: true, items: [], configured: false });
    }
    const q = req.query || {};
    const language = typeof q.language === 'string' ? q.language : null;
    const category = typeof q.category === 'string' ? q.category : null;

    const cached = await getPublicQAList({ language, category });
    if (Array.isArray(cached)) {
      return reply.send({ ok: true, configured: true, cached: true, items: cached });
    }

    const list = await repo.listPublicQA({ category, language, limit: 50 });
    const items = Array.isArray(list) ? list : [];
    // Cache only when every entry is a valid public-list projection.
    // setPublicQAList itself enforces this via cache-policy.
    if (items.length > 0) {
      await setPublicQAList({ language, category, items });
    }
    return reply.send({ ok: true, configured: true, cached: false, items });
  });

  // -------------------------------------------------------------------------
  // Detail. Returns 404 if missing — does NOT leak existence of private
  // sheikh answers or pending entries. Citations are projected through the
  // policy module so no internal columns leak.
  // -------------------------------------------------------------------------
  fastify.get('/qa/:slug', async (req, reply) => {
    const repo = getSheikhRepository();
    if (!repo) {
      return reply.code(503).send({ ok: false, error: 'service_not_configured' });
    }
    const slug = typeof req.params.slug === 'string' ? req.params.slug : '';

    const cached = await getPublicQADetail(slug);
    if (cached && typeof cached === 'object') {
      return reply.send({ ok: true, cached: true, qa: cached });
    }

    const raw = await repo.getPublicQABySlug({ slug });
    if (!raw) {
      return reply.code(404).send({ ok: false, error: 'not_found' });
    }
    const projected = publicAnswerProjection(raw);

    // Cache only if projection has citations. Citation-empty rows pass through
    // but the route refuses to call them valid — the response is still 200 but
    // the safety rule is enforced by setPublicQADetail at the cache layer.
    if (
      projected &&
      Array.isArray(projected.citations) &&
      projected.citations.length > 0
    ) {
      await setPublicQADetail(slug, projected);
    }

    return reply.send({ ok: true, cached: false, qa: projected });
  });

  // -------------------------------------------------------------------------
  // Report submission. Validates length / shape; persists when configured.
  // -------------------------------------------------------------------------
  fastify.post('/qa/:slug/report', { schema: reportSchema }, async (req, reply) => {
    const reason = req.body && req.body.reason ? String(req.body.reason) : '';
    if (reason.trim().length === 0) {
      return reply.code(400).send({ ok: false, error: 'invalid_reason' });
    }
    if (!isSheikhRepositoryConfigured()) {
      return reply.code(503).send({ ok: false, error: 'service_not_configured' });
    }
    const repo = getSheikhRepository();
    // We persist the report against the slug; the moderator dashboard
    // resolves slug → target_id on read. The schema allows storing the slug
    // string itself as target_id alternative when a UUID is not available;
    // however the table requires a UUID, so we depend on the route caller
    // supplying a real UUID via the future repository helper. For this
    // sprint, the route validates input and returns the would-be insert
    // shape — the repository will translate slug → UUID in a follow-up.
    const result = await repo.recordReport({
      target_type: 'public_qa',
      target_id: typeof req.params.slug === 'string' ? req.params.slug : '',
      reason: reason.trim(),
    });
    if (!result || !result.ok) {
      return reply.code(400).send({
        ok: false,
        error: result && result.reason ? result.reason : 'report_failed',
      });
    }
    return reply.send({
      ok: true,
      report_id: result.report_id,
      status: result.status,
    });
  });
}
