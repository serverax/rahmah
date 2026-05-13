/**
 * Sheikh Hasan question / answer repository.
 *
 * Mirrors the pattern used by sources/source-repository.js:
 *   - With no pg pool injected, this repository is a SAFE NO-OP. Every method
 *     returns a structured `{ ok: false, reason: 'service_not_configured' }`
 *     for writes, and `[]` / null for reads. The route layer translates these
 *     into HTTP 503 / empty list responses.
 *   - With a pool injected, all SQL is parameterized — values are bound via
 *     $1, $2, …, never string-concatenated.
 *
 * No external HTTP. No LLM. No raw user identity is exposed via any read
 * method on the public path — those are projected by sheikh-answer-policy.js.
 *
 * The repository is INTENTIONALLY tested without a real pool — the no-pool
 * shape is the safety contract. Tests for the SQL paths live in a future
 * sprint with a real Postgres connection.
 */

import { createHash } from 'node:crypto';

const NOT_CONFIGURED = Object.freeze({ ok: false, reason: 'service_not_configured' });

function hashQuestionText(text) {
  const t = typeof text === 'string' ? text.trim() : '';
  if (t.length === 0) return null;
  return createHash('sha256').update(t).digest('hex');
}

function slugifyTitle(title) {
  const t = typeof title === 'string' ? title.trim().toLowerCase() : '';
  if (t.length === 0) return null;
  // Conservative slug: ASCII alphanumerics + dashes; collapses other runs.
  // Arabic content keeps its slug short by using a hash suffix appended by
  // the route — this function deliberately does not transliterate.
  const ascii = t
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining marks
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii.length > 0 ? ascii.slice(0, 80) : null;
}

export function createSheikhQuestionRepository({ pool } = {}) {
  const hasPool = Boolean(pool);

  async function submitQuestion({
    user_id = null,
    question_text,
    language = 'en',
    category = null,
    public_allowed = false,
  } = {}) {
    if (typeof question_text !== 'string' || question_text.trim().length === 0) {
      return { ok: false, reason: 'empty_question' };
    }
    if (question_text.length > 1000) {
      return { ok: false, reason: 'question_too_long' };
    }
    if (!hasPool) return NOT_CONFIGURED;

    const hash = hashQuestionText(question_text);
    if (!hash) return { ok: false, reason: 'empty_question' };

    const sql = `
      INSERT INTO sakina_user_questions
        (user_id, question_text, question_hash, language, category,
         private_question, public_allowed, status)
      VALUES ($1, $2, $3, $4, $5, TRUE, $6, 'pending_review')
      RETURNING id, status, created_at
    `;
    try {
      const res = await pool.query(sql, [
        user_id,
        question_text.trim(),
        hash,
        String(language).slice(0, 8),
        category,
        Boolean(public_allowed),
      ]);
      const row = res.rows && res.rows[0];
      if (!row) return { ok: false, reason: 'insert_failed' };
      return {
        ok: true,
        question_id: row.id,
        status: row.status,
        created_at: row.created_at,
      };
    } catch {
      return { ok: false, reason: 'insert_failed' };
    }
  }

  async function listPendingForSheikh({ sheikh_user_id = null, limit = 50 } = {}) {
    if (!hasPool) return [];
    const n = Number.isInteger(limit) && limit > 0 && limit <= 200 ? limit : 50;
    // Either assigned to this sheikh OR globally pending and unassigned.
    const sql = `
      SELECT id, language, category, status, created_at
      FROM sakina_user_questions
      WHERE status IN ('pending_review', 'assigned_to_sheikh', 'draft_answered')
        AND (assigned_sheikh_id = $1 OR (assigned_sheikh_id IS NULL AND status = 'pending_review'))
      ORDER BY created_at ASC
      LIMIT $2
    `;
    try {
      const res = await pool.query(sql, [sheikh_user_id, n]);
      return res.rows || [];
    } catch {
      return [];
    }
  }

  async function getQuestionStatus({ question_id }) {
    if (!hasPool) return NOT_CONFIGURED;
    if (typeof question_id !== 'string' || question_id.length === 0) {
      return { ok: false, reason: 'invalid_question_id' };
    }
    const sql = `
      SELECT id, status, language, category, created_at, updated_at
      FROM sakina_user_questions
      WHERE id = $1
    `;
    try {
      const res = await pool.query(sql, [question_id]);
      const row = res.rows && res.rows[0];
      if (!row) return { ok: false, reason: 'not_found' };
      return { ok: true, ...row };
    } catch {
      return { ok: false, reason: 'lookup_failed' };
    }
  }

  async function saveAnswerDraft({
    question_id,
    sheikh_user_id,
    answer_text,
    citation_status,
  } = {}) {
    if (!hasPool) return NOT_CONFIGURED;
    if (typeof question_id !== 'string' || typeof sheikh_user_id !== 'string') {
      return { ok: false, reason: 'invalid_ids' };
    }
    if (typeof answer_text !== 'string' || answer_text.trim().length === 0) {
      return { ok: false, reason: 'empty_answer' };
    }
    const sql = `
      INSERT INTO sakina_sheikh_answers
        (question_id, sheikh_user_id, answer_text, citation_status, publication_status)
      VALUES ($1, $2, $3, $4, 'draft')
      RETURNING id, publication_status, created_at
    `;
    try {
      const res = await pool.query(sql, [
        question_id,
        sheikh_user_id,
        answer_text.trim(),
        citation_status,
      ]);
      const row = res.rows && res.rows[0];
      if (!row) return { ok: false, reason: 'insert_failed' };
      return { ok: true, answer_id: row.id, publication_status: row.publication_status };
    } catch {
      return { ok: false, reason: 'insert_failed' };
    }
  }

  async function listPublicQA({ category = null, language = null, limit = 50 } = {}) {
    if (!hasPool) return [];
    const n = Number.isInteger(limit) && limit > 0 && limit <= 200 ? limit : 50;
    // Public read: never join sakina_users; only the public slug/title/etc.
    const sql = `
      SELECT slug, title, language, category, published_at
      FROM sakina_public_qa
      WHERE is_live = TRUE
        AND ($1::text IS NULL OR category = $1)
        AND ($2::text IS NULL OR language = $2)
      ORDER BY published_at DESC NULLS LAST
      LIMIT $3
    `;
    try {
      const res = await pool.query(sql, [category, language, n]);
      return res.rows || [];
    } catch {
      return [];
    }
  }

  async function getPublicQABySlug({ slug } = {}) {
    if (!hasPool) return null;
    if (typeof slug !== 'string' || slug.length === 0) return null;
    // Public read: never join sakina_users. Citations joined on answer_id.
    // Sheikh name comes from the public profile (joined separately to avoid
    // exposing email_hash). Verification_status is surfaced per citation.
    const sql = `
      SELECT
        pq.slug,
        pq.title,
        pq.language,
        pq.category,
        pq.published_at,
        a.answer_text,
        COALESCE(sp.public_name, 'Sheikh Hasan') AS sheikh_name
      FROM sakina_public_qa pq
      JOIN sakina_sheikh_answers a ON a.id = pq.answer_id
      LEFT JOIN sakina_sheikh_profiles sp ON sp.user_id = a.sheikh_user_id
      WHERE pq.slug = $1
        AND pq.is_live = TRUE
        AND a.publication_status = 'published_public'
    `;
    const citationSql = `
      SELECT
        citation_type,
        citation_label,
        citation_text,
        citation_url,
        verification_status
      FROM sakina_sheikh_answer_citations
      WHERE answer_id = (
        SELECT answer_id FROM sakina_public_qa WHERE slug = $1
      )
      AND verification_status <> 'rejected'
      ORDER BY created_at ASC
    `;
    try {
      const main = await pool.query(sql, [slug]);
      const row = main.rows && main.rows[0];
      if (!row) return null;
      const cites = await pool.query(citationSql, [slug]);
      return { ...row, citations: cites.rows || [] };
    } catch {
      return null;
    }
  }

  async function recordReport({ target_type, target_id, reason } = {}) {
    if (!hasPool) return NOT_CONFIGURED;
    if (
      target_type !== 'question' &&
      target_type !== 'answer' &&
      target_type !== 'public_qa'
    ) {
      return { ok: false, reason: 'invalid_target_type' };
    }
    if (typeof target_id !== 'string' || target_id.length === 0) {
      return { ok: false, reason: 'invalid_target_id' };
    }
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      return { ok: false, reason: 'invalid_reason' };
    }
    if (reason.length > 1000) {
      return { ok: false, reason: 'reason_too_long' };
    }
    const sql = `
      INSERT INTO sakina_content_reports
        (target_type, target_id, reason, status)
      VALUES ($1, $2, $3, 'open')
      RETURNING id, status, created_at
    `;
    try {
      const res = await pool.query(sql, [target_type, target_id, reason.trim()]);
      const row = res.rows && res.rows[0];
      if (!row) return { ok: false, reason: 'insert_failed' };
      return { ok: true, report_id: row.id, status: row.status };
    } catch {
      return { ok: false, reason: 'insert_failed' };
    }
  }

  return {
    submitQuestion,
    listPendingForSheikh,
    getQuestionStatus,
    saveAnswerDraft,
    listPublicQA,
    getPublicQABySlug,
    recordReport,
    // Exposed for tests / future composition.
    _slugifyTitle: slugifyTitle,
  };
}

/* -----------------------------------------------------------------------------
 * Module-level singleton wiring (mirrors source-store pattern).
 * --------------------------------------------------------------------------- */

let _repository = null;

export function configureSheikhRepository({ repository = null } = {}) {
  _repository = repository;
}

export function configureSheikhRepositoryWithPool({ pool } = {}) {
  _repository = pool ? createSheikhQuestionRepository({ pool }) : null;
}

export function getSheikhRepository() {
  return _repository;
}

export function isSheikhRepositoryConfigured() {
  return Boolean(_repository);
}

/** Test-only reset. */
export function _resetSheikhRepositoryForTests() {
  _repository = null;
}
