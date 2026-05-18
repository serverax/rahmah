/**
 * backend/app/test/azan-audio.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('GET /api/azan-audio/options: returns configured=true when approved audio exists', async () => {
  const app = buildApp({ autoInit: false });
  try {
    const res = await app.inject({ method: 'GET', url: '/api/azan-audio/options' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    // Since we now have makkah_public_01 marked as approved: true
    assert.equal(body.configured, true);
    assert.ok(Array.isArray(body.options));
    const approved = body.options.find(o => o.id === 'makkah_public_01');
    assert.ok(approved);
    assert.equal(approved.approved, true);
    assert.equal(approved.review_status, 'verified');
  } finally {
    await app.close();
  }
});

test('Azan Metadata Schema: contains required license and source fields', async () => {
  const app = buildApp({ autoInit: false });
  try {
    const res = await app.inject({ method: 'GET', url: '/api/azan-audio/options' });
    const body = res.json();
    const opt = body.options.find(o => o.id === 'makkah_public_01');
    assert.ok(opt.source, 'missing source');
    assert.ok(opt.license, 'missing license');
    assert.ok(opt.file_path);
    assert.ok(opt.duration_seconds);
  } finally {
    await app.close();
  }
});
