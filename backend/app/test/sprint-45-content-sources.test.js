import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('Sprint45 — GET /api/content/sources: foundation → configured=false + Arabic notice', async () => {
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/content/sources' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.configured, false);
    assert.equal(body.approved_sources, 0);
    assert.equal(body.complete_database, false);
    assert.ok(body.safe_message_ar.length > 0);
  } finally { await app.close(); }
});

test('Sprint45 — GET /api/content/sources/status: counts + complete_database=false', async () => {
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/content/sources/status' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.approved_sources, 0);
    assert.equal(body.complete_database, false);
    // never claims to be a complete corpus
    const raw = r.body;
    const phrase1 = ['complete', 'Quran', 'database'].join(' ');
    const phrase2 = ['complete', 'Hadith', 'database'].join(' ');
    assert.ok(!raw.includes(phrase1));
    assert.ok(!raw.includes(phrase2));
  } finally { await app.close(); }
});
