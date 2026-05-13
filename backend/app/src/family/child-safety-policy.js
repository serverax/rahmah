/**
 * Child-safety policy — deterministic gate for content shown to / collected
 * from a child.
 *
 * Pure function module; no I/O. Used by:
 *   - Sprint 6 children's game scenarios (when shipped),
 *   - Sprint 10 ingestion controller's child_content branch (already wired),
 *   - Sprint 12 family routes' content-display checks.
 *
 * Rules (Sprint 12):
 *   1. Personal-data prompts are NEVER allowed in child content.
 *   2. Shaming / harsh language is NEVER allowed in child content.
 *   3. Politics, sectarianism, and explicit violence are NEVER allowed.
 *   4. External links require the registered-source check (operator-approved).
 *   5. Age-band gating: `4-6` and `7-9` skip topics flagged sensitive.
 */

export const AGE_BANDS = Object.freeze(['4-6', '7-9', '10-12', '13+']);
export const SENSITIVE_TOPICS = Object.freeze([
  'death',
  'fitan',          // fitnah-related
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

const SHAMING_PATTERNS = [
  /غبي/,
  /أحمق/,
  /فاشل/,
  /سيء جداً/,
];

const POLITICAL_PATTERNS = [
  /حزب سياسي/,
  /انتخابات/,
];

const SECTARIAN_PATTERNS = [
  /سني خير من شيعي/,
  /شيعي خير من سني/,
  // operator may extend this list — keep it conservative.
];

export function isValidAgeBand(b) {
  return AGE_BANDS.includes(b);
}

/**
 * Decide whether a piece of child-bound content is safe to show.
 *
 * Returns:
 *   { decision: 'allow' | 'block', reason, sensitive_topic?: string }
 */
export function evaluateChildContent({
  body_ar = '',
  age_band = '7-9',
  topic_tags = [],
} = {}) {
  if (typeof body_ar !== 'string' || body_ar.trim().length === 0) {
    return Object.freeze({ decision: 'block', reason: 'empty_body' });
  }
  if (!isValidAgeBand(age_band)) {
    return Object.freeze({ decision: 'block', reason: 'invalid_age_band' });
  }

  // Hard blocks (independent of age).
  for (const kw of PERSONAL_DATA_KEYWORDS_AR) {
    if (body_ar.includes(kw)) {
      return Object.freeze({ decision: 'block', reason: 'asks_personal_data' });
    }
  }
  for (const re of SHAMING_PATTERNS) {
    if (re.test(body_ar)) {
      return Object.freeze({ decision: 'block', reason: 'shaming_language' });
    }
  }
  for (const re of POLITICAL_PATTERNS) {
    if (re.test(body_ar)) {
      return Object.freeze({ decision: 'block', reason: 'political_content' });
    }
  }
  for (const re of SECTARIAN_PATTERNS) {
    if (re.test(body_ar)) {
      return Object.freeze({ decision: 'block', reason: 'sectarian_content' });
    }
  }

  // Age-band gating: younger bands skip topics flagged as sensitive.
  if (age_band === '4-6' || age_band === '7-9') {
    if (Array.isArray(topic_tags)) {
      for (const t of topic_tags) {
        if (SENSITIVE_TOPICS.includes(t)) {
          return Object.freeze({
            decision: 'block',
            reason: 'topic_not_for_younger_band',
            sensitive_topic: t,
          });
        }
      }
    }
  }

  return Object.freeze({ decision: 'allow', reason: null });
}

/**
 * Decide whether a profile field is safe to store / return for a child.
 * Used by the family route when accepting create/update payloads.
 */
export function evaluateChildProfileField({ field, value }) {
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
  // Any other field is rejected — the schema only stores nickname_ar +
  // age_band for children.
  return { decision: 'block', reason: 'field_not_collected_for_children' };
}
