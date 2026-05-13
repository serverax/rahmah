/**
 * Wraps the Sprint 10 ingestion controller behind a single engine entry-point.
 * Adds the engine-level decision codes so the upstream router can stay
 * uniform across all event types.
 */

import { decideIngestion } from '../rag/ingestion-controller.js';

export function ingestionDecide(payload, opts = {}) {
  const r = decideIngestion(payload, opts);
  if (r.decision === 'rejected') {
    return Object.freeze({
      decision: 'block',
      reason: r.reason,
      content_hash: r.content_hash,
      normalized: r.normalized,
    });
  }
  if (r.decision === 'needs_source') {
    return Object.freeze({
      decision: 'needs_source',
      reason: r.reason,
      content_hash: r.content_hash,
      normalized: r.normalized,
    });
  }
  if (r.decision === 'duplicate') {
    return Object.freeze({
      decision: 'block',
      reason: r.reason,
      content_hash: r.content_hash,
      normalized: r.normalized,
    });
  }
  // pending_review / needs_sheikh_review → queue_review at engine level.
  return Object.freeze({
    decision: 'queue_review',
    reason: r.reason,
    content_hash: r.content_hash,
    normalized: r.normalized,
  });
}
