import { callWasmBridge } from '../safety/internal-wasm-client.js';

/**
 * Engine review gate — wraps `verification_status` for any new content row.
 *
 * Integrated with WASM content-rule-engine for visibility flags.
 */
export async function reviewGate({
  verification_status,
  has_citation = true, // Default to true for legacy compatibility
  is_published = true,
  is_test_fixture = false,
} = {}) {
  const wasmUrl = process.env.WASM_CONTENT_RULE_ENGINE_URL;
  let vis;

  if (wasmUrl) {
    const res = await callWasmBridge(wasmUrl, '/evaluate', {
      verification_status: verification_status || 'unverified',
      has_citation,
      is_published,
      is_test_fixture,
    });
    if (res.ok && res.reason) {
      vis = res;
    }
  }

  // Local fallback logic (parity with wasm/content-rule-engine/src/lib.rs).
  if (!vis) {
    const v = typeof verification_status === 'string' ? verification_status : 'unverified';
    if (is_test_fixture) {
      vis = { show_in_public_list: false, public_visible: false, reason: 'test_fixture_hidden_from_public' };
    } else if (v === 'approved') {
      if (!has_citation) {
        vis = { show_in_public_list: false, public_visible: false, reason: 'missing_citation' };
      } else if (!is_published) {
        vis = { show_in_public_list: false, public_visible: false, reason: 'not_published' };
      } else {
        vis = { show_in_public_list: true, public_visible: true, reason: 'approved_published_with_citation' };
      }
    } else if (v === 'rejected') {
      vis = { show_in_public_list: false, public_visible: false, reason: 'content_rejected_by_review' };
    } else {
      vis = { show_in_public_list: false, public_visible: false, reason: 'awaiting_review' };
    }
  }

  // Map visibility flags to engine decision.
  const decision = vis.public_visible ? 'allow' : (vis.reason === 'awaiting_review' ? 'queue_review' : 'block');

  return Object.freeze({
    decision,
    reason: vis.reason,
    visibility: Object.freeze(vis),
  });
}
