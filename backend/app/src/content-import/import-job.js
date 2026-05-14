/**
 * content-import — import-job orchestrator (pure foundation).
 *
 * Holds no I/O. The host:
 *   1. loads a manifest (operator-supplied JSON);
 *   2. calls `processManifest(manifest)` here;
 *   3. uses the returned per-record decisions to write SQL via the
 *      repository layer (NOT in this module).
 *
 * No record reaches `approved` here. Approval is a separate operator-side
 * step on top of `verification_status = 'pending_review'` rows.
 *
 * NEVER fetches from the network.
 * NEVER reads from the file system.
 * NEVER imports religious text bodies — only metadata + checksums.
 */

import { validateSourceRecord } from './source-registry.js';

export function processManifest(manifest, { productionMode = true } = {}) {
  const items = Array.isArray(manifest?.items) ? manifest.items : [];
  const out = {
    mode: productionMode ? 'production' : 'dry_run',
    manifest_is_test_fixture: Boolean(manifest?.is_test_fixture),
    total_items: items.length,
    pending_review_items: 0,
    rejected_items: 0,
    fixture_items: 0,
    results: [],
  };

  // Operator may not slip a fixture manifest into production.
  if (productionMode && manifest?.is_test_fixture === true) {
    out.results.push({
      decision: 'rejected',
      reason: 'manifest_marked_test_fixture',
    });
    out.rejected_items = items.length;
    return out;
  }

  for (const raw of items) {
    if (raw && raw.is_test_fixture === true) {
      out.fixture_items += 1;
      if (productionMode) {
        out.rejected_items += 1;
        out.results.push({
          decision: 'rejected',
          reason: 'test_fixture_forbidden_in_production',
          source_reference: typeof raw.source_reference === 'string' ? raw.source_reference : null,
        });
        continue;
      }
    }
    const check = validateSourceRecord(raw);
    if (!check.ok) {
      out.rejected_items += 1;
      out.results.push({
        decision: 'rejected',
        reason: check.reason,
        field: check.field,
        source_reference: typeof raw?.source_reference === 'string' ? raw.source_reference : null,
      });
      continue;
    }
    // Valid records land in pending_review — never auto-approved here.
    out.pending_review_items += 1;
    out.results.push({
      decision: 'pending_review',
      reason: 'queued_for_operator_review',
      source_reference: raw.source_reference,
      source_type: raw.source_type,
      language: raw.language,
      content_hash: raw.content_hash,
    });
  }
  return out;
}
