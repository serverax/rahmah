import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { _resetClientPoolForTests } from '../src/db/client.js';

function envSnap() {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    SESSION_SECRET: process.env.SESSION_SECRET,
    APP_VERSION: process.env.APP_VERSION,
    GIT_COMMIT: process.env.GIT_COMMIT,
    GITHUB_SHA: process.env.GITHUB_SHA,
    WASM_FATWA_POLICY_GATE_URL: process.env.WASM_FATWA_POLICY_GATE_URL,
    WASM_QURAN_HADITH_CITATION_URL: process.env.WASM_QURAN_HADITH_CITATION_URL,
    WASM_CHILD_SAFETY_URL: process.env.WASM_CHILD_SAFETY_URL,
    WASM_CONTENT_RULE_ENGINE_URL: process.env.WASM_CONTENT_RULE_ENGINE_URL,
  };
}
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

test('Sprint42 — /ready exposes service identity + platform + public_ingress', async () => {
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const body = r.json();
    assert.equal(body.service, 'rahma-api');
    assert.equal(body.platform, 'mobile-only');
    assert.equal(body.public_ingress, 'disabled');
    assert.equal(typeof body.version, 'string');
  } finally {
    await app.close();
  }
});

test('Sprint42 — /ready surfaces git_commit when GIT_COMMIT / GITHUB_SHA injected at build', async () => {
  const s = envSnap();
  delete process.env.GIT_COMMIT;
  delete process.env.GITHUB_SHA;
  let app = buildApp();
  try {
    const r1 = await app.inject({ method: 'GET', url: '/ready' });
    assert.equal(r1.json().git_commit, null);
  } finally { await app.close(); }

  process.env.GIT_COMMIT = 'abc1234def5678901234567890abcdef12345678';
  app = buildApp();
  try {
    const r2 = await app.inject({ method: 'GET', url: '/ready' });
    assert.equal(r2.json().git_commit, 'abc1234def5678901234567890abcdef12345678');
  } finally { await app.close(); envRestore(s); }
});

test('Sprint42 — /ready git_commit rejects garbage values', async () => {
  const s = envSnap();
  process.env.GIT_COMMIT = '<script>alert(1)</script>';
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    assert.equal(r.json().git_commit, null);
  } finally { await app.close(); envRestore(s); }
});

test('Sprint42 — /ready.redis: configured false without REDIS_URL', async () => {
  const s = envSnap();
  delete process.env.REDIS_URL;
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const body = r.json();
    assert.equal(body.redis.configured, false);
    assert.equal(body.redis.reachable, null);
    assert.ok(body.blockers.includes('redis_not_configured'));
  } finally { await app.close(); envRestore(s); }
});

test('Sprint42 — /ready.redis: configured true with REDIS_URL but reachable still null until probe lands', async () => {
  const s = envSnap();
  process.env.REDIS_URL = 'redis://:redis_secret_xxxxxxxxxx@redis.example:6379/0';
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const body = r.json();
    const raw = r.body;
    assert.equal(body.redis.configured, true);
    assert.equal(body.redis.reachable, null);
    // NEVER echoes the password
    assert.ok(!raw.includes('redis_secret_xxxxxxxxxx'));
    assert.ok(!raw.includes('redis.example'));
    assert.ok(!body.blockers.includes('redis_not_configured'));
  } finally { await app.close(); envRestore(s); }
});

test('Sprint42 — /ready.wasm: 4 modules; all unconfigured by default', async () => {
  const s = envSnap();
  delete process.env.WASM_FATWA_POLICY_GATE_URL;
  delete process.env.WASM_QURAN_HADITH_CITATION_URL;
  delete process.env.WASM_CHILD_SAFETY_URL;
  delete process.env.WASM_CONTENT_RULE_ENGINE_URL;
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const body = r.json();
    assert.equal(body.wasm.configured, false);
    assert.equal(body.wasm.modules.length, 4);
    for (const m of body.wasm.modules) {
      assert.equal(m.configured, false);
      assert.equal(m.reachable, null);
      assert.ok(['fatwa-policy-gate', 'quran-hadith-citation', 'child-safety', 'content-rule-engine'].includes(m.name));
    }
    assert.ok(body.blockers.includes('wasm_not_configured'));
  } finally { await app.close(); envRestore(s); }
});

test('Sprint42 — /ready.wasm: configured true when all four URLs set; URLs never echoed', async () => {
  const s = envSnap();
  process.env.WASM_FATWA_POLICY_GATE_URL     = 'http://rahma-fatwa-policy-gate-wasm.rahma-ai.svc.cluster.local:8080';
  process.env.WASM_QURAN_HADITH_CITATION_URL = 'http://rahma-quran-hadith-citation-wasm.rahma-ai.svc.cluster.local:8080';
  process.env.WASM_CHILD_SAFETY_URL          = 'http://rahma-child-safety-wasm.rahma-ai.svc.cluster.local:8080';
  process.env.WASM_CONTENT_RULE_ENGINE_URL   = 'http://rahma-content-rule-engine-wasm.rahma-ai.svc.cluster.local:8080';
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const body = r.json();
    const raw = r.body;
    assert.equal(body.wasm.configured, true);
    for (const m of body.wasm.modules) assert.equal(m.configured, true);
    // URLs themselves are NEVER returned in the body.
    assert.ok(!raw.includes('svc.cluster.local'));
    assert.ok(!body.blockers.includes('wasm_not_configured'));
  } finally { await app.close(); envRestore(s); }
});

test('Sprint42 — /ready: production_ready=false + blockers honest by default', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;
  _resetClientPoolForTests();
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const body = r.json();
    assert.equal(body.production_ready, false);
    for (const must of [
      'auth_not_configured',
      'database_not_configured',
      'redis_not_configured',
      'wasm_not_configured',
      'rag_foundation_only',
      'sheikh_repository_not_configured',
      'no_approved_islamic_sources',
    ]) {
      assert.ok(body.blockers.includes(must), `missing blocker: ${must}`);
    }
  } finally { await app.close(); envRestore(s); }
});

test('Sprint42 — /ready: never leaks DATABASE_URL / REDIS_URL / JWT / SESSION_SECRET', async () => {
  const s = envSnap();
  process.env.DATABASE_URL    = 'postgres://leak_user_s42:leak_pass_s42@127.0.0.99:5432/leak_db_s42';
  process.env.REDIS_URL       = 'redis://:leak_redis_s42@127.0.0.99:6379/0';
  process.env.JWT_SECRET      = 'jwt_leak_s42_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  process.env.SESSION_SECRET  = 'session_leak_s42_xxxxxxxxxxxxxxxxxxxxxxxxxx';
  _resetClientPoolForTests();
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const raw = r.body;
    for (const needle of [
      'leak_user_s42', 'leak_pass_s42', 'leak_db_s42',
      'leak_redis_s42',
      'jwt_leak_s42', 'session_leak_s42', '127.0.0.99',
    ]) {
      assert.ok(!raw.includes(needle), `leak detected: ${needle}`);
    }
  } finally { await app.close(); envRestore(s); _resetClientPoolForTests(); }
});

test('Sprint42 — /ready: redis_not_configured blocker disappears when REDIS_URL set', async () => {
  const s = envSnap();
  process.env.REDIS_URL = 'redis://r.example:6379/0';
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const body = r.json();
    assert.ok(!body.blockers.includes('redis_not_configured'));
  } finally { await app.close(); envRestore(s); }
});
