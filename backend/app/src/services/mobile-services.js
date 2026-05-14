/**
 * Mobile-API service layer (DB-ready, fail-closed).
 *
 * Every function here is a pure data-shape mapper around the existing
 * repositories. When the DB is not configured, every function returns a
 * `persisted: false` shape so the route layer can render an honest UI
 * (instead of pretending the write succeeded).
 *
 * Nothing in this module:
 *   - invents religious content
 *   - returns a "successful" payment
 *   - leaks DSN / secret / raw email
 *   - bypasses the citation requirement for Sheikh answers
 */

import { isDatabaseConfigured } from '../db/config.js';
import { getSheikhRepository, isSheikhRepositoryConfigured } from '../sheikh/sheikh-question-repository.js';
import { evaluateCitationRequirement } from '../sheikh/citation-requirement.js';

export const SERVICE_NOT_CONFIGURED = Object.freeze({
  ok: false,
  persisted: false,
  reason: 'database_not_configured',
});

/* ---------- questions -------------------------------------------------- */

export async function submitQuestion(payload = {}) {
  if (!isDatabaseConfigured()) {
    return Object.freeze({
      ok: true,
      persisted: false,
      reason: 'database_not_configured',
      status: 'pending_review_local_only',
      message_ar: 'تم استلام السؤال محلياً. سيتم حفظه عند توصيل قاعدة البيانات.',
    });
  }
  if (!isSheikhRepositoryConfigured()) return SERVICE_NOT_CONFIGURED;
  const repo = getSheikhRepository();
  const r = await repo.submitQuestion({
    user_id: null,
    question_text: payload.question_ar || payload.question_text,
    language: payload.language || 'ar',
    category: payload.category_ar || payload.category || null,
    public_allowed: Boolean(payload.public_allowed),
  });
  if (!r || !r.ok) return Object.freeze({ ok: false, persisted: false, reason: r && r.reason });
  return Object.freeze({
    ok: true,
    persisted: true,
    status: r.status,
    question_id: r.question_id,
  });
}

export async function getQuestion(question_id) {
  if (!isDatabaseConfigured()) return SERVICE_NOT_CONFIGURED;
  if (!isSheikhRepositoryConfigured()) return SERVICE_NOT_CONFIGURED;
  const repo = getSheikhRepository();
  const r = await repo.getQuestionStatus({ question_id });
  if (!r || !r.ok) return Object.freeze({ ok: false, persisted: false, reason: r && r.reason });
  return Object.freeze({
    ok: true,
    persisted: true,
    question_id: r.id,
    status: r.status,
    language: r.language,
    category: r.category,
    created_at: r.created_at,
    updated_at: r.updated_at,
  });
}

/* ---------- sheikh workflow ------------------------------------------- */

export async function draftSheikhAnswer({ question_id, sheikh_user_id, answer_ar, citations, publication_mode }) {
  const decision = evaluateCitationRequirement(citations);
  if (decision.citation_status === 'insufficient_citation') {
    return Object.freeze({
      ok: false,
      persisted: false,
      reason: 'insufficient_citation',
      citation_status: 'insufficient_citation',
    });
  }
  if (!isDatabaseConfigured()) {
    return Object.freeze({
      ok: true,
      persisted: false,
      reason: 'database_not_configured',
      citation_status: decision.citation_status,
      next_publication_status:
        publication_mode === 'public' && decision.can_publish_public
          ? 'pending_moderation_local_only'
          : 'draft_local_only',
    });
  }
  if (!isSheikhRepositoryConfigured()) return SERVICE_NOT_CONFIGURED;
  const repo = getSheikhRepository();
  const saved = await repo.saveAnswerDraft({
    question_id,
    sheikh_user_id,
    answer_text: answer_ar,
    citation_status: decision.citation_status,
  });
  if (!saved || !saved.ok) return Object.freeze({ ok: false, persisted: false, reason: saved && saved.reason });
  return Object.freeze({
    ok: true,
    persisted: true,
    answer_id: saved.answer_id,
    citation_status: decision.citation_status,
    publication_status: saved.publication_status,
  });
}

/* ---------- public answers -------------------------------------------- */

export async function listPublicAnswers() {
  if (!isDatabaseConfigured()) {
    return Object.freeze({ ok: true, configured: false, items: [] });
  }
  if (!isSheikhRepositoryConfigured()) {
    return Object.freeze({ ok: true, configured: false, items: [] });
  }
  const repo = getSheikhRepository();
  const items = await repo.listPublicQA({});
  return Object.freeze({ ok: true, configured: true, items });
}

/* ---------- children game progress ------------------------------------ */

export async function saveGameProgress({ scenario_id, attempts_count, correct_count }) {
  if (!isDatabaseConfigured()) {
    return Object.freeze({
      ok: true,
      persisted: false,
      reason: 'database_not_configured',
      status: 'local_only',
    });
  }
  // Real DB persistence wires into the (future) children_game_progress
  // repository; today we acknowledge but do not insert.
  return Object.freeze({
    ok: true,
    persisted: false,
    status: 'received',
    scenario_id,
    attempts_count: Number.isInteger(attempts_count) ? attempts_count : 0,
    correct_count: Number.isInteger(correct_count) ? correct_count : 0,
  });
}

/* ---------- donations intent ------------------------------------------ */

export function donationsProvider() {
  const v = String(process.env.DONATION_PROVIDER || '').toLowerCase();
  if (['stripe', 'paypal', 'manual_offline'].includes(v)) return v;
  return 'disabled';
}

export async function recordDonationIntent({ amount_cents, currency, cause_id }) {
  const provider = donationsProvider();
  if (provider === 'disabled') {
    return Object.freeze({
      ok: false,
      persisted: false,
      provider: 'disabled',
      status: 'provider_disabled',
    });
  }
  if (!isDatabaseConfigured()) {
    return Object.freeze({
      ok: false,
      persisted: false,
      provider,
      status: 'storage_not_configured',
    });
  }
  return Object.freeze({
    ok: true,
    persisted: false,           // repository INSERT not wired yet
    provider,
    status: 'intent_recorded',
    amount_cents,
    currency,
    cause_id,
  });
}

/* ---------- device registrations -------------------------------------- */

export async function registerDevice({ platform, app_version }) {
  if (!isDatabaseConfigured()) {
    return Object.freeze({
      ok: true,
      persisted: false,
      reason: 'database_not_configured',
    });
  }
  return Object.freeze({
    ok: true,
    persisted: false,           // repository INSERT not wired yet
    platform: ['android', 'ios'].includes(platform) ? platform : 'unknown',
    app_version: typeof app_version === 'string' && app_version.length <= 32 ? app_version : 'unknown',
  });
}
