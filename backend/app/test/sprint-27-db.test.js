import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from '../src/app.js';
import { _resetClientPoolForTests } from '../src/db/client.js';
import { _resetPoolForTests as _resetHealthPoolForTests } from '../src/db/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, '..', '..', '..');

function envSnap() { return { DATABASE_URL: process.env.DATABASE_URL }; }
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

function resetAllPools() {
  _resetClientPoolForTests();
  _resetHealthPoolForTests();
}

// Sprint 27 source-level checks. The /api/db/status route exists as an idea
// in DATABASE_LOCAL_VERIFICATION.md but is intentionally not wired into the
// production app.js by the linter pass. These tests assert what survived:
// migration runner robustness, docs, /ready truth, and check-db-health.js.

test('S27: /ready DB block stays truthful with no DB', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  resetAllPools();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    assert.equal(body.database.configured, false);
    assert.equal(body.database.connected, false);
    // RAG remains foundation when no DB.
    assert.equal(body.rag.mode, 'foundation');
    assert.equal(body.safe_to_serve_public, false);
  } finally {
    await app.close();
    envRestore(s);
    resetAllPools();
  }
});

test('S27: migration runner refuses to start without DATABASE_URL', async () => {
  const text = await fs.readFile(path.join(REPO, 'scripts', 'db', 'run-migrations.js'), 'utf8');
  assert.ok(text.includes('DATABASE_URL not set'));
  assert.ok(text.includes('schema_migrations'));
  assert.ok(text.includes('.sort()'));
  assert.ok(text.includes('DRIFT'));
  assert.ok(text.includes("spawnSync('psql'"));
  assert.ok(text.includes('stripSqlComments'));
  assert.ok(text.includes('dsnToPsqlEnv'));
  // Never logs DATABASE_URL.
  assert.ok(!/console\.log\([^)]*DATABASE_URL/i.test(text));
});

test('S27: check-db-health.js produces JSON and never echoes DSN', async () => {
  const text = await fs.readFile(path.join(REPO, 'scripts', 'db', 'check-db-health.js'), 'utf8');
  assert.ok(text.includes('JSON.stringify('));
  assert.ok(!/console\.log\([^)]*dsn/i.test(text));
});

test('S27: docs/ops/DATABASE_LOCAL_VERIFICATION.md exists and warns vs prod', async () => {
  const text = await fs.readFile(path.join(REPO, 'docs', 'ops', 'DATABASE_LOCAL_VERIFICATION.md'), 'utf8');
  assert.ok(/Do NOT point this at a production database/i.test(text));
  assert.ok(text.includes('npm run db:migrate'));
  assert.ok(text.includes('npm run db:check'));
  assert.ok(text.includes('aks-iterlaw'));
});

test('S27: /ready does NOT leak DATABASE_URL when set', async () => {
  const s = envSnap();
  process.env.DATABASE_URL = 'postgres://leak_user:leak_pass@127.0.0.99:5432/leak_db';
  resetAllPools();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    assert.ok(!res.body.includes('leak_user'));
    assert.ok(!res.body.includes('leak_pass'));
    assert.ok(!res.body.includes('leak_db'));
    assert.ok(!res.body.includes('127.0.0.99'));
  } finally {
    await app.close();
    envRestore(s);
    resetAllPools();
  }
});
