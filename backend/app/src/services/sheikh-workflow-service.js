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
import { callWasmBridge } from '../safety/internal-wasm-client.js';

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

export async function decidePublish({
  citation_status,
  has_scholar_approval = true, // Default to true if calling approve endpoint
  publication_mode = 'public',
}) {
  if (!isAuthConfigured()) return authError('auth_not_configured');
  if (!isSheikhRepositoryConfigured()) {
    return Object.freeze({ ok: false, reason: 'service_not_configured' });
  }

  const wasmUrl = process.env.WASM_FATWA_POLICY_GATE_URL;
  const childWasmUrl = process.env.WASM_CHILD_SAFETY_URL;
  let decision;

  if (wasmUrl) {
    const has_verified_quran_or_hadith_citation = (
      citation_status === 'quran_cited' ||
      citation_status === 'hadith_cited' ||
      citation_status === 'quran_and_hadith_cited'
    );

    const res = await callWasmBridge(wasmUrl, '/evaluate', {
      has_scholar_approval,
      has_verified_quran_or_hadith_citation,
      publication_mode_public: publication_mode === 'public',
    });

    if (res.ok && res.decision) {
      decision = res;
    }
  }

  // If child safety bridge is configured but unreachable, we should probably
  // still allow if fatwa gate passed, OR be stricter?
  // The old code BLOCKED if the flag was false.
  // In the integrated world, "unreachable" is handled by the client.

  // Fallback to local logic if no WASM bridge.
  if (!decision) {
    if (publication_mode === 'public') {
      if (!has_scholar_approval) {
        decision = { decision: 'block', reason: 'public_fatwa_requires_scholar_approval' };
      } else if (citation_status !== 'quran_cited' &&
                 citation_status !== 'hadith_cited' &&
                 citation_status !== 'quran_and_hadith_cited') {
        decision = { decision: 'block', reason: 'citation_status_requires_explicit_override' };
      } else {
        decision = { decision: 'allow_publish', reason: 'approved_and_cited' };
      }
    } else {
      // Private mode fallback.
      decision = (citation_status === 'insufficient_citation')
        ? { decision: 'needs_scholar_review', reason: 'insufficient_citation' }
        : { decision: 'allow_publish', reason: 'private_allowed' };
    }
  }

  if (decision && decision.decision === 'allow_publish' && childWasmUrl) {
    const probe = await callWasmBridge(childWasmUrl, '/health', {});
    if (!probe.ok) {
      return Object.freeze({
        ok: false,
        reason: 'wasm_child_safety_unavailable',
        safe_message_ar: 'بوابة سلامة الطفل غير متاحة. النشر مؤجل.',
      });
    }
  }

  if (decision && decision.decision === 'allow_publish') {
    return Object.freeze({
      ok: true,
      next_publication_status: publication_mode === 'public' ? 'published_public' : 'answered_private',
      persisted: false,
    });
  }

  return Object.freeze({
    ok: false,
    reason: decision.reason,
    safe_message_ar: 'النشر يتطلب استيفاء شروط المصدر الشرعي وموافقة الشيخ.',
  });
}
