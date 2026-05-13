import { ALLOWED_CATEGORIES, CATEGORY_KEYWORDS } from './allowed-categories.js';

/**
 * Coarse keyword-based classifier.
 * Returns { inScope, category, displayName }.
 * inScope is true ONLY if at least one allowed-category keyword appears.
 */
export function classify(question) {
  if (typeof question !== 'string' || question.trim().length === 0) {
    return { inScope: false, category: null, displayName: null };
  }
  let bestSlug = null;
  let bestScore = 0;
  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (question.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestSlug = slug;
    }
  }
  if (bestSlug === null) {
    return { inScope: false, category: null, displayName: null };
  }
  return {
    inScope: true,
    category: bestSlug,
    displayName: ALLOWED_CATEGORIES[bestSlug],
  };
}
