/**
 * citation-policy-service — pure decision helpers for the Sheikh
 * workflow's citation gate.
 *
 * Wraps the existing evaluateCitationRequirement and surfaces a single
 * publish-eligibility decision the route can use.
 */

import { evaluateCitationRequirement } from '../sheikh/citation-requirement.js';

export function evaluatePublishEligibility(citations, { publication_mode = 'public' } = {}) {
  const decision = evaluateCitationRequirement(citations || []);
  const allowed = publication_mode === 'public'
    ? decision.can_publish_public
    : decision.can_publish_private;
  return Object.freeze({
    allowed,
    citation_status: decision.citation_status,
    reason: decision.reason,
  });
}
