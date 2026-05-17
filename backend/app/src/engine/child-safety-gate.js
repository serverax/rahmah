/**
 * Engine child-safety gate. Reuses the `evaluateChildContent` policy from
 * Sprint 12 so the engine and the family route module agree on the rules.
 */

import {
  evaluateChildContent as localEvaluateChildContent,
  evaluateChildProfileField as localEvaluateChildProfileField,
} from '../family/child-safety-policy.js';
import { callWasmBridge } from '../safety/internal-wasm-client.js';

export async function childContentGate({ body_ar, age_band = '7-9', topic_tags = [] } = {}) {
  // If WASM bridge is configured, try it first.
  if (process.env.WASM_CHILD_SAFETY_URL) {
    const wasmUrl = process.env.WASM_CHILD_SAFETY_URL;
    const res = await callWasmBridge(wasmUrl, '/evaluate', { body_ar, age_band, topic_tags });
    if (res.ok && res.decision) {
      return Object.freeze({
        decision: res.decision,
        reason: res.reason || null,
        sensitive_topic: res.sensitive_topic,
      });
    }
    // If bridge fails, fall back to local JS for determinism (honest fallback).
  }

  const e = localEvaluateChildContent({ body_ar, age_band, topic_tags });
  if (e.decision === 'allow') {
    return Object.freeze({ decision: 'allow', reason: null });
  }
  return Object.freeze({ decision: 'block', reason: e.reason });
}

export async function childProfileGate({ nickname_ar, age_band } = {}) {
  if (process.env.WASM_CHILD_SAFETY_URL) {
    const wasmUrl = process.env.WASM_CHILD_SAFETY_URL;
    const resN = await callWasmBridge(wasmUrl, '/evaluate-profile-field', { field: 'nickname_ar', value: nickname_ar });
    if (resN.ok && resN.decision === 'block') return Object.freeze({ decision: 'block', reason: resN.reason });

    const resA = await callWasmBridge(wasmUrl, '/evaluate-profile-field', { field: 'age_band', value: age_band });
    if (resA.ok && resA.decision === 'block') return Object.freeze({ decision: 'block', reason: resA.reason });

    if (resN.ok && resA.ok) return Object.freeze({ decision: 'allow', reason: null });
    // Fall back if bridge fails.
  }

  const n = localEvaluateChildProfileField({ field: 'nickname_ar', value: nickname_ar });
  if (n.decision !== 'allow') return Object.freeze({ decision: 'block', reason: n.reason });
  const a = localEvaluateChildProfileField({ field: 'age_band', value: age_band });
  if (a.decision !== 'allow') return Object.freeze({ decision: 'block', reason: a.reason });
  return Object.freeze({ decision: 'allow', reason: null });
}
