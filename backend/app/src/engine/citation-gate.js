/**
 * Engine citation gate. Reuses the citation-requirement policy from Sprint 3
 * so there is a single source of truth for "what counts as a valid citation".
 */

import { evaluateCitationRequirement as localEvaluate } from '../sheikh/citation-requirement.js';
import { callWasmBridge } from '../safety/internal-wasm-client.js';

export async function citationGate({ answer_text, citations } = {}) {
  if (typeof answer_text !== 'string' || answer_text.trim().length === 0) {
    return Object.freeze({
      decision: 'block',
      reason: 'empty_answer_text',
      citation_status: 'insufficient_citation',
    });
  }

  const wasmUrl = process.env.WASM_QURAN_HADITH_CITATION_URL;
  let ev;

  if (wasmUrl) {
    const res = await callWasmBridge(wasmUrl, '/evaluate', citations || []);
    if (res.ok && res.citation_status) {
      ev = res;
    }
  }

  if (!ev) {
    ev = localEvaluate(citations);
  }

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
