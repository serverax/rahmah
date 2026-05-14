import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('GET /health returns ok=true with required service identity', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'rahma-api');
    assert.equal(body.legacy_service_name, 'sakina-backend');
    assert.equal(body.status, 'healthy');
  } finally {
    await app.close();
  }
});
