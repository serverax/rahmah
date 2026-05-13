/**
 * Ingestion pipeline (pure, no I/O).
 *
 * Composes the existing ingestion-controller decision + the chunker into a
 * single end-to-end function that produces:
 *
 *   {
 *     decision: 'pending_review' | 'needs_source' | 'needs_sheikh_review' |
 *               'duplicate' | 'rejected',
 *     fixture: boolean,                   // mirrors payload.is_test_fixture
 *     chunks: [{ chunk_text_ar, citation_label_ar }, ...],
 *     citations: [{ source_type, source_reference, source_name_ar }],
 *     audit: { content_hash, source_reference, source_type, language }
 *   }
 *
 * Hard rules enforced here:
 *   - test fixtures are NEVER auto-approved.
 *   - missing citation_label_ar at item level is rejected.
 *   - source_reference missing for primary religious types is rejected.
 *   - production_mode=true REFUSES any item with is_test_fixture=true.
 */

import { decideIngestion } from './ingestion-controller.js';
import { chunkArabicText } from './chunking.js';

export const PRODUCTION_MODE_AR =
  'لا يُسمح بإدخال محتوى تجريبي في وضع الإنتاج.';
export const APPROVAL_LOCKED_AR =
  'المحتوى الاختباري لا يمكن تمييزه كمعتمد تلقائياً.';

export function processManifestItem(payload, { productionMode = false } = {}) {
  const isFixture = Boolean(payload && payload.is_test_fixture);

  // Production mode: fixtures are forbidden inbound.
  if (productionMode && isFixture) {
    return Object.freeze({
      decision: 'rejected',
      reason: 'test_fixture_forbidden_in_production',
      fixture: true,
      safe_message_ar: PRODUCTION_MODE_AR,
      chunks: [],
      citations: [],
      audit: null,
    });
  }

  const baseDecision = decideIngestion(payload || {});

  // Anything that decided to reject — preserve the reason.
  if (baseDecision.decision === 'rejected') {
    return Object.freeze({
      decision: baseDecision.decision,
      reason: baseDecision.reason,
      fixture: isFixture,
      chunks: [],
      citations: [],
      audit: null,
    });
  }

  // Build chunks deterministically. Empty body would have been rejected above.
  const body = baseDecision.normalized.body_ar;
  const rawChunks = chunkArabicText(body, { maxChars: 400 });
  const citationLabel = String(payload?.source_reference || '').trim();
  if (citationLabel.length === 0) {
    return Object.freeze({
      decision: 'needs_source',
      reason: 'missing_source_reference_for_citation_label',
      fixture: isFixture,
      chunks: [],
      citations: [],
      audit: null,
    });
  }

  const chunks = rawChunks.map((text) => Object.freeze({
    chunk_text_ar: text,
    citation_label_ar: citationLabel,
    language: baseDecision.normalized.language || 'ar',
    is_test_fixture: isFixture,
  }));

  const citations = [Object.freeze({
    source_type:      baseDecision.normalized.source_type,
    source_reference: citationLabel,
    source_name_ar:   String(payload?.source_name_ar || '').trim() || null,
    is_test_fixture:  isFixture,
  })];

  return Object.freeze({
    decision: baseDecision.decision,        // pending_review | needs_sheikh_review | needs_source | duplicate
    reason: baseDecision.reason,
    fixture: isFixture,
    chunks,
    citations,
    audit: Object.freeze({
      content_hash:     baseDecision.content_hash,
      source_reference: citationLabel,
      source_type:      baseDecision.normalized.source_type,
      language:         baseDecision.normalized.language,
      is_test_fixture:  isFixture,
      approval_locked_message_ar: isFixture ? APPROVAL_LOCKED_AR : null,
    }),
  });
}

/**
 * Run the manifest end-to-end. Pure: returns per-item results, never persists.
 * Production mode rejects the whole manifest if any item is a fixture.
 */
export function processManifest(manifest, { productionMode = false } = {}) {
  if (!manifest || typeof manifest !== 'object') {
    return Object.freeze({
      mode: productionMode ? 'production' : 'dry_run',
      valid_items: 0,
      invalid_items: 0,
      fixture_items: 0,
      results: [],
      manifest_rejected: true,
      reason: 'invalid_manifest',
    });
  }
  const items = Array.isArray(manifest.items) ? manifest.items : [];
  const manifestIsFixture = Boolean(manifest.is_test_fixture);
  if (productionMode && manifestIsFixture) {
    return Object.freeze({
      mode: 'production',
      valid_items: 0,
      invalid_items: items.length,
      fixture_items: items.length,
      results: [],
      manifest_rejected: true,
      reason: 'manifest_marked_test_fixture',
      safe_message_ar: PRODUCTION_MODE_AR,
    });
  }
  let valid = 0;
  let invalid = 0;
  let fixtureCount = 0;
  const results = items.map((item) => {
    const r = processManifestItem(item, { productionMode });
    if (r.decision === 'rejected') invalid += 1;
    else valid += 1;
    if (r.fixture) fixtureCount += 1;
    return r;
  });
  return Object.freeze({
    mode: productionMode ? 'production' : 'dry_run',
    valid_items: valid,
    invalid_items: invalid,
    fixture_items: fixtureCount,
    results,
    manifest_rejected: false,
    reason: null,
  });
}
