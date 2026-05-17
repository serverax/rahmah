/**
 * child-safety runtime policy — deterministic JS port of
 * wasm/child-safety/src/lib.rs.
 *
 * The Rust crate is the source of truth; this JS port runs in-process in
 * the runtime bridge until the host loads the `.wasm` artefact directly
 * via wasmtime/wasmedge. Both implementations MUST produce identical
 * output for identical input. The parity contract is asserted by
 * the test suite under wasm/child-safety/server/test/.
 *
 * NEVER persists raw body_ar. NEVER echoes DSN / secrets / tokens.
 */

export const AGE_BANDS = Object.freeze(['4-6', '7-9', '10-12', '13+']);
export const SENSITIVE_TOPICS = Object.freeze([
  'death',
  'fitan',
  'punishment',
  'jihad',
  'detailed_aqidah_dispute',
  'detailed_fiqh_dispute',
]);

const PERSONAL_DATA_KEYWORDS_AR = Object.freeze([
  'رقم الجوال',
  'رقم الهاتف',
  'العنوان السكني',
  'كلمة المرور',
  'الموقع الجغرافي',
  'تاريخ الميلاد',
  'البريد الإلكتروني الخاص',
]);

const SHAMING_AR = Object.freeze(['غبي', 'أحمق', 'فاشل', 'سيء جداً']);
const POLITICAL_AR = Object.freeze(['حزب سياسي', 'انتخابات']);
const SECTARIAN_AR = Object.freeze(['سني خير من شيعي', 'شيعي خير من سني']);

export function isValidAgeBand(b) {
  return AGE_BANDS.includes(b);
}

/**
 * Decide whether a piece of child-bound content is safe.
 *
 * @param {{body_ar:string, age_band:string, topic_tags:string[]}} input
 * @returns {{decision:'allow'|'block', reason:string|null, sensitive_topic?:string}}
 */
export function evaluateChildContent(input) {
  const body = typeof input?.body_ar === 'string' ? input.body_ar : '';
  if (body.trim().length === 0) return { decision: 'block', reason: 'empty_body' };

  const age = typeof input?.age_band === 'string' ? input.age_band : '7-9';
  if (!isValidAgeBand(age)) return { decision: 'block', reason: 'invalid_age_band' };

  for (const kw of PERSONAL_DATA_KEYWORDS_AR) if (body.includes(kw)) return { decision: 'block', reason: 'asks_personal_data' };
  for (const p of SHAMING_AR)               if (body.includes(p))  return { decision: 'block', reason: 'shaming_language' };
  for (const p of POLITICAL_AR)             if (body.includes(p))  return { decision: 'block', reason: 'political_content' };
  for (const p of SECTARIAN_AR)             if (body.includes(p))  return { decision: 'block', reason: 'sectarian_content' };

  if (age === '4-6' || age === '7-9') {
    const topics = Array.isArray(input?.topic_tags) ? input.topic_tags : [];
    for (const t of topics) {
      if (SENSITIVE_TOPICS.includes(t)) {
        return { decision: 'block', reason: 'topic_not_for_younger_band', sensitive_topic: t };
      }
    }
  }

  return { decision: 'allow', reason: null };
}

/**
 * Decide whether a profile field is safe for a child.
 * Parity port of backend/app/src/family/child-safety-policy.js.
 *
 * @param {{field:string, value:string}} input
 * @returns {{decision:'allow'|'block', reason:string|null}}
 */
export function evaluateChildProfileField(input) {
  const { field, value } = input || {};
  if (field === 'nickname_ar') {
    if (typeof value !== 'string') return { decision: 'block', reason: 'invalid_type' };
    const t = value.trim();
    if (t.length === 0) return { decision: 'block', reason: 'empty_nickname' };
    if (t.length > 32) return { decision: 'block', reason: 'nickname_too_long' };
    if (/(.{1,}@.{1,}|\+?\d{6,})/.test(t)) {
      return { decision: 'block', reason: 'nickname_looks_like_pii' };
    }
    return { decision: 'allow', reason: null };
  }
  if (field === 'age_band') {
    return isValidAgeBand(value)
      ? { decision: 'allow', reason: null }
      : { decision: 'block', reason: 'invalid_age_band' };
  }
  return { decision: 'block', reason: 'field_not_collected_for_children' };
}
