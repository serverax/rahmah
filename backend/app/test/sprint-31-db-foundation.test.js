import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { _resetClientPoolForTests } from '../src/db/client.js';
import {
  listMigrationFiles,
  countMigrationFiles,
  hashMigrationFile,
  pendingCount,
  _resetMigrationRegistryCache,
} from '../src/db/migration-registry.js';

function envSnap() {
  return { DATABASE_URL: process.env.DATABASE_URL, NODE_ENV: process.env.NODE_ENV };
}
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

test('Sprint31 — migration-registry lists every .sql file under backend/db/migrations', async () => {
  _resetMigrationRegistryCache();
  const files = await listMigrationFiles();
  assert.ok(Array.isArray(files));
  assert.ok(files.length >= 7, `expected ≥7 migration files, got ${files.length}`);
  for (const f of files) {
    assert.ok(/^\d{3}_.+\.sql$/.test(f), `migration filename ${f} must be NNN_name.sql`);
  }
  const count = await countMigrationFiles();
  assert.equal(count, files.length);
});

test('Sprint31 — hashMigrationFile returns 64-hex sha-256 for every migration', async () => {
  _resetMigrationRegistryCache();
  const files = await listMigrationFiles();
  for (const f of files) {
    const h = await hashMigrationFile(f);
    assert.ok(typeof h === 'string' && h.length === 64, `bad hash for ${f}: ${h}`);
    assert.ok(/^[0-9a-f]{64}$/.test(h), `non-hex hash for ${f}: ${h}`);
  }
});

test('Sprint31 — pendingCount is non-negative and clamps at 0 when applied > total', () => {
  assert.equal(pendingCount(7, 0), 7);
  assert.equal(pendingCount(7, 7), 0);
  assert.equal(pendingCount(7, 10), 0);
  assert.equal(pendingCount(0, 0), 0);
  assert.equal(pendingCount(undefined, undefined), 0);
});

test('Sprint31 — /api/db/status reports total_migration_files truthfully when DB unconfigured', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  _resetClientPoolForTests();
  _resetMigrationRegistryCache();
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/db/status' });
    const body = r.json();
    assert.equal(r.statusCode, 200);
    assert.equal(body.database_configured, false);
    assert.equal(body.database_reachable, false);
    assert.equal(typeof body.total_migration_files, 'number');
    assert.ok(body.total_migration_files >= 7);
    assert.equal(body.pending_migrations_count, null);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('Sprint31 — unreachable DATABASE_URL never leaks user/host in /api/db/status body', async () => {
  const s = envSnap();
  process.env.DATABASE_URL =
    'postgres://leak_user_sprint31:leak_pass_sprint31@127.0.0.99:5432/leak_db_sprint31';
  _resetClientPoolForTests();
  _resetMigrationRegistryCache();
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/db/status' });
    const raw = r.body;
    assert.ok(!raw.includes('leak_user_sprint31'), 'username leaked');
    assert.ok(!raw.includes('leak_pass_sprint31'), 'password leaked');
    assert.ok(!raw.includes('leak_db_sprint31'),   'db name leaked');
    assert.ok(!raw.includes('127.0.0.99'),         'host leaked');
    const body = r.json();
    assert.equal(body.database_configured, true);
    assert.equal(body.database_reachable, false);
  } finally {
    await app.close();
    envRestore(s);
    _resetClientPoolForTests();
  }
});

test('Sprint31 — /ready DB block carries migration_table_exists + applied_migrations_count + no leak', async () => {
  const s = envSnap();
  process.env.DATABASE_URL =
    'postgres://sprint31_leakcheck:sprint31_secret@127.0.0.99:5432/sprint31_db';
  _resetClientPoolForTests();
  _resetMigrationRegistryCache();
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const raw = r.body;
    assert.ok(!raw.includes('sprint31_leakcheck'));
    assert.ok(!raw.includes('sprint31_secret'));
    assert.ok(!raw.includes('sprint31_db'));
    const body = r.json();
    assert.equal(typeof body.database, 'object');
    assert.equal(body.database.migration_table_exists, false);
    assert.equal(body.database.applied_migrations_count, 0);
  } finally {
    await app.close();
    envRestore(s);
    _resetClientPoolForTests();
  }
});
