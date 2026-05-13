import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  processManifestItem,
  processManifest,
  PRODUCTION_MODE_AR,
  APPROVAL_LOCKED_AR,
} from '../src/rag/ingestion-pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const FIXTURE_MANIFEST = path.join(REPO_ROOT, 'data', 'islamic-sources', 'fixtures', 'fixture-manifest.json');

test('Sprint35 — fixture manifest exists on disk and is marked is_test_fixture: true', async () => {
  const raw = await fs.readFile(FIXTURE_MANIFEST, 'utf8');
  const obj = JSON.parse(raw);
  assert.equal(obj.is_test_fixture, true);
  assert.ok(Array.isArray(obj.items) && obj.items.length >= 2);
  for (const item of obj.items) {
    assert.equal(item.is_test_fixture, true);
    assert.equal(item.verification_status, 'pending_review');
    assert.equal(item.license_status, 'test_fixture');
  }
});

test('Sprint35 — fixture items are never auto-approved (stay in pending_review)', () => {
  const out = processManifestItem({
    source_type: 'azkar',
    body_ar: 'نص اختباري قابل للتقطيع وذو طول معقول لاختبار التقطيع.',
    title_ar: 'ذكر اختباري',
    source_reference: 'FIXTURE-AZKAR-001',
    source_name_ar: 'FIXTURE',
    language: 'ar',
    is_test_fixture: true,
  });
  assert.equal(out.fixture, true);
  assert.notEqual(out.decision, 'approved');
  assert.ok(['pending_review', 'needs_sheikh_review'].includes(out.decision));
  assert.equal(out.audit.approval_locked_message_ar, APPROVAL_LOCKED_AR);
  assert.ok(out.chunks.length >= 1);
  for (const c of out.chunks) {
    assert.equal(c.is_test_fixture, true);
    assert.equal(typeof c.citation_label_ar, 'string');
    assert.ok(c.citation_label_ar.length > 0);
  }
});

test('Sprint35 — production mode REFUSES fixture items', () => {
  const out = processManifestItem({
    source_type: 'azkar',
    body_ar: 'نص اختباري بطول كافٍ.',
    title_ar: 'ذكر اختباري',
    source_reference: 'FIXTURE-AZKAR-001',
    source_name_ar: 'FIXTURE',
    is_test_fixture: true,
  }, { productionMode: true });
  assert.equal(out.decision, 'rejected');
  assert.equal(out.reason, 'test_fixture_forbidden_in_production');
  assert.equal(out.safe_message_ar, PRODUCTION_MODE_AR);
});

test('Sprint35 — quran/hadith items without source_reference are rejected', () => {
  const out = processManifestItem({
    source_type: 'quran',
    body_ar: 'محتوى بدون مرجع كافٍ',
    title_ar: 'بدون مرجع',
    language: 'ar',
  });
  assert.notEqual(out.decision, 'pending_review');
  assert.ok(['needs_source', 'rejected'].includes(out.decision));
});

test('Sprint35 — empty body is rejected', () => {
  const out = processManifestItem({
    source_type: 'azkar',
    body_ar: '',
    source_reference: 'X',
  });
  assert.equal(out.decision, 'rejected');
});

test('Sprint35 — processManifest counts fixtures, dry-run mode', async () => {
  const raw = await fs.readFile(FIXTURE_MANIFEST, 'utf8');
  const manifest = JSON.parse(raw);
  const r = processManifest(manifest, { productionMode: false });
  assert.equal(r.mode, 'dry_run');
  assert.equal(r.manifest_rejected, false);
  assert.equal(r.fixture_items, manifest.items.length);
  assert.equal(r.valid_items, manifest.items.length);
  assert.equal(r.invalid_items, 0);
});

test('Sprint35 — processManifest refuses a fixture manifest in production mode', async () => {
  const raw = await fs.readFile(FIXTURE_MANIFEST, 'utf8');
  const manifest = JSON.parse(raw);
  const r = processManifest(manifest, { productionMode: true });
  assert.equal(r.mode, 'production');
  assert.equal(r.manifest_rejected, true);
  assert.equal(r.reason, 'manifest_marked_test_fixture');
  assert.equal(r.fixture_items, manifest.items.length);
  assert.equal(r.results.length, 0);
});

test('Sprint35 — chunks carry citation_label_ar from source_reference (no answer without citation)', () => {
  const out = processManifestItem({
    source_type: 'azkar',
    body_ar: 'نص طويل مكون من عدة جمل لإجبار آلية التقطيع. الجملة الثانية. الجملة الثالثة هنا.',
    title_ar: 'عنوان',
    source_reference: 'FIXTURE-CITE-LABEL',
    source_name_ar: 'FIXTURE',
    language: 'ar',
    is_test_fixture: true,
  });
  assert.ok(out.chunks.length >= 1);
  for (const c of out.chunks) {
    assert.equal(c.citation_label_ar, 'FIXTURE-CITE-LABEL');
    assert.equal(typeof c.chunk_text_ar, 'string');
    assert.ok(c.chunk_text_ar.length > 0);
  }
});
