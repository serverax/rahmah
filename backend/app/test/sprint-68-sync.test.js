import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

function envSnap() { return { DATABASE_URL: process.env.DATABASE_URL, AUTH_MODE: process.env.AUTH_MODE, SESSION_SECRET: process.env.SESSION_SECRET }; }
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

test('Sprint68 — GET /api/mobile/sync/status: not ready by default', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  delete process.env.AUTH_MODE;
  delete process.env.SESSION_SECRET;
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/mobile/sync/status' });
    assert.equal(r.statusCode, 200);
    const b = r.json();
    assert.equal(b.sync_ready, false);
    assert.equal(b.database.configured, false);
    assert.equal(b.auth.configured, false);
    assert.equal(b.content.approved_sources, 0);
  } finally { await app.close(); envRestore(s); }
});

test('Sprint68 — sync/status NEVER leaks DSN', async () => {
  const s = envSnap();
  process.env.DATABASE_URL = 'postgres://leak_user_s68:leak_pw_s68@127.0.0.99:5432/leak_db_s68';
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/mobile/sync/status' });
    for (const n of ['leak_user_s68', 'leak_pw_s68', 'leak_db_s68', '127.0.0.99']) {
      assert.ok(!r.body.includes(n));
    }
  } finally { await app.close(); envRestore(s); }
});
