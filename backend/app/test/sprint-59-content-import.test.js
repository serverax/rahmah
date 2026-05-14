import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSourceRecord, ALLOWED_SOURCE_TYPES } from '../src/content-import/source-registry.js';
import { processManifest } from '../src/content-import/import-job.js';

function sample(over = {}) {
  return {
    source_type: 'dua',
    source_name_ar: 'حصن المسلم',
    source_reference: 'Hisn / Morning Adhkar',
    license_id: 'lic-1',
    language: 'ar',
    content_hash: 'a'.repeat(64),
    verification_status: 'pending_review',
    ...over,
  };
}

test('Sprint59 — validate: accepted minimal record', () => {
  const r = validateSourceRecord(sample());
  assert.equal(r.ok, true);
});

test('Sprint59 — validate: rejects invalid source_type', () => {
  const r = validateSourceRecord(sample({ source_type: 'fake' }));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'invalid_source_type');
});

test('Sprint59 — validate: rejects missing source_name_ar', () => {
  const r = validateSourceRecord(sample({ source_name_ar: '' }));
  assert.equal(r.reason, 'missing_source_name_ar');
});

test('Sprint59 — validate: rejects missing source_reference', () => {
  const r = validateSourceRecord(sample({ source_reference: '' }));
  assert.equal(r.reason, 'missing_source_reference');
});

test('Sprint59 — validate: rejects missing license_id', () => {
  const r = validateSourceRecord(sample({ license_id: '' }));
  assert.equal(r.reason, 'missing_license_id');
});

test('Sprint59 — validate: rejects bad content_hash', () => {
  const r = validateSourceRecord(sample({ content_hash: 'not-hex' }));
  assert.equal(r.reason, 'invalid_content_hash');
});

test('Sprint59 — validate: hadith without authenticity_note_ar is rejected', () => {
  const r = validateSourceRecord(sample({ source_type: 'hadith' }));
  assert.equal(r.reason, 'missing_authenticity_note_ar');
});

test('Sprint59 — validate: inbound row CANNOT arrive as approved', () => {
  const r = validateSourceRecord(sample({ verification_status: 'approved' }));
  assert.equal(r.reason, 'invalid_inbound_verification_status');
});

test('Sprint59 — processManifest: production mode refuses fixture manifest', () => {
  const out = processManifest({
    is_test_fixture: true,
    items: [sample(), sample()],
  }, { productionMode: true });
  assert.equal(out.rejected_items, 2);
  assert.equal(out.results[0].reason, 'manifest_marked_test_fixture');
});

test('Sprint59 — processManifest: per-item rejection accumulates', () => {
  const out = processManifest({
    items: [
      sample(),
      sample({ source_type: 'fake' }),
      sample({ content_hash: 'bad' }),
      sample({ is_test_fixture: true }),
    ],
  }, { productionMode: true });
  assert.equal(out.pending_review_items, 1);
  assert.equal(out.rejected_items, 3);
  assert.equal(out.fixture_items, 1);
});

test('Sprint59 — processManifest: NEVER promotes to approved', () => {
  const out = processManifest({
    items: [sample(), sample({ source_type: 'azkar', source_reference: 'X' })],
  }, { productionMode: true });
  for (const r of out.results) {
    assert.notEqual(r.decision, 'approved');
  }
});

test('Sprint59 — ALLOWED_SOURCE_TYPES mirrors migration 004 enum', () => {
  for (const expected of ['quran', 'hadith', 'dua', 'azkar', 'seerah', 'fiqh_note', 'sheikh_answer', 'child_content']) {
    assert.ok(ALLOWED_SOURCE_TYPES.includes(expected));
  }
});
