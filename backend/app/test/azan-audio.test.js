/**
 * backend/app/test/azan-audio.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('GET /api/azan-audio/options: blocks invalid local audio assets', async () => {
  const app = buildApp({ autoInit: false });
  try {
    const res = await app.inject({ method: 'GET', url: '/api/azan-audio/options' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.configured, false);
    assert.equal(body.production_ready, false);
    assert.ok(Array.isArray(body.options));
    const approved = body.options.find(o => o.id === 'makkah_public_01');
    assert.ok(approved);
    assert.equal(approved.approved, false);
    assert.equal(approved.playback_allowed, false);
    assert.equal(approved.review_status, 'blocked_invalid_audio_file');
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
    assert.ok(opt.source_url);
    assert.ok(opt.file_hash_sha256);
    assert.ok(opt.approved_by);
    assert.ok(opt.approved_at);
  } finally {
    await app.close();
  }
});
