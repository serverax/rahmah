/**
 * Engine citation gate. Reuses the citation-requirement policy from Sprint 3
 * so there is a single source of truth for "what counts as a valid citation".
 */

import { evaluateCitationRequirement } from '../sheikh/citation-requirement.js';

export function citationGate({ answer_text, citations } = {}) {
  if (typeof answer_text !== 'string' || answer_text.trim().length === 0) {
    return Object.freeze({
      decision: 'block',
      reason: 'empty_answer_text',
      citation_status: 'insufficient_citation',
    });
  }
  const ev = evaluateCitationRequirement(citations);
  if (ev.citation_status === 'insufficient_citation') {
    return Object.freeze({
      decision: 'block',
      reason: 'missing_citation',
      citation_status: ev.citation_status,
    });
  }
  if (ev.citation_status === 'scholar_advice_needs_review') {
    return Object.freeze({
      decision: 'queue_review',
      reason: 'scholar_advice_requires_moderation',
      citation_status: ev.citation_status,
    });
  }
  // Quran / Hadith / Quran+Hadith — eligible for publication after moderation.
  return Object.freeze({
    decision: 'queue_review',
    reason: 'public_publish_requires_moderation',
    citation_status: ev.citation_status,
  });
}
