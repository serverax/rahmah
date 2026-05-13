import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { _libraryDocProjectionForTest as project } from '../src/routes/library.js';

test('Sprint37 — /api/library/categories includes the required Arabic categories', async () => {
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/library/categories' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.ok(Array.isArray(body.categories));
    const ids = body.categories.map((c) => c.id);
    for (const expected of ['quran', 'hadith', 'dua', 'prayer', 'fasting', 'zakat', 'hajj', 'akhlaq', 'child_content', 'family']) {
      assert.ok(ids.includes(expected), `missing category: ${expected}`);
    }
    for (const c of body.categories) {
      assert.equal(typeof c.title_ar, 'string');
      assert.ok(c.title_ar.length > 0);
    }
  } finally {
    await app.close();
  }
});

test('Sprint37 — /api/library/items returns configured=false + empty list when DB missing', async () => {
  const s = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/library/items?category=quran' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.configured, false);
    assert.deepEqual(body.items, []);
    assert.equal(body.category, 'quran');
  } finally {
    await app.close();
    if (s !== undefined) process.env.DATABASE_URL = s;
  }
});

test('Sprint37 — /api/library/documents (alias) returns same truthful shape', async () => {
  const s = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/library/documents?category=dua' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.configured, false);
    assert.deepEqual(body.documents, []);
    assert.equal(body.category, 'dua');
  } finally {
    await app.close();
    if (s !== undefined) process.env.DATABASE_URL = s;
  }
});

test('Sprint37 — /api/library/search rejects empty/too-long queries; foundation mode never invents', async () => {
  const s = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    let r = await app.inject({ method: 'GET', url: '/api/library/search?q=' });
    assert.equal(r.statusCode, 400);
    r = await app.inject({ method: 'GET', url: `/api/library/search?q=${'a'.repeat(201)}` });
    assert.equal(r.statusCode, 400);
    r = await app.inject({ method: 'GET', url: '/api/library/search?q=الصلاة' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.configured, false);
    assert.deepEqual(body.items, []);
    assert.equal(body.query, 'الصلاة');
  } finally {
    await app.close();
    if (s !== undefined) process.env.DATABASE_URL = s;
  }
});

test('Sprint37 — /api/library/documents/:id returns 503 when DB missing', async () => {
  const s = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/library/documents/abc' });
    assert.equal(r.statusCode, 503);
  } finally {
    await app.close();
    if (s !== undefined) process.env.DATABASE_URL = s;
  }
});

test('Sprint37 — library projection: pending/blocked/fixture rows excluded from public', () => {
  assert.equal(project({ verification_status: 'pending_review', title_ar: 't' }), null);
  assert.equal(project({ verification_status: 'rejected', title_ar: 't' }), null);
  assert.equal(project({ verification_status: 'approved', is_test_fixture: true, title_ar: 't' }), null);
  const ok = project({
    verification_status: 'approved',
    title_ar: 'كتاب',
    category: 'quran',
    citation_label_ar: 'Al-Baqarah 2:255',
    source_name_ar: 'القرآن الكريم',
  });
  assert.equal(ok.title_ar, 'كتاب');
  assert.equal(ok.category, 'quran');
  assert.equal(ok.citation_label_ar, 'Al-Baqarah 2:255');
});

test('Sprint37 — /api/library/status reflects the truth (no fake count)', async () => {
  const s = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/library/status' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.enabled, true);
    assert.equal(body.configured, false);
    assert.equal(body.approved_sources, 0);
  } finally {
    await app.close();
    if (s !== undefined) process.env.DATABASE_URL = s;
  }
});
