/**
 * Human approval gate for self-improvement proposals.
 */

const ALLOWED_STATUSES = new Set([
  'detected',
  'drafted',
  'needs_review',
  'approved_for_planning',
  'approved_for_code_generation',
  'rejected',
  'implemented',
  'released',
]);

const FORWARD_TRANSITIONS = Object.freeze({
  detected: new Set(['drafted', 'needs_review']),
  drafted: new Set(['needs_review', 'approved_for_planning', 'rejected']),
  needs_review: new Set(['approved_for_planning', 'rejected']),
  approved_for_planning: new Set(['approved_for_code_generation', 'rejected']),
  approved_for_code_generation: new Set(['implemented', 'rejected']),
  implemented: new Set(['released']),
  released: new Set([]),
  rejected: new Set([]),
});

export function HumanApprovalGate({
  proposal = {},
  next_status,
  reviewer_admin_id = null,
  reviewer_role = 'admin',
  decision_reason = '',
} = {}) {
  const current = String(proposal.approval_status || 'drafted');
  const target = String(next_status || '');

  if (!ALLOWED_STATUSES.has(current)) {
    return Object.freeze({ allowed: false, reason: 'invalid_current_status' });
  }
  if (!ALLOWED_STATUSES.has(target)) {
    return Object.freeze({ allowed: false, reason: 'invalid_target_status' });
  }
  if (reviewer_role !== 'admin' && reviewer_role !== 'moderator' && reviewer_role !== 'content_reviewer' && reviewer_role !== 'sheikh') {
    return Object.freeze({ allowed: false, reason: 'human_approval_required' });
  }
  if (!reviewer_admin_id) {
    return Object.freeze({ allowed: false, reason: 'reviewer_required' });
  }
  if (!FORWARD_TRANSITIONS[current].has(target)) {
    return Object.freeze({ allowed: false, reason: 'invalid_transition' });
  }

  return Object.freeze({
    allowed: true,
    reason: 'approved_by_human',
    proposal_id: proposal.id || null,
    approval_status: target,
    reviewer_admin_id,
    reviewer_role,
    decision_reason: typeof decision_reason === 'string' ? decision_reason : '',
  });
}

export function listAllowedStatuses() {
  return [...ALLOWED_STATUSES];
}
