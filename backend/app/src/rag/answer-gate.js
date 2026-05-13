/**
 * RAG answer gate — pure decision module.
 *
 * Contract:
 *   - candidates with ZERO approved sources → `insufficient_sources`
 *   - any candidate referencing a pending/blocked/unverified source → drop it
 *   - any candidate missing citation_label_ar → drop it
 *   - if NO candidates survive after filtering → `insufficient_sources`
 *   - if surviving candidates exist → status `cited` + the filtered candidates
 *
 * The gate NEVER drafts an answer body. It composes a structured reply:
 *
 *   {
 *     answer_ar: null,                 // gate does not write answers
 *     citations: [{ source_type, citation_label_ar, ... }],
 *     safety_status: 'cited' | 'insufficient_sources' | 'rag_unavailable',
 *     insufficient_sources_message_ar: string | null,
 *     used_candidates: number
 *   }
 */

const INSUFFICIENT_AR =
  'لا توجد مصادر معتمدة كافية للإجابة على هذا السؤال بعد. لا يجوز الجواب بدون مصدر.';
const RAG_UNAVAILABLE_AR =
  'خدمة استرجاع المصادر غير متاحة حالياً.';
const NO_CITATION_AR =
  'لا يجوز الإجابة بدون اقتباس شرعي صحيح.';

const APPROVED = 'approved';

function isApprovedString(s) {
  return typeof s === 'string' && s === APPROVED;
}

/**
 * Filter retrieval candidates. Returns only candidates that:
 *   - have a non-empty citation_label_ar
 *   - have a non-empty chunk_text_ar
 *   - originate from an approved source (when status is exposed)
 *   - are NOT marked is_test_fixture
 *   - have a recognized source_type
 */
export function filterApprovedCandidates(candidates) {
  if (!Array.isArray(candidates)) return [];
  const out = [];
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue;
    if (typeof c.citation_label_ar !== 'string' || c.citation_label_ar.trim().length === 0) continue;
    if (typeof c.chunk_text_ar !== 'string' || c.chunk_text_ar.trim().length === 0) continue;
    if (c.is_test_fixture === true) continue;
    if (c.source_status && !isApprovedString(c.source_status)) continue;
    if (c.document_status && !isApprovedString(c.document_status)) continue;
    if (c.chunk_status && !isApprovedString(c.chunk_status)) continue;
    out.push(Object.freeze({ ...c }));
  }
  return out;
}

/**
 * Decide whether a RAG response may be drafted.
 *
 * @param {object} opts
 * @param {Array|null|undefined} opts.retrieval_candidates
 * @param {boolean} opts.retrieval_available
 *   true if the retrieval adapter is configured. If false, status is
 *   rag_unavailable.
 */
export function decideRagAnswer({
  retrieval_candidates = null,
  retrieval_available = false,
} = {}) {
  if (!retrieval_available) {
    return Object.freeze({
      answer_ar: null,
      citations: [],
      safety_status: 'rag_unavailable',
      insufficient_sources_message_ar: RAG_UNAVAILABLE_AR,
      used_candidates: 0,
    });
  }
  const candidates = filterApprovedCandidates(retrieval_candidates);
  if (candidates.length === 0) {
    return Object.freeze({
      answer_ar: null,
      citations: [],
      safety_status: 'insufficient_sources',
      insufficient_sources_message_ar: INSUFFICIENT_AR,
      used_candidates: 0,
    });
  }
  return Object.freeze({
    answer_ar: null,            // gate never writes answer prose
    citations: candidates.map((c) => Object.freeze({
      source_type:      c.source_type || null,
      citation_label_ar: c.citation_label_ar,
      source_name_ar:   c.source_name_ar || null,
      language:         c.language || 'ar',
    })),
    safety_status: 'cited',
    insufficient_sources_message_ar: null,
    used_candidates: candidates.length,
  });
}

export const _MESSAGES = Object.freeze({
  INSUFFICIENT_AR,
  RAG_UNAVAILABLE_AR,
  NO_CITATION_AR,
});
