import { createSourceRepository } from '../sources/source-repository.js';
import { _setRetrievalConfigured } from './source-store-status.js';

/**
 * Source store wrapper.
 *
 * Defaults to **fail-closed**: with no injected repository (the production
 * path until DB wiring lands), `lookupSources` always returns `[]`. That
 * causes /api/ibadat/ask to respond with the blocked fallback — by design.
 *
 * When a repository is injected (e.g. in a future sprint, with a real pg
 * pool wired in), lookups are delegated. Even then the citation validator
 * gates the response; this module only surfaces candidates.
 *
 * NEVER fabricates sources. NEVER returns pending/rejected entries.
 */

let _repository = null;

export function configureSourceStore({ repository = null } = {}) {
  _repository = repository;
  _setRetrievalConfigured(Boolean(repository));
}

/**
 * Replace the active store-level repository with one backed by a pg pool.
 * Convenience helper for app wiring. Pass `{ pool: null }` to clear.
 */
export function configureSourceStoreWithPool({ pool } = {}) {
  _repository = pool ? createSourceRepository({ pool }) : null;
  _setRetrievalConfigured(Boolean(_repository));
}

export async function lookupSources(question, categorySlug, language = 'ar', limit = 4) {
  if (!_repository) return [];
  try {
    const candidates = await _repository.lookupVerifiedSources({
      question,
      scope: categorySlug,
      language,
      limit,
    });
    if (!Array.isArray(candidates)) return [];
    // Defense in depth — never surface pending/rejected even if repo lies.
    return candidates.filter(
      (c) => c && (c.verification_status === undefined || c.verification_status === 'approved'),
    );
  } catch {
    return [];
  }
}

/** Test-only reset. */
export function _resetSourceStoreForTests() {
  _repository = null;
  _setRetrievalConfigured(false);
}
