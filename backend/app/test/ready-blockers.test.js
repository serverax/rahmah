import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { _resetClientPoolForTests } from '../src/db/client.js';

function envSnap() {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_MODE: process.env.AUTH_MODE,
    SESSION_SECRET: process.env.SESSION_SECRET,
    SAKINA_ALLOW_DEV_AUTH: process.env.SAKINA_ALLOW_DEV_AUTH,
    NODE_ENV: process.env.NODE_ENV,
  };
}
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

test('READY: production_ready=false + honest blockers when nothing configured', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  delete process.env.AUTH_MODE;
  delete process.env.SESSION_SECRET;
  _resetClientPoolForTests();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    assert.equal(body.production_ready, false);
    assert.ok(Array.isArray(body.blockers));
    assert.ok(body.blockers.includes('auth_not_configured'));
    assert.ok(body.blockers.includes('database_not_configured'));
    assert.ok(body.blockers.includes('rag_foundation_only'));
    assert.ok(body.blockers.includes('no_approved_islamic_sources'));
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('READY: auth block shows configured=false + mode=not_configured by default', async () => {
  const s = envSnap();
  delete process.env.AUTH_MODE;
  delete process.env.SESSION_SECRET;
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    assert.equal(typeof body.auth, 'object');
    assert.equal(body.auth.configured, false);
    assert.equal(body.auth.mode, 'not_configured');
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('READY: database block carries migration_table_exists + applied_migrations_count', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  _resetClientPoolForTests();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    assert.equal(typeof body.database, 'object');
    assert.equal(body.database.migration_table_exists, false);
    assert.equal(body.database.applied_migrations_count, 0);
    assert.equal(body.database.pending_migrations_count, null);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('READY: even with AUTH_MODE=external + SESSION_SECRET set, production_ready stays false until DB+RAG real', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'RahmaTestSessionKey2026Aa1Bb2Cc3Dd4Ee5Ff6';
  delete process.env.DATABASE_URL;
  _resetClientPoolForTests();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    // Auth foundation is now configured…
    assert.equal(body.auth.configured, true);
    // …but DB + RAG remain blockers.
    assert.equal(body.production_ready, false);
    assert.ok(body.blockers.includes('database_not_configured'));
    assert.ok(body.blockers.includes('rag_foundation_only'));
    assert.ok(!body.blockers.includes('auth_not_configured'),
      `auth_not_configured should NOT be a blocker when configured; saw ${JSON.stringify(body.blockers)}`);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('READY: never leaks SESSION_SECRET or DATABASE_URL in body', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'leak_session_secret_xxxxxxxxxxxxxxxx_unique_marker';
  process.env.DATABASE_URL = 'postgres://leak_user:leak_pass@127.0.0.99:5432/leak_db';
  _resetClientPoolForTests();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const raw = res.body;
    assert.ok(!raw.includes('leak_session_secret'));
    assert.ok(!raw.includes('leak_user'));
    assert.ok(!raw.includes('leak_pass'));
    assert.ok(!raw.includes('leak_db'));
    assert.ok(!raw.includes('127.0.0.99'));
  } finally {
    await app.close();
    envRestore(s);
    _resetClientPoolForTests();
  }
});

test('READY: blockers array shrinks as subsystems come online (auth-only configured)', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'RahmaTestSessionKey2026Aa1Bb2Cc3Dd4Ee5Ff6';
  delete process.env.DATABASE_URL;
  _resetClientPoolForTests();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    const blockers = body.blockers || [];
    assert.ok(!blockers.includes('auth_not_configured'));
    // Other blockers still present.
    assert.ok(blockers.length >= 3);
  } finally {
    await app.close();
    envRestore(s);
  }
});
