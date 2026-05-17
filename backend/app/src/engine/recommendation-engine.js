/**
 * Recommendation engine — chooses what to surface on the home / child screens.
 *
 * Strict rules:
 *   - Only items with `verification_status === 'approved'` may be recommended.
 *   - For audience === 'child' or 'family', sensitive topics are filtered out.
 *   - If no candidates pass the gate, return an empty list — never invent.
 */

import { reviewGate } from './review-gate.js';
import { childContentGate } from './child-safety-gate.js';

const SENSITIVE_FOR_CHILD = new Set([
  'death', 'fitan', 'punishment', 'jihad',
  'detailed_aqidah_dispute', 'detailed_fiqh_dispute',
]);

export async function recommend({
  candidates = [],
  audience = 'adult',
  age_band = '7-9',
  limit = 6,
} = {}) {
  if (!Array.isArray(candidates)) return Object.freeze({ items: Object.freeze([]) });

  const n = Math.max(0, Math.min(20, Number(limit) | 0));
  const out = [];
  for (const c of candidates) {
    if (out.length >= n) break;
    if (!c || typeof c !== 'object') continue;
    const r = await reviewGate({ verification_status: c.verification_status });
    if (r.decision !== 'allow') continue;

    if (audience === 'child' || audience === 'family') {
      // Filter sensitive topics by tags.
      if (Array.isArray(c.topic_tags)) {
        let sensitive = false;
        for (const t of c.topic_tags) {
          if (SENSITIVE_FOR_CHILD.has(t)) { sensitive = true; break; }
        }
        if (sensitive) continue;
      }
      // Cheap text-level safety check when the candidate has body_ar.
      if (typeof c.body_ar === 'string' && c.body_ar.length > 0) {
        const ch = await childContentGate({
          body_ar: c.body_ar,
          age_band,
          topic_tags: c.topic_tags || [],
        });
        if (ch.decision !== 'allow') continue;
      }
    }
    out.push(Object.freeze({
      id: c.id || null,
      title_ar: c.title_ar || c.source_name_ar || '',
      category: c.category || c.source_type || 'general',
      kind: c.kind || c.source_type || 'general',
      verification_status: c.verification_status || 'unverified',
    }));
  }
  return Object.freeze({ items: Object.freeze(out) });
}
