/**
 * Sheikh Hasan answer publication policy.
 *
 * Encapsulates the rules that decide what publication_status an answer is
 * allowed to transition to, given:
 *   - the citation evaluation result (from citation-requirement.js), AND
 *   - the requested publication_mode ('private' | 'public'), AND
 *   - the answer body content.
 *
 * The policy is the single source of truth for "what publication_status do
 * we persist on this answer", and the matching reason code.
 */

import { evaluatePublishEligibility } from '../services/citation-policy-service.js';

const ALLOWED_PUBLICATION_MODES = new Set(['private', 'public']);

/**
 * @param {object} input
 * @param {string} input.answer_text     scholar's answer
 * @param {Array}  input.citations       citation rows (raw, will be normalized)
 * @param {string} input.publication_mode  'private' | 'public'
 *
 * @returns {Promise<{
 *   allowed: boolean,
 *   citation_status: string,
 *   publication_status: string,
 *   reason: string|null
 * }>}
 */
export async function decideAnswerPublication({
  answer_text,
  citations,
  publication_mode,
} = {}) {
  if (typeof answer_text !== 'string' || answer_text.trim().length === 0) {
    return Object.freeze({
      allowed: false,
      citation_status: 'insufficient_citation',
      publication_status: 'draft',
      reason: 'empty_answer_text',
    });
  }
  if (!ALLOWED_PUBLICATION_MODES.has(publication_mode)) {
    return Object.freeze({
      allowed: false,
      citation_status: 'insufficient_citation',
      publication_status: 'draft',
      reason: 'invalid_publication_mode',
    });
  }

  const cite = await evaluatePublishEligibility(citations, { publication_mode });

  // Private path: must have at least one citation of any allowed type.
  if (publication_mode === 'private') {
    if (!cite.allowed) {
      return Object.freeze({
        allowed: false,
        citation_status: cite.citation_status,
        publication_status: 'draft',
        reason: cite.reason || 'private_publish_requires_citation',
      });
    }
    return Object.freeze({
      allowed: true,
      citation_status: cite.citation_status,
      publication_status: 'answered_private',
      reason: null,
    });
  }

  // Public path: must have Quran/Hadith. Anything else routes to moderation.
  if (!cite.allowed) {
    return Object.freeze({
      allowed: false,
      citation_status: cite.citation_status,
      publication_status: 'draft',
      reason: cite.reason || 'public_publish_requires_citation',
    });
  }

  return Object.freeze({
    allowed: true,
    citation_status: cite.citation_status,
    publication_status: 'pending_moderation',
    reason: null,
  });
}

/**
 * Decide whether a moderator may flip a sheikh answer from pending_moderation
 * → published_public. The strict rule is: only quran_cited / hadith_cited /
 * quran_and_hadith_cited can become published_public on the public Q&A page.
 * scholar_advice_needs_review answers require an explicit override (the
 * moderation route includes that override path, not this helper).
 */
export function decideModeratorPublish({ citation_status, publication_status } = {}) {
  if (publication_status !== 'pending_moderation') {
    return Object.freeze({ allowed: false, reason: 'not_in_pending_moderation' });
  }
  if (
    citation_status === 'quran_cited' ||
    citation_status === 'hadith_cited' ||
    citation_status === 'quran_and_hadith_cited'
  ) {
    return Object.freeze({ allowed: true, reason: null });
  }
  return Object.freeze({
    allowed: false,
    reason: 'citation_status_requires_explicit_override',
  });
}

/**
 * Public summary fields exposed by the public-qa route. Any field not listed
 * here MUST NOT appear in a public response. This function is the contract
 * used by tests asserting "no private identity leaks".
 */
export function publicAnswerProjection(row) {
  if (!row || typeof row !== 'object') return null;
  return Object.freeze({
    slug:           row.slug || null,
    title:          row.title || null,
    language:       row.language || null,
    category:       row.category || null,
    answer_text:    row.answer_text || '',
    citations:      Array.isArray(row.citations) ? row.citations.map(publicCitationProjection) : [],
    sheikh_name:    row.sheikh_name || 'Sheikh Hasan',
    published_at:   row.published_at || null,
  });
}

export function publicCitationProjection(c) {
  if (!c || typeof c !== 'object') return null;
  return Object.freeze({
    citation_type:        c.citation_type || null,
    citation_label:       c.citation_label || null,
    citation_text:        c.citation_text || null,
    citation_url:         c.citation_url || null,
    verification_status:  c.verification_status || 'pending',
  });
}
