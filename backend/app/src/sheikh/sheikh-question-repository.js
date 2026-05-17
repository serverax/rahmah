/**
 * Sheikh Hasan question / answer repository — V4 Bilingual Workflow.
 *
 * Implements the full workflow logic for Ask Sheikh Hasan:
 *   - User submission (Arabic/English)
 *   - Sheikh dashboard (Pending/Assigned)
 *   - Answer drafting with citations
 *   - Admin review (Approve/Reject)
 *   - Public publishing
 */

import { createHash } from 'node:crypto';

const NOT_CONFIGURED = Object.freeze({ ok: false, reason: 'service_not_configured' });

function hashText(text) {
  const t = typeof text === 'string' ? text.trim() : '';
  if (t.length === 0) return null;
  return createHash('sha256').update(t).digest('hex');
}

export function createSheikhQuestionRepository({ pool } = {}) {
  const hasPool = Boolean(pool);

  // ---------------------------------------------------------------------------
  // PUBLIC / USER METHODS
  // ---------------------------------------------------------------------------

  async function listCategories() {
    if (!hasPool) return [];
    const sql = `
      SELECT id, slug, title_ar, title_en, description_ar, description_en
      FROM ask_sheikh_categories
      WHERE is_active = TRUE
      ORDER BY sort_order ASC
    `;
    try {
      const res = await pool.query(sql);
      return res.rows || [];
    } catch {
      return [];
    }
  }

  async function submitQuestion({
    user_id = null,
    question_text_ar = null,
    question_text_en = null,
    category_id = null,
    display_preference = 'ar',
    is_anonymous = true,
    ip_hash = null,
    ua_hash = null,
  } = {}) {
    if (!question_text_ar && !question_text_en) {
      return { ok: false, reason: 'empty_question' };
    }
    if (!hasPool) return NOT_CONFIGURED;

    const original_language = question_text_ar ? 'ar' : 'en';

    const sql = `
      INSERT INTO ask_sheikh_questions
        (user_id, category_id, question_text_ar, question_text_en,
         original_language, display_preference, is_anonymous,
         submitted_ip_hash, user_agent_hash, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted')
      RETURNING id, status, created_at
    `;
    try {
      const res = await pool.query(sql, [
        user_id,
        category_id,
        question_text_ar,
        question_text_en,
        original_language,
        display_preference,
        Boolean(is_anonymous),
        ip_hash,
        ua_hash,
      ]);
      const row = res.rows && res.rows[0];
      if (!row) return { ok: false, reason: 'insert_failed' };

      await _recordAuditEvent({
        actor_user_id: user_id,
        question_id: row.id,
        action: 'question_submitted',
        after_status: row.status,
      });

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

  async function listPublicQA({ category_slug = null, language = 'ar', limit = 50 } = {}) {
    if (!hasPool) return [];
    const n = Math.min(200, Math.max(1, Number(limit) || 50));
    
    // Joint query to get published questions and their approved answers
    const sql = `
      SELECT
        q.id as question_id,
        q.question_text_ar,
        q.question_text_en,
        a.answer_text_ar,
        a.answer_text_en,
        c.slug as category_slug,
        c.title_ar as category_title_ar,
        a.updated_at as published_at
      FROM ask_sheikh_questions q
      JOIN ask_sheikh_answers a ON a.question_id = q.id
      LEFT JOIN ask_sheikh_categories c ON q.category_id = c.id
      WHERE q.status = 'published'
        AND a.status = 'published'
        AND q.public_visible = TRUE
        AND ($1::text IS NULL OR c.slug = $1)
      ORDER BY a.updated_at DESC
      LIMIT $2
    `;
    try {
      const res = await pool.query(sql, [category_slug, n]);
      return res.rows.map(row => ({
        id: row.question_id,
        question: language === 'en' ? (row.question_text_en || row.question_text_ar) : (row.question_text_ar || row.question_text_en),
        answer: language === 'en' ? (row.answer_text_en || row.answer_text_ar) : (row.answer_text_ar || row.answer_text_en),
        category: language === 'en' ? row.category_slug : row.category_title_ar,
        published_at: row.published_at,
        arabic_available: !!row.answer_text_ar,
        english_available: !!row.answer_text_en,
      }));
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // SHEIKH DASHBOARD METHODS
  // ---------------------------------------------------------------------------

  async function listPendingForSheikh({ limit = 50 } = {}) {
    if (!hasPool) return [];
    const n = Math.min(200, Math.max(1, Number(limit) || 50));
    const sql = `
      SELECT q.id, q.question_text_ar, q.question_text_en, q.original_language, q.status, q.created_at, c.title_ar as category_ar
      FROM ask_sheikh_questions q
      LEFT JOIN ask_sheikh_categories c ON q.category_id = c.id
      WHERE q.status IN ('submitted', 'pending_sheikh')
      ORDER BY q.created_at ASC
      LIMIT $1
    `;
    try {
      const res = await pool.query(sql, [n]);
      return res.rows || [];
    } catch {
      return [];
    }
  }

  async function saveAnswerDraft({
    question_id,
    sheikh_user_id,
    answer_text_ar,
    answer_text_en,
    citations = [],
  } = {}) {
    if (!hasPool) return NOT_CONFIGURED;
    
    await pool.query('BEGIN');
    try {
      const original_lang = answer_text_ar ? 'ar' : 'en';
      const sql = `
        INSERT INTO ask_sheikh_answers
          (question_id, answered_by_user_id, answer_text_ar, answer_text_en, original_answer_lang, status)
        VALUES ($1, $2, $3, $4, $5, 'submitted_for_admin_review')
        RETURNING id
      `;
      const res = await pool.query(sql, [question_id, sheikh_user_id, answer_text_ar, answer_text_en, original_lang]);
      const answer_id = res.rows[0].id;

      for (const cite of citations) {
        const citeSql = `
          INSERT INTO ask_sheikh_answer_citations
            (answer_id, source_type, source_title_ar, source_title_en, reference_ar, reference_en, quote_ar, quote_en, url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        await pool.query(citeSql, [
          answer_id,
          cite.source_type,
          cite.source_title_ar,
          cite.source_title_en,
          cite.reference_ar,
          cite.reference_en,
          cite.quote_ar,
          cite.quote_en,
          cite.url
        ]);
      }

      const updateQSql = `UPDATE ask_sheikh_questions SET status = 'pending_admin_approval' WHERE id = $1`;
      await pool.query(updateQSql, [question_id]);

      await _recordAuditEvent({
        actor_user_id: sheikh_user_id,
        question_id,
        answer_id,
        action: 'sheikh_answer_submitted',
        after_status: 'pending_admin_approval',
      });

      await pool.query('COMMIT');
      return { ok: true, answer_id };
    } catch (e) {
      await pool.query('ROLLBACK');
      return { ok: false, reason: 'transaction_failed' };
    }
  }

  // ---------------------------------------------------------------------------
  // ADMIN METHODS
  // ---------------------------------------------------------------------------

  async function listPendingApprovals() {
    if (!hasPool) return [];
    const sql = `
      SELECT a.id as answer_id, q.id as question_id, q.question_text_ar, a.answer_text_ar, u.display_name as sheikh_name, a.created_at
      FROM ask_sheikh_answers a
      JOIN ask_sheikh_questions q ON a.question_id = q.id
      JOIN sakina_users u ON a.answered_by_user_id = u.id
      WHERE a.status = 'submitted_for_admin_review'
      ORDER BY a.created_at ASC
    `;
    try {
      const res = await pool.query(sql);
      return res.rows || [];
    } catch {
      return [];
    }
  }

  async function approveAnswer(answer_id, admin_user_id) {
    if (!hasPool) return NOT_CONFIGURED;
    await pool.query('BEGIN');
    try {
      const sql = `
        UPDATE ask_sheikh_answers
        SET status = 'published', public_visible = TRUE, reviewed_by_admin_id = $2, reviewed_at = NOW()
        WHERE id = $1
        RETURNING question_id
      `;
      const res = await pool.query(sql, [answer_id, admin_user_id]);
      const q_id = res.rows[0].question_id;

      await pool.query(`UPDATE ask_sheikh_questions SET status = 'published', public_visible = TRUE WHERE id = $1`, [q_id]);
      
      await _recordAuditEvent({
        actor_user_id: admin_user_id,
        question_id: q_id,
        answer_id,
        action: 'admin_approved_answer',
        after_status: 'published',
      });

      await pool.query('COMMIT');
      return { ok: true };
    } catch {
      await pool.query('ROLLBACK');
      return { ok: false };
    }
  }

  async function rejectAnswer(answer_id, admin_user_id, reason) {
    if (!hasPool) return NOT_CONFIGURED;
    await pool.query('BEGIN');
    try {
      await pool.query(`UPDATE ask_sheikh_answers SET status = 'rejected', rejection_reason = $2 WHERE id = $1`, [answer_id, reason]);
      const res = await pool.query(`SELECT question_id FROM ask_sheikh_answers WHERE id = $1`, [answer_id]);
      const q_id = res.rows[0].question_id;
      await pool.query(`UPDATE ask_sheikh_questions SET status = 'pending_sheikh' WHERE id = $1`, [q_id]);

      await _recordAuditEvent({
        actor_user_id: admin_user_id,
        question_id: q_id,
        answer_id,
        action: 'admin_rejected_answer',
        after_status: 'pending_sheikh',
        metadata: { reason },
      });

      await pool.query('COMMIT');
      return { ok: true };
    } catch {
      await pool.query('ROLLBACK');
      return { ok: false };
    }
  }

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  async function _recordAuditEvent({ actor_user_id, question_id, answer_id, action, before_status, after_status, metadata = {} }) {
    if (!hasPool) return;
    const sql = `
      INSERT INTO ask_sheikh_audit_events
        (actor_user_id, question_id, answer_id, action, before_status, after_status, metadata_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    try {
      await pool.query(sql, [actor_user_id, question_id, answer_id, action, before_status, after_status, JSON.stringify(metadata)]);
    } catch (e) {
      // Swallowing audit errors to avoid blocking the main flow, but in prod we would log this.
    }
  }

  return {
    listCategories,
    submitQuestion,
    listPublicQA,
    listPendingForSheikh,
    saveAnswerDraft,
    listPendingApprovals,
    approveAnswer,
    rejectAnswer,
  };
}

let _repository = null;
export function configureSheikhRepository({ repository = null } = {}) { _repository = repository; }
export function configureSheikhRepositoryWithPool({ pool } = {}) { _repository = pool ? createSheikhQuestionRepository({ pool }) : null; }
export function getSheikhRepository() { return _repository; }
export function isSheikhRepositoryConfigured() { return Boolean(_repository); }
export function _resetSheikhRepositoryForTests() { _repository = null; }
