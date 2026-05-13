import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('GET /ready exposes ibadat safety flags', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'sakina-backend');
    assert.equal(typeof body.database, 'object');
    assert.equal(typeof body.database.configured, 'boolean');
    assert.equal(typeof body.database.connected, 'boolean');
    assert.equal(body.database.connected, false, 'scaffold must report DB not connected');
    assert.equal(body.ibadat.scope, 'ibadat');
    assert.equal(body.ibadat.source_required, true);
    assert.equal(body.ibadat.answer_without_source_blocked, true);
    assert.equal(typeof body.environment, 'string');
  } finally {
    await app.close();
  }
});

test('GET /ready returns database.configured=false when DATABASE_URL is unset', async () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    assert.equal(body.database.configured, false);
  } finally {
    await app.close();
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  }
});
