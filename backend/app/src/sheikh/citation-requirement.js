/**
 * Citation requirement policy for Sheikh Hasan answers.
 *
 * This module is the single point of truth for:
 *   - Whether a list of citations is "sufficient" for public publication.
 *   - What citation_status enum value to persist on an answer.
 *
 * Public publication rules:
 *   - At least one citation of type 'quran' OR 'hadith' OR 'fiqh' must exist.
 *   - 'scholar_note' alone is NOT sufficient → routes through moderation
 *      with citation_status = 'scholar_advice_needs_review'.
 *   - Empty / null / non-array citations → 'insufficient_citation' and
 *      route refuses to mark the answer for publication.
 *   - Citations with empty `citation_label` are rejected at the schema layer
 *     (route-level), but defense-in-depth: this module ignores empty labels.
 */

export const CITATION_TYPES = Object.freeze(['quran', 'hadith', 'fiqh', 'scholar_note']);

export function normalizeCitations(citations) {
  if (!Array.isArray(citations)) return [];
  const out = [];
  for (const c of citations) {
    if (!c || typeof c !== 'object') continue;
    const type = typeof c.citation_type === 'string' ? c.citation_type : '';
    if (!CITATION_TYPES.includes(type)) continue;
    const label = typeof c.citation_label === 'string' ? c.citation_label.trim() : '';
    if (label.length === 0) continue;
    const text = typeof c.citation_text === 'string' ? c.citation_text.trim() : null;
    const url = typeof c.citation_url === 'string' ? c.citation_url.trim() : null;
    out.push({
      citation_type: type,
      citation_label: label,
      citation_text: text && text.length ? text : null,
      citation_url: url && url.length ? url : null,
    });
  }
  return out;
}

/**
 * Evaluate the citation list and return the resulting citation_status enum
 * plus a publication eligibility decision. Output shape is intentionally
 * narrow so callers can persist it directly.
 *
 *   { citation_status, can_publish_public, can_publish_private, reason }
 *
 *  - can_publish_public:
 *      true  for quran_cited / hadith_cited / quran_and_hadith_cited (subject
 *            to moderator approval — that gate lives in the route).
 *      false for scholar_advice_needs_review and insufficient_citation.
 *  - can_publish_private:
 *      true for everything EXCEPT insufficient_citation. A private answer
 *      must still have at least one citation or scholar_note; an empty list
 *      is treated as insufficient_citation in both modes.
 */
export function evaluateCitationRequirement(citations) {
  const cs = normalizeCitations(citations);
  const types = new Set(cs.map((c) => c.citation_type));

  const hasQuran = types.has('quran');
  const hasHadith = types.has('hadith');
  const hasFiqh = types.has('fiqh');
  const hasScholar = types.has('scholar_note');

  if (cs.length === 0) {
    return Object.freeze({
      citation_status: 'insufficient_citation',
      can_publish_public: false,
      can_publish_private: false,
      reason: 'no_citations_provided',
    });
  }

  if (hasQuran && hasHadith) {
    return Object.freeze({
      citation_status: 'quran_and_hadith_cited',
      can_publish_public: true,
      can_publish_private: true,
      reason: null,
    });
  }
  if (hasQuran) {
    return Object.freeze({
      citation_status: 'quran_cited',
      can_publish_public: true,
      can_publish_private: true,
      reason: null,
    });
  }
  if (hasHadith) {
    return Object.freeze({
      citation_status: 'hadith_cited',
      can_publish_public: true,
      can_publish_private: true,
      reason: null,
    });
  }
  if (hasFiqh) {
    // Fiqh-only is treated as a recognised secondary citation — eligible for
    // moderation review but not auto-publishable.
    return Object.freeze({
      citation_status: 'scholar_advice_needs_review',
      can_publish_public: false,
      can_publish_private: true,
      reason: 'fiqh_only_requires_moderation',
    });
  }
  if (hasScholar) {
    return Object.freeze({
      citation_status: 'scholar_advice_needs_review',
      can_publish_public: false,
      can_publish_private: true,
      reason: 'scholar_note_only_requires_moderation',
    });
  }
  // Shouldn't reach here because normalizeCitations already drops unknown
  // types, but defense-in-depth keeps the fail-closed default.
  return Object.freeze({
    citation_status: 'insufficient_citation',
    can_publish_public: false,
    can_publish_private: false,
    reason: 'unknown_citation_types_only',
  });
}
