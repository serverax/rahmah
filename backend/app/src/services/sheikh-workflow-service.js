/**
 * sheikh-workflow-service — pure orchestration helpers for the Sheikh
 * pending → answer → publish workflow.
 *
 * No DB writes here; the route layer takes the decision and (when DB is
 * configured) calls the repository. When DB is missing, we return
 * persisted: false honestly — never fake a publish.
 */

import { isAuthConfigured } from '../auth/auth-config.js';
import { isSheikhRepositoryConfigured } from '../sheikh/sheikh-question-repository.js';
import { isDatabaseConfigured } from '../db/config.js';
import { authError } from '../auth/auth-errors.js';
import { evaluatePublishEligibility } from './citation-policy-service.js';

export function decideListPending() {
  if (!isAuthConfigured()) return authError('auth_not_configured',
    'تسجيل دخول الشيخ غير مفعل بعد.');
  if (!isSheikhRepositoryConfigured()) {
    return Object.freeze({
      ok: false,
      reason: 'service_not_configured',
      safe_message_ar: 'مستودع أسئلة الشيخ غير مفعل بعد.',
    });
  }
  return Object.freeze({ ok: true, action: 'fetch_from_repository' });
}

export async function decideAnswerDraft({ citations, publication_mode }) {
  if (!isAuthConfigured()) return authError('auth_not_configured');
  const cite = await evaluatePublishEligibility(citations, { publication_mode });
  if (!cite.allowed) {
    return Object.freeze({
      ok: false,
      reason: cite.reason || 'insufficient_citation',
      citation_status: cite.citation_status,
      safe_message_ar: 'لا يجوز النشر بدون مصدر شرعي معتمد.',
    });
  }
  if (!isDatabaseConfigured() || !isSheikhRepositoryConfigured()) {
    return Object.freeze({
      ok: true,
      persisted: false,
      citation_status: cite.citation_status,
      reason: 'database_not_configured',
      safe_message_ar: 'تم استلام المسودة محلياً فقط — قاعدة البيانات غير مهيأة.',
    });
  }
  return Object.freeze({
    ok: true,
    persisted: false,         // repository INSERT not wired this turn
    citation_status: cite.citation_status,
    action: 'persist_via_repository',
  });
}

export function decidePublish({ citation_status, wasm_fatwa_gate_available, wasm_child_safety_available }) {
  if (!isAuthConfigured()) return authError('auth_not_configured');
  if (!isSheikhRepositoryConfigured()) {
    return Object.freeze({ ok: false, reason: 'service_not_configured' });
  }
  // Citation gate.
  if (citation_status !== 'quran_cited' &&
      citation_status !== 'hadith_cited' &&
      citation_status !== 'quran_and_hadith_cited') {
    return Object.freeze({
      ok: false,
      reason: 'citation_status_requires_explicit_override',
      safe_message_ar: 'النشر يتطلب اقتباس قرآن أو حديث صحيح.',
    });
  }
  // WASM gate availability is operator-controlled. If either gate is
  // marked unavailable, refuse to publish — the gate is part of the
  // publication contract.
  if (!wasm_fatwa_gate_available) {
    return Object.freeze({
      ok: false,
      reason: 'wasm_fatwa_gate_unavailable',
      safe_message_ar: 'بوابة سياسة الفتوى غير متاحة. النشر مؤجل.',
    });
  }
  if (!wasm_child_safety_available) {
    return Object.freeze({
      ok: false,
      reason: 'wasm_child_safety_unavailable',
      safe_message_ar: 'بوابة سلامة الطفل غير متاحة. النشر مؤجل.',
    });
  }
  return Object.freeze({
    ok: true,
    next_publication_status: 'published_public',
    persisted: false,         // repository UPDATE not wired this turn
  });
}
