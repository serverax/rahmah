/**
 * quran-hadith-citation runtime policy — deterministic JS port of
 * wasm/quran-hadith-citation/src/lib.rs.
 */

export const CITATION_TYPES = Object.freeze(['quran', 'hadith', 'fiqh', 'scholar_note']);

export function normalize(citations) {
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

export function evaluate(citations) {
  const cs = normalize(citations);
  const types = new Set(cs.map((c) => c.citation_type));

  const hasQuran = types.has('quran');
  const hasHadith = types.has('hadith');
  const hasFiqh = types.has('fiqh');
  const hasScholar = types.has('scholar_note');

  if (cs.length === 0) {
    return {
      citation_status: 'insufficient_citation',
      can_publish_public: false,
      can_publish_private: false,
      reason: 'no_citations_provided',
    };
  }

  if (hasQuran && hasHadith) {
    return {
      citation_status: 'quran_and_hadith_cited',
      can_publish_public: true,
      can_publish_private: true,
      reason: null,
    };
  }
  if (hasQuran) {
    return {
      citation_status: 'quran_cited',
      can_publish_public: true,
      can_publish_private: true,
      reason: null,
    };
  }
  if (hasHadith) {
    return {
      citation_status: 'hadith_cited',
      can_publish_public: true,
      can_publish_private: true,
      reason: null,
    };
  }
  if (hasFiqh) {
    return {
      citation_status: 'scholar_advice_needs_review',
      can_publish_public: false,
      can_publish_private: true,
      reason: 'fiqh_only_requires_moderation',
    };
  }
  if (hasScholar) {
    return {
      citation_status: 'scholar_advice_needs_review',
      can_publish_public: false,
      can_publish_private: true,
      reason: 'scholar_note_only_requires_moderation',
    };
  }
  return {
    citation_status: 'insufficient_citation',
    can_publish_public: false,
    can_publish_private: false,
    reason: 'unknown_citation_types_only',
  };
}
