/**
 * Engine review gate — wraps `verification_status` for any new content row.
 *
 * Rules:
 *   - unverified / pending_review / missing → queue_review.
 *   - approved → allow (or recommend for the recommendation engine).
 *   - rejected → block.
 */

export function reviewGate({ verification_status } = {}) {
  const v = typeof verification_status === 'string' ? verification_status : 'unverified';
  if (v === 'approved')     return Object.freeze({ decision: 'allow', reason: null });
  if (v === 'rejected')     return Object.freeze({ decision: 'block', reason: 'content_rejected_by_review' });
  // unverified or pending_review
  return Object.freeze({ decision: 'queue_review', reason: 'awaiting_review' });
}
