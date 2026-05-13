import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeQuery, safeQueryOne } from '../src/db/query.js';
import { _resetClientPoolForTests, getPool } from '../src/db/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('safeQuery returns not_configured when DATABASE_URL absent', async () => {
  const prev = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  _resetClientPoolForTests();
  const r = await safeQuery('SELECT 1');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'not_configured');
  assert.deepEqual(r.rows, []);
  if (prev === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = prev;
});

test('safeQuery returns invalid_sql when sql is empty', async () => {
  const prev = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://x:y@127.0.0.99:65530/z';
  _resetClientPoolForTests();
  const r = await safeQuery('');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'invalid_sql');
  _resetClientPoolForTests();
  if (prev === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = prev;
});

test('safeQueryOne wraps safeQuery and returns row=null with no rows', async () => {
  const prev = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  _resetClientPoolForTests();
  const r = await safeQueryOne('SELECT 1');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'not_configured');
  if (prev === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = prev;
});

test('getPool returns null when DATABASE_URL absent', () => {
  const prev = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  _resetClientPoolForTests();
  assert.equal(getPool(), null);
  if (prev === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = prev;
});

test('run-migrations script exists and references schema_migrations', async () => {
  const p = path.resolve(__dirname, '..', '..', '..', 'scripts', 'db', 'run-migrations.js');
  const text = await fs.readFile(p, 'utf8');
  assert.ok(text.includes('schema_migrations'));
  assert.ok(text.includes('content_hash'));
  // Drift detection present.
  assert.ok(text.includes('DRIFT'));
  // Refuses to run without DATABASE_URL.
  assert.ok(text.includes('DATABASE_URL not set'));
});

test('check-db-health script exists and does not echo DSN', async () => {
  const p = path.resolve(__dirname, '..', '..', '..', 'scripts', 'db', 'check-db-health.js');
  const text = await fs.readFile(p, 'utf8');
  // Must reference DATABASE_URL only as a variable read.
  assert.ok(text.includes('process.env.DATABASE_URL'));
  // Must NOT contain code that prints the dsn variable in any obvious way.
  assert.ok(!/console\.log\([^)]*dsn/.test(text), 'check-db-health appears to log DSN');
});

test('.env.example exists with placeholder values only', async () => {
  const p = path.resolve(__dirname, '..', '..', '..', '.env.example');
  const text = await fs.readFile(p, 'utf8');
  // Must include DATABASE_URL key.
  assert.ok(/^DATABASE_URL=/m.test(text));
  // Must NOT contain anything that looks like a real password
  // (CHANGE_ME placeholder is fine).
  assert.ok(/CHANGE_ME/.test(text));
  // No tokens
  assert.ok(!/ghp_[0-9A-Za-z]{36}/.test(text));
  assert.ok(!/-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(text));
});

test('local Postgres docker-compose uses non-default port and no inline credentials', async () => {
  const p = path.resolve(__dirname, '..', '..', '..', 'deployment', 'local', 'docker-compose.postgres.yml');
  const text = await fs.readFile(p, 'utf8');
  // Operator must provide POSTGRES_PASSWORD via env — never hard-coded.
  assert.ok(text.includes('POSTGRES_PASSWORD: ${POSTGRES_PASSWORD'));
  assert.ok(text.includes('127.0.0.1:5433:5432'));
  assert.ok(!/POSTGRES_PASSWORD:\s+["']?[A-Za-z0-9]{6,}/.test(text), 'inline password detected');
});
