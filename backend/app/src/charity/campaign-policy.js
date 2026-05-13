/**
 * Charity / sadaqah campaign policy — deterministic gate for what is
 * publicly visible and what the donation flow may attempt.
 *
 * Pure functions, no I/O.
 */

export const CAMPAIGN_CATEGORIES = Object.freeze([
  'food_relief',
  'water_relief',
  'orphan_support',
  'islamic_education',
  'mosque_support',
  'medical_relief',
  'general',
]);

export const CAMPAIGN_STATUSES = Object.freeze([
  'draft', 'active', 'paused', 'completed', 'hidden',
]);

export const CAMPAIGN_VERIFICATION_STATUSES = Object.freeze([
  'unverified', 'pending_review', 'approved', 'rejected',
]);

export function isValidCategory(c) { return CAMPAIGN_CATEGORIES.includes(c); }

/**
 * Decide whether a campaign row is allowed in the public active list.
 *
 * Rules:
 *   - status must be 'active'.
 *   - verification_status must be 'approved'.
 *   - title_ar + description_ar must be non-empty.
 */
export function isPubliclyListable(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.status !== 'active') return false;
  if (row.verification_status !== 'approved') return false;
  if (typeof row.title_ar !== 'string' || row.title_ar.trim().length === 0) return false;
  if (typeof row.description_ar !== 'string' || row.description_ar.trim().length === 0) return false;
  return true;
}

/**
 * Decide whether a donation intent can even be initiated. The hard rule
 * (Sprint 13): if the payment provider is `not_configured` or `disabled`,
 * the route returns `provider_not_configured` and the UI must NOT pretend
 * the donation succeeded.
 */
export function evaluateDonationIntent({
  campaign,
  amount,
  currency = 'USD',
  provider_status,
} = {}) {
  if (!campaign || !isPubliclyListable(campaign)) {
    return Object.freeze({
      decision: 'block',
      reason: 'campaign_not_active_or_unverified',
    });
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return Object.freeze({
      decision: 'block',
      reason: 'invalid_amount',
    });
  }
  if (typeof currency !== 'string' || currency.length < 3 || currency.length > 8) {
    return Object.freeze({
      decision: 'block',
      reason: 'invalid_currency',
    });
  }
  if (provider_status !== 'sandbox' && provider_status !== 'enabled') {
    return Object.freeze({
      decision: 'provider_not_configured',
      reason: 'payment_provider_not_active',
      user_message_ar: 'الدفع غير مفعل حالياً. سيتم التواصل معكم عند توفر الخدمة.',
    });
  }
  return Object.freeze({
    decision: 'allow_intent_record',
    reason: null,
  });
}

/**
 * The public projection — the only fields a public response may surface.
 */
export function publicCampaignProjection(row) {
  if (!row || typeof row !== 'object') return null;
  return Object.freeze({
    id: row.id || null,
    title_ar: row.title_ar || '',
    description_ar: row.description_ar || '',
    category: row.category || 'general',
    target_amount: row.target_amount ?? null,
    collected_amount: row.collected_amount ?? 0,
    status: row.status || 'draft',
    verification_status: row.verification_status || 'unverified',
    last_update_at: row.updated_at || row.created_at || null,
  });
}
