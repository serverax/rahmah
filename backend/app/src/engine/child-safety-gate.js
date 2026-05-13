/**
 * Engine child-safety gate. Reuses the `evaluateChildContent` policy from
 * Sprint 12 so the engine and the family route module agree on the rules.
 */

import {
  evaluateChildContent,
  evaluateChildProfileField,
} from '../family/child-safety-policy.js';

export function childContentGate({ body_ar, age_band = '7-9', topic_tags = [] } = {}) {
  const e = evaluateChildContent({ body_ar, age_band, topic_tags });
  if (e.decision === 'allow') {
    return Object.freeze({ decision: 'allow', reason: null });
  }
  return Object.freeze({ decision: 'block', reason: e.reason });
}

export function childProfileGate({ nickname_ar, age_band } = {}) {
  const n = evaluateChildProfileField({ field: 'nickname_ar', value: nickname_ar });
  if (n.decision !== 'allow') return Object.freeze({ decision: 'block', reason: n.reason });
  const a = evaluateChildProfileField({ field: 'age_band', value: age_band });
  if (a.decision !== 'allow') return Object.freeze({ decision: 'block', reason: a.reason });
  return Object.freeze({ decision: 'allow', reason: null });
}
