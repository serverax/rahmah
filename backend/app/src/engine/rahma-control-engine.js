/**
 * Rahma Control Engine — the deterministic event router.
 *
 * `processRahmaEvent(event)` is the single entry point. It dispatches to the
 * gate modules based on `event_type` and returns a structured decision.
 *
 * It is **not** an LLM and **never** invents content. Every output is the
 * deterministic result of the gates below.
 */

import {
  isSupportedEvent,
  isAllowedActor,
  SUPPORTED_EVENTS,
} from './engine-types.js';
import { citationGate } from './citation-gate.js';
import { reviewGate } from './review-gate.js';
import { childContentGate, childProfileGate } from './child-safety-gate.js';
import { freshnessCheck } from './freshness-checker.js';
import { recommend } from './recommendation-engine.js';
import { ingestionDecide } from './data-ingestion-controller.js';

const ENGINE_VERSION = '1.0.0';

const ARABIC_MESSAGES = Object.freeze({
  user_safe_default: 'تم استلام طلبكم وسيتم اتخاذ القرار المناسب وفق سياسة الأمان.',
  block_missing_citation:
    'لا يمكن نشر الإجابة بدون مرجع من القرآن الكريم أو الحديث الشريف.',
  queue_review_default:
    'تمت إحالة المحتوى للمراجعة الشرعية قبل النشر.',
  block_child_personal_data:
    'لا يطلب التطبيق من الأطفال أي بيانات شخصية.',
  block_child_unsafe_language:
    'يُمنع استخدام عبارات قاسية أو مهينة في محتوى الأطفال.',
  needs_source: 'هذا المحتوى يحتاج إلى ذكر المصدر قبل المراجعة.',
  service_not_configured: 'الخدمة غير مهيأة بعد.',
  ok_recommend: 'تمت إضافة المحتوى المعتمد إلى التوصيات.',
});

function baseResult(overrides) {
  return Object.freeze({
    decision: 'queue_review',
    reason: null,
    required_actions: Object.freeze([]),
    audit_log_required: false,
    user_safe_message_ar: ARABIC_MESSAGES.queue_review_default,
    reviewer_message_ar: '',
    evidence: Object.freeze([]),
    ...overrides,
  });
}

/**
 * Validate the event envelope. Returns `null` if valid, or a baseResult
 * with a `block` / `service_not_configured` shape on failure.
 */
function validateEvent(event) {
  if (!event || typeof event !== 'object') {
    return baseResult({
      decision: 'block',
      reason: 'invalid_event_envelope',
      audit_log_required: false,
      user_safe_message_ar: ARABIC_MESSAGES.service_not_configured,
    });
  }
  if (!isSupportedEvent(event.event_type)) {
    return baseResult({
      decision: 'queue_review',
      reason: 'unsupported_event_type',
      audit_log_required: false,
      reviewer_message_ar: 'نوع الحدث غير مدعوم — تمت الإحالة للمراجعة اليدوية.',
    });
  }
  if (event.actor_type !== undefined && !isAllowedActor(event.actor_type)) {
    return baseResult({
      decision: 'block',
      reason: 'invalid_actor_type',
      audit_log_required: false,
    });
  }
  return null;
}

/**
 * Main dispatcher. Returns the decision and the rest of the contract shape.
 */
export async function processRahmaEvent(event = {}) {
  const v = validateEvent(event);
  if (v) return v;

  const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};

  switch (event.event_type) {
    case 'USER_ASKED_SHEIKH_QUESTION': {
      const q = typeof payload.question_text === 'string' ? payload.question_text.trim() : '';
      if (q.length < 5) {
        return baseResult({
          decision: 'block',
          reason: 'empty_or_too_short_question',
          audit_log_required: false,
        });
      }
      return baseResult({
        decision: 'queue_review',
        reason: 'question_queued_for_sheikh',
        audit_log_required: true,
        reviewer_message_ar: 'وصلكم سؤال جديد بحاجة لمراجعة من الشيخ.',
      });
    }

    case 'SHEIKH_DRAFTED_ANSWER': {
      // Draft can be saved even without citations — but never published.
      return baseResult({
        decision: 'allow',
        reason: 'draft_saved',
        audit_log_required: true,
      });
    }

    case 'SHEIKH_REQUESTED_PUBLISH': {
      const g = citationGate(payload);
      if (g.decision === 'block') {
        return baseResult({
          decision: 'block',
          reason: g.reason,
          audit_log_required: true,
          user_safe_message_ar: ARABIC_MESSAGES.block_missing_citation,
        });
      }
      if (g.decision === 'queue_review') {
        return baseResult({
          decision: 'queue_review',
          reason: g.reason,
          audit_log_required: true,
        });
      }
      return baseResult({
        decision: 'queue_review',
        reason: 'pending_moderation',
        audit_log_required: true,
      });
    }

    case 'NEW_ISLAMIC_CONTENT_ADDED': {
      const d = ingestionDecide(payload, { existingHashes: event.existingHashes || null });
      if (d.decision === 'needs_source') {
        return baseResult({
          decision: 'needs_source',
          reason: d.reason,
          audit_log_required: true,
          user_safe_message_ar: ARABIC_MESSAGES.needs_source,
        });
      }
      if (d.decision === 'block') {
        return baseResult({ decision: 'block', reason: d.reason, audit_log_required: true });
      }
      return baseResult({
        decision: 'queue_review',
        reason: d.reason || 'queued_for_review',
        audit_log_required: true,
      });
    }

    case 'CHILD_GAME_SCENARIO_ADDED': {
      const c = await childContentGate({
        body_ar: payload.body_ar,
        age_band: payload.age_band || '7-9',
        topic_tags: payload.topic_tags || [],
      });
      if (c.decision !== 'allow') {
        return baseResult({
          decision: 'block',
          reason: c.reason,
          audit_log_required: true,
          user_safe_message_ar:
            c.reason === 'asks_personal_data'
              ? ARABIC_MESSAGES.block_child_personal_data
              : ARABIC_MESSAGES.block_child_unsafe_language,
        });
      }
      return baseResult({
        decision: 'queue_review',
        reason: 'child_scenario_pending_review',
        audit_log_required: true,
      });
    }

    case 'FAMILY_CHILD_PROFILE_CREATED': {
      const c = await childProfileGate({
        nickname_ar: payload.nickname_ar,
        age_band: payload.age_band,
      });
      if (c.decision !== 'allow') {
        return baseResult({ decision: 'block', reason: c.reason, audit_log_required: true });
      }
      return baseResult({ decision: 'allow', reason: null, audit_log_required: true });
    }

    case 'CHARITY_CAMPAIGN_CREATED':
      return baseResult({
        decision: 'queue_review',
        reason: 'campaign_draft_queued',
        audit_log_required: true,
      });

    case 'CHARITY_CAMPAIGN_REQUESTED_PUBLICATION': {
      const r = reviewGate({ verification_status: payload.verification_status });
      if (r.decision === 'block') {
        return baseResult({ decision: 'block', reason: r.reason, audit_log_required: true });
      }
      if (r.decision === 'allow') {
        return baseResult({
          decision: 'publish',
          reason: 'campaign_approved_publish_allowed',
          audit_log_required: true,
        });
      }
      return baseResult({
        decision: 'queue_review',
        reason: 'campaign_awaiting_review',
        audit_log_required: true,
      });
    }

    case 'CONTENT_REVIEW_REQUESTED':
      return baseResult({
        decision: 'queue_review',
        reason: 'explicit_review_request',
        audit_log_required: true,
      });

    case 'SOURCE_VERIFICATION_REQUIRED':
      return baseResult({
        decision: 'queue_review',
        reason: 'source_verification_required',
        audit_log_required: true,
        reviewer_message_ar: 'مطلوب التحقق من مصدر المحتوى قبل النشر.',
      });

    case 'USER_OPENED_HOME':
    case 'USER_OPENED_CHILD_GAME':
    case 'USER_SEARCHED_CONTENT':
      // Engagement events: no content decision; the recommendation engine
      // is queried separately by ADMIN_REQUESTED_RECOMMENDATIONS.
      return baseResult({
        decision: 'allow',
        reason: 'engagement_event',
        audit_log_required: false,
      });

    case 'DAILY_CONTENT_REFRESH': {
      const f = freshnessCheck(payload || {});
      return baseResult({
        decision: f.fresh ? 'allow' : 'queue_review',
        reason: f.fresh ? null : 'content_needs_refresh',
        required_actions: Object.freeze(f.refresh_tasks),
        audit_log_required: false,
      });
    }

    case 'ADMIN_REQUESTED_RECOMMENDATIONS': {
      const items = await recommend({
        candidates: payload.candidates || [],
        audience: payload.audience || 'adult',
        age_band: payload.age_band || '7-9',
        limit: payload.limit || 6,
      });
      return baseResult({
        decision: 'recommend',
        reason: 'recommendations_built',
        audit_log_required: false,
        evidence: items.items,
      });
    }

    default:
      // Should not reach — isSupportedEvent guards. Fail-safe.
      return baseResult({
        decision: 'queue_review',
        reason: 'unhandled_event_type',
        audit_log_required: false,
      });
  }
}

export function engineMetadata() {
  return Object.freeze({
    engine_implemented: true,
    mode: 'deterministic_rules',
    engine_version: ENGINE_VERSION,
    modules_loaded: [
      'engine-types',
      'citation-gate',
      'review-gate',
      'child-safety-gate',
      'freshness-checker',
      'recommendation-engine',
      'data-ingestion-controller',
      'audit-logger',
      'rahma-control-engine',
    ],
    supported_events: SUPPORTED_EVENTS.slice(),
    safety_rules_loaded: [
      'no_publish_without_citation',
      'fiqh_only_routes_to_moderation',
      'scholar_note_only_routes_to_moderation',
      'unverified_content_blocks_recommendation',
      'child_personal_data_blocked',
      'child_shaming_blocked',
      'child_political_blocked',
      'child_sectarian_blocked',
      'sensitive_topics_filtered_for_younger_bands',
      'duplicate_content_blocked',
      'missing_source_for_religious_type_blocked',
    ],
  });
}
