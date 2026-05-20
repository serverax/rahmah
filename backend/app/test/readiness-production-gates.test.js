import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { _resetClientPoolForTests } from '../src/db/client.js';
import { _resetPoolForTests as _resetHealthPoolForTests } from '../src/db/health.js';
import { redisReadiness } from '../src/infra/redis-probe.js';
import { appStoreComplianceStatus } from '../src/infra/production-gates.js';

function envSnap() {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    AUTH_MODE: process.env.AUTH_MODE,
    SESSION_SECRET: process.env.SESSION_SECRET,
    WASM_RUNTIME_MODE: process.env.WASM_RUNTIME_MODE,
    APP_STORE_COMPLIANCE_STATUS: process.env.APP_STORE_COMPLIANCE_STATUS,
  };
}

function envRestore(s) {
  for (const [k, v] of Object.entries(s)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function resetPools() {
  _resetClientPoolForTests();
  _resetHealthPoolForTests();
}

test('redis readiness: not configured => ready false', async () => {
  const s = envSnap();
  delete process.env.REDIS_URL;
  try {
    const status = await redisReadiness({ timeoutMs: 500 });
    assert.equal(status.configured, false);
    assert.equal(status.reachable, false);
    assert.equal(status.ready, false);
  } finally {
    envRestore(s);
  }
});

test('/ready: auth not configured => auth_ready false and production_ready false', async () => {
  const s = envSnap();
  delete process.env.AUTH_MODE;
  delete process.env.SESSION_SECRET;
  process.env.WASM_RUNTIME_MODE = 'disabled';
  resetPools();
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const b = r.json();
    assert.equal(b.auth_ready, false);
    assert.equal(b.production_ready, false);
    assert.ok(b.blockers.includes('auth_not_ready') || b.blockers.includes('auth_not_configured'));
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('/ready: auth configured (dev_local in test) => auth_ready true', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'dev_local';
  process.env.NODE_ENV = 'test';
  process.env.WASM_RUNTIME_MODE = 'disabled';
  resetPools();
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const b = r.json();
    assert.equal(b.auth.configured, true);
    assert.equal(b.auth_ready, true);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('/ready: external auth with missing secret => auth_ready false', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  delete process.env.SESSION_SECRET;
  process.env.WASM_RUNTIME_MODE = 'disabled';
  resetPools();
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const b = r.json();
    assert.equal(b.auth.mode, 'external');
    assert.equal(b.auth_ready, false);
    assert.equal(b.production_ready, false);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('/ready: external auth with invalid placeholder secret => auth_ready false and no leak', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'CHANGE_ME_CHANGE_ME_CHANGE_ME_CHANGE_ME';
  process.env.WASM_RUNTIME_MODE = 'disabled';
  resetPools();
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const raw = r.body;
    const b = r.json();
    assert.equal(b.auth_ready, false);
    assert.equal(raw.includes(process.env.SESSION_SECRET), false);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('/ready: external auth with configured strong secret => auth_ready true', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'RahmaProdSessionKey2026StrongValueXyZ9';
  process.env.WASM_RUNTIME_MODE = 'disabled';
  resetPools();
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const b = r.json();
    assert.equal(b.auth.mode, 'external');
    assert.equal(b.auth_ready, true);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('app-store compliance checks required docs and public pages', () => {
  const s = envSnap();
  process.env.APP_STORE_COMPLIANCE_STATUS = 'approved';
  try {
    const status = appStoreComplianceStatus();
    assert.equal(status.files_present, true);
    assert.equal(status.pages_wired, true);
    assert.ok(Array.isArray(status.required));
    assert.ok(status.required.some((item) => item.key === 'privacy_policy' && item.doc_present && item.page_present));
    assert.ok(status.required.some((item) => item.key === 'account_deletion' && item.wired));
    assert.equal(status.placeholder_free, true);
    assert.equal(status.ready, true, 'compliance pages must be production-ready when approved');
  } finally {
    envRestore(s);
  }
});

test('/ready reports app-store compliance detail and blocks placeholders', async () => {
  const s = envSnap();
  process.env.APP_STORE_COMPLIANCE_STATUS = 'approved';
  process.env.WASM_RUNTIME_MODE = 'disabled';
  resetPools();
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const b = r.json();
    assert.equal(b.app_store.compliance_status, 'approved');
    assert.equal(b.app_store.files_present, true);
    assert.equal(b.app_store.pages_wired, true);
    assert.equal(b.app_store.ready, true);
    assert.equal(b.app_store_compliance_ready, true);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('redis readiness: live stack when reachable => ready true', async () => {
  const s = envSnap();
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6381/0';
  try {
    const status = await redisReadiness({ timeoutMs: 2000 });
    if (!status.reachable) {
      return; // skip when local Rahma Redis stack is not running
    }
    assert.equal(status.configured, true);
    assert.equal(status.ready, true);
  } finally {
    envRestore(s);
  }
});

test('/ready: redis_url without server => redis_ready false', async () => {
  const s = envSnap();
  process.env.REDIS_URL = 'redis://127.0.0.1:6399/0';
  resetPools();
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const b = r.json();
    assert.equal(b.redis.configured, true);
    assert.equal(b.redis.reachable, false);
    assert.equal(b.redis_ready, false);
    assert.equal(b.production_ready, false);
  } finally {
    await app.close();
    envRestore(s);
  }
});
