import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { _resetClientPoolForTests } from '../src/db/client.js';
import { _resetPoolForTests as _resetHealthPoolForTests } from '../src/db/health.js';
import { _resetSheikhRepositoryForTests } from '../src/sheikh/sheikh-question-repository.js';

function envSnap() {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    DONATION_PROVIDER: process.env.DONATION_PROVIDER,
    WASM_FATWA_POLICY_GATE_URL: process.env.WASM_FATWA_POLICY_GATE_URL,
    WASM_QURAN_HADITH_CITATION_URL: process.env.WASM_QURAN_HADITH_CITATION_URL,
    WASM_CHILD_SAFETY_URL: process.env.WASM_CHILD_SAFETY_URL,
    WASM_CONTENT_RULE_ENGINE_URL: process.env.WASM_CONTENT_RULE_ENGINE_URL,
  };
}
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

function resetAllPools() {
  _resetClientPoolForTests();
  _resetHealthPoolForTests();
  _resetSheikhRepositoryForTests();
}

test('Sprint62 — /ready v2: readiness_schema_version is "2"', async () => {
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    assert.equal(r.json().readiness_schema_version, '2');
  } finally { await app.close(); }
});

test('Sprint62 — /ready v2: public_ingress is both string "disabled" AND has state.disabled=true', async () => {
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const b = r.json();
    assert.equal(b.public_ingress, 'disabled');
    assert.equal(b.public_ingress_state.disabled, true);
    assert.equal(b.public_ingress_state.status, 'disabled');
  } finally { await app.close(); }
});

test('Sprint62 — /ready v2: per-WASM-module structured blocks (4 modules)', async () => {
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const b = r.json();
    for (const k of ['fatwa_policy_gate', 'quran_hadith_citation', 'child_safety', 'content_rule_engine']) {
      assert.ok(b.wasm[k], `missing wasm.${k} block`);
      assert.equal(typeof b.wasm[k].configured, 'boolean');
      // reachable is null until probe ships — explicit non-true non-false
      assert.equal(b.wasm[k].reachable, null);
    }
  } finally { await app.close(); }
});

test('Sprint62 — /ready v2: islamic_sources block reports approved_sources count', async () => {
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const b = r.json();
    assert.equal(typeof b.islamic_sources, 'object');
    assert.equal(b.islamic_sources.configured, false);
    assert.equal(b.islamic_sources.approved_sources, 0);
  } finally { await app.close(); }
});

test('Sprint62 — /ready v2: donations block reports configured + provider', async () => {
  const s = envSnap();
  delete process.env.DONATION_PROVIDER;
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const b = r.json();
    assert.equal(b.donations.configured, false);
    assert.equal(b.donations.provider, 'disabled');
    assert.ok(b.blockers.includes('donations_provider_not_configured'));
  } finally { await app.close(); envRestore(s); }
});

test('Sprint62 — /ready v2: production_ready=false when any required block is missing', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;
  delete process.env.DONATION_PROVIDER;
  delete process.env.WASM_FATWA_POLICY_GATE_URL;
  _resetClientPoolForTests();
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const b = r.json();
    assert.equal(b.production_ready, false);
    for (const must of [
      'auth_not_configured',
      'database_not_configured',
      'redis_not_configured',
      'wasm_not_configured',
      'rag_foundation_only',
      'sheikh_repository_not_configured',
      'no_approved_islamic_sources',
      'donations_provider_not_configured',
    ]) {
      assert.ok(b.blockers.includes(must), `missing blocker: ${must}`);
    }
  } finally { await app.close(); envRestore(s); }
});

test('Sprint62 — /ready v2: never leaks DATABASE_URL / REDIS_URL / JWT / SESSION_SECRET', async () => {
  const s = envSnap();
  process.env.DATABASE_URL = 'postgres://leak_user_s62:leak_pw_s62@127.0.0.99:5432/leak_db_s62';
  process.env.REDIS_URL    = 'redis://:leak_redis_s62@127.0.0.99:6379/0';
  process.env.JWT_SECRET   = 'jwt_leak_s62_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  _resetClientPoolForTests();
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const raw = r.body;
    for (const n of ['leak_user_s62', 'leak_pw_s62', 'leak_db_s62', 'leak_redis_s62', 'jwt_leak_s62', '127.0.0.99']) {
      assert.ok(!raw.includes(n), `leak: ${n}`);
    }
  } finally { await app.close(); envRestore(s); _resetClientPoolForTests(); }
});

test('Sprint62 — /ready v2: configured=false is NEVER treated as production-ready', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  resetAllPools();
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const b = r.json();
    assert.equal(b.database.configured, false);
    assert.equal(b.production_ready, false);
  } finally { await app.close(); envRestore(s); resetAllPools(); }
});
