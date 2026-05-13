import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('GET /api/engine/status returns engine_implemented=true (Sprint 17)', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/engine/status' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.engine_implemented, true);
    assert.equal(body.mode, 'deterministic_rules');
    assert.ok(Array.isArray(body.supported_events));
    assert.ok(body.supported_events.includes('USER_ASKED_SHEIKH_QUESTION'));
    assert.ok(body.supported_events.includes('CHARITY_CAMPAIGN_REQUESTED_PUBLICATION'));
    assert.ok(body.supported_events_count >= 15);
    assert.ok(Array.isArray(body.safety_rules_loaded));
    assert.ok(body.safety_rules_count >= 8);
    assert.equal(typeof body.subsystems, 'object');
    assert.equal(typeof body.subsystems.database_configured, 'boolean');
    assert.equal(typeof body.subsystems.cache_configured, 'boolean');
    // Honest Arabic notice — engine is deterministic, no external AI.
    assert.ok(body.notice_ar.includes('حتمي') || body.notice_ar.includes('قواعد'));
  } finally {
    await app.close();
  }
});

test('GET /api/engine/status never leaks env / DSN', async () => {
  const prev = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://leak_user:leak_pass@127.0.0.99:5432/leak_db';
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/engine/status' });
    const raw = res.body;
    assert.ok(!raw.includes('leak_user'));
    assert.ok(!raw.includes('leak_pass'));
    assert.ok(!raw.includes('leak_db'));
    assert.ok(!raw.includes('127.0.0.99'));
  } finally {
    await app.close();
    if (prev === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = prev;
  }
});
