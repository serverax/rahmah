import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildApp } from '../src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, '..', '..', '..');

test('S28: data/islamic-sources/{README, REVIEW_POLICY, starter-categories, manifest.example, sample-manifest.test} exist', async () => {
  for (const f of [
    'README.md',
    'REVIEW_POLICY.md',
    'starter-categories.json',
    'manifest.example.json',
    'sample-manifest.test.json',
  ]) {
    await fs.stat(path.join(REPO, 'data', 'islamic-sources', f));
  }
});

test('S28: starter-categories.json declares the seven canonical Arabic categories', async () => {
  const text = await fs.readFile(path.join(REPO, 'data', 'islamic-sources', 'starter-categories.json'), 'utf8');
  const obj = JSON.parse(text);
  assert.equal(obj.categories.length, 7);
  for (const c of obj.categories) {
    assert.ok(/[ء-ي]/.test(c.title_ar), `${c.id} title_ar must be Arabic`);
  }
});

test('S28: sample-manifest.test.json marked TEST DATA ONLY and pending_review only', async () => {
  const text = await fs.readFile(path.join(REPO, 'data', 'islamic-sources', 'sample-manifest.test.json'), 'utf8');
  assert.ok(text.includes('TEST DATA ONLY'));
  const obj = JSON.parse(text);
  for (const it of obj.items) {
    assert.equal(it.verification_status, 'pending_review');
    assert.ok(!/[Aa]pproved/.test(JSON.stringify(it)));
  }
});

test('S28: manifest validator (dry-run) accepts the sample manifest with zero invalid items', async () => {
  const r = spawnSync(process.execPath, [
    path.join(REPO, 'scripts', 'rag', 'validate-source-manifest.js'),
    path.join(REPO, 'data', 'islamic-sources', 'sample-manifest.test.json'),
    '--dry-run',
  ], { encoding: 'utf8' });
  assert.equal(r.status, 0, `validator failed: ${r.stderr}\n${r.stdout}`);
  const report = JSON.parse(r.stdout);
  assert.equal(report.mode, 'dry_run');
  assert.equal(report.invalid, 0);
  assert.ok(report.would_create >= 2);
});

test('S28: validator rejects an "approved" manifest entry that lacks reviewer_email_hash', async () => {
  const tmpDir = await fs.mkdtemp(path.join(REPO, '.tmp-rag-test-'));
  const file = path.join(tmpDir, 'bad.json');
  await fs.writeFile(file, JSON.stringify({
    manifest_version: '1.0.0',
    language: 'ar',
    items: [{
      source_type: 'azkar',
      source_name_ar: 'بيانات اختبار',
      source_reference: 'مرجع اختبار',
      title_ar: 'عنوان اختبار',
      body_ar: 'نص اختباري عربي.',
      language: 'ar',
      license_status: 'permitted',
      verification_status: 'approved',
      // No reviewer_email_hash — must be rejected.
    }],
  }));
  try {
    const r = spawnSync(process.execPath, [
      path.join(REPO, 'scripts', 'rag', 'validate-source-manifest.js'),
      file,
    ], { encoding: 'utf8' });
    assert.equal(r.status, 1, 'validator must exit non-zero on invalid items');
    const report = JSON.parse(r.stdout);
    assert.equal(report.invalid, 1);
    assert.ok(report.errors[0].errors.some((e) => e.includes('reviewer_email_hash')));
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('S28: validator detects duplicate (source_type + title_ar + source_reference)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(REPO, '.tmp-rag-test-'));
  const file = path.join(tmpDir, 'dup.json');
  const item = {
    source_type: 'dua',
    source_name_ar: 'بيانات اختبار',
    source_reference: 'مرجع تكرار',
    title_ar: 'عنوان مكرر',
    body_ar: 'نص اختباري عربي.',
    language: 'ar',
    license_status: 'permitted',
    verification_status: 'pending_review',
    reviewer_email_hash: null,
  };
  await fs.writeFile(file, JSON.stringify({
    manifest_version: '1.0.0', language: 'ar', items: [item, item],
  }));
  try {
    const r = spawnSync(process.execPath, [
      path.join(REPO, 'scripts', 'rag', 'validate-source-manifest.js'),
      file,
    ], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    const report = JSON.parse(r.stdout);
    assert.equal(report.invalid, 1);
    assert.ok(report.errors[0].errors.some((e) => e.includes('duplicate')));
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('S28: --apply refused without DATABASE_URL', async () => {
  const prev = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const r = spawnSync(process.execPath, [
      path.join(REPO, 'scripts', 'rag', 'validate-source-manifest.js'),
      path.join(REPO, 'data', 'islamic-sources', 'sample-manifest.test.json'),
      '--apply',
    ], { encoding: 'utf8', env: { ...process.env } });
    assert.notEqual(r.status, 0);
    assert.ok(r.stderr.includes('--apply refused') || r.stdout.includes('apply_refused'));
  } finally {
    if (prev !== undefined) process.env.DATABASE_URL = prev;
  }
});

test('S28: /api/rag/status reports ingestion_supported=true + seed_policy_exists=true', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/rag/status' });
    const body = res.json();
    assert.equal(body.ingestion_supported, true);
    assert.equal(body.seed_policy_exists, true);
    // No fake claims about active RAG.
    assert.equal(body.safe_to_answer_from_rag, false);
    assert.equal(body.approved_sources, 0);
  } finally {
    await app.close();
  }
});

test('S28: no "complete Quran database" or "complete Hadith database" claims', async () => {
  const dirs = ['backend', 'apps', 'data', 'scripts', 'docs'];
  const FORBIDDEN = [/complete Quran database/i, /complete Hadith database/i];
  async function walk(d) {
    let entries;
    try { entries = await fs.readdir(d, { withFileTypes: true }); } catch { return []; }
    const out = [];
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) out.push(...await walk(p));
      else if (e.isFile()) out.push(p);
    }
    return out;
  }
  const hits = [];
  for (const root of dirs) {
    for (const f of await walk(path.join(REPO, root))) {
      const text = await fs.readFile(f, 'utf8').catch(() => '');
      for (const re of FORBIDDEN) {
        if (re.test(text)) hits.push(`${f} :: ${re}`);
      }
    }
  }
  // Allow mentions inside this test file (which contains the regex literals).
  const filtered = hits.filter((h) => !h.includes('sprint-28-rag-governance.test.js') && !h.includes('rahma-ci.yml'));
  assert.deepEqual(filtered, [], `forbidden Islamic-completeness claims found:\n${filtered.join('\n')}`);
});
