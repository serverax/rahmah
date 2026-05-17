/**
 * fatwa-policy-gate runtime policy — deterministic JS port of
 * wasm/fatwa-policy-gate/src/lib.rs.
 */

/**
 * @param {{
 *   has_scholar_approval: boolean,
 *   has_verified_quran_or_hadith_citation: boolean,
 *   publication_mode_public: boolean
 * }} input
 * @returns {{decision: string, reason: string|null}}
 */
export function evaluate(input) {
  const {
    has_scholar_approval = false,
    has_verified_quran_or_hadith_citation = false,
    publication_mode_public = false,
  } = input || {};

  // Public publication path: must have BOTH scholar approval AND
  // verified Quran/Hadith citation.
  if (publication_mode_public) {
    if (!has_scholar_approval) {
      return {
        decision: 'block',
        reason: 'public_fatwa_requires_scholar_approval',
      };
    }
    if (!has_verified_quran_or_hadith_citation) {
      return {
        decision: 'block',
        reason: 'public_fatwa_requires_quran_or_hadith_citation',
      };
    }
    return {
      decision: 'allow_publish',
      reason: 'approved_and_cited',
    };
  }

  // Private path: at least one citation is required.
  if (has_verified_quran_or_hadith_citation) {
    return {
      decision: 'allow_publish',
      reason: 'private_answer_with_citation',
    };
  }

  return {
    decision: 'needs_scholar_review',
    reason: 'private_answer_without_quran_or_hadith_citation',
  };
}
