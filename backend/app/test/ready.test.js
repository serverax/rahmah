import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { _resetPoolForTests } from '../src/db/health.js';

test('GET /ready exposes ibadat safety flags', async () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  _resetPoolForTests();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'rahma-api');
    assert.equal(body.legacy_service_name, 'sakina-backend');
    assert.equal(body.platform, 'mobile-only');
    assert.equal(body.public_ingress, 'disabled');
    assert.equal(typeof body.database_configured, 'boolean');
    assert.equal(typeof body.database_connected, 'boolean');
    assert.equal(typeof body.rag_configured, 'boolean');
    assert.equal(typeof body.llm_configured, 'boolean');
    assert.equal(typeof body.wasm_runtime_configured, 'boolean');
    assert.equal(typeof body.content_governance_enabled, 'boolean');
    assert.equal(typeof body.production_ready, 'boolean');
    assert.ok(Array.isArray(body.blockers));
    assert.equal(typeof body.database, 'object');
    assert.equal(typeof body.database.configured, 'boolean');
    assert.equal(typeof body.database.connected, 'boolean');
    assert.equal(body.ibadat.scope, 'ibadat');
    assert.equal(body.ibadat.source_required, true);
    assert.equal(body.ibadat.answer_without_source_blocked, true);
    assert.equal(typeof body.environment, 'string');
  } finally {
    await app.close();
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  }
});

test('GET /ready returns configured=false / connected=false / checked=false when DATABASE_URL is unset', async () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  _resetPoolForTests();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    assert.equal(body.database.configured, false);
    assert.equal(body.database.connected, false);
    assert.equal(body.database.checked, false);
    assert.equal(body.database.error_type, null);
  } finally {
    await app.close();
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  }
});
