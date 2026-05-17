/**
 * citation-policy-service — pure decision helpers for the Sheikh
 * workflow's citation gate.
 *
 * Wraps the existing evaluateCitationRequirement and surfaces a single
 * publish-eligibility decision the route can use.
 */

import { evaluateCitationRequirement as localEvaluate } from '../sheikh/citation-requirement.js';
import { callWasmBridge } from '../safety/internal-wasm-client.js';

export async function evaluatePublishEligibility(citations, { publication_mode = 'public' } = {}) {
  const wasmUrl = process.env.WASM_QURAN_HADITH_CITATION_URL;
  let decision;

  if (wasmUrl) {
    const res = await callWasmBridge(wasmUrl, '/evaluate', citations || []);
    if (res.ok && res.citation_status) {
      decision = res;
    }
  }

  if (!decision) {
    decision = localEvaluate(citations || []);
  }

  // Align with sheikh-answer-policy.js:
  // - Private: allowed if not insufficient.
  // - Public: allowed if not insufficient (routes to moderation).
  const allowed = decision.citation_status !== 'insufficient_citation';

  return Object.freeze({
    allowed,
    citation_status: decision.citation_status,
    reason: decision.reason,
  });
}
