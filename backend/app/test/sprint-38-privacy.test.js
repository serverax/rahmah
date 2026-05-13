import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { _PRIVACY_REQUEST_TYPES } from '../src/routes/privacy.js';

function envSnap() {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_MODE: process.env.AUTH_MODE,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };
}
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

test('Sprint38 — privacy request taxonomy covers all required types', () => {
  for (const t of ['delete_account', 'data_export', 'correct_data', 'restrict_processing', 'contact']) {
    assert.ok(_PRIVACY_REQUEST_TYPES.includes(t), `missing privacy type: ${t}`);
  }
});

test('Sprint38 — POST /api/privacy/requests: rejects invalid type', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    const r = await app.inject({
      method: 'POST', url: '/api/privacy/requests',
      payload: { request_type: 'evil', email: 'x@example.org' },
    });
    assert.equal(r.statusCode, 400);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('Sprint38 — POST /api/privacy/requests: storage_not_configured + persisted=false without DB', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    const r = await app.inject({
      method: 'POST', url: '/api/privacy/requests',
      payload: { request_type: 'data_export', email: 'sample@example.org' },
    });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.ok, false);
    assert.equal(body.status, 'storage_not_configured');
    assert.equal(body.persisted, false);
    assert.equal(body.request_type, 'data_export');
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('Sprint38 — admin routes are denied without auth', async () => {
  const s = envSnap();
  delete process.env.AUTH_MODE;
  const app = buildApp();
  try {
    let r = await app.inject({ method: 'GET', url: '/api/admin/privacy/requests' });
    assert.equal(r.statusCode, 503);
    assert.equal(r.json().error, 'auth_not_configured');

    r = await app.inject({
      method: 'POST', url: '/api/admin/privacy/requests/abc/complete',
      payload: {},
    });
    assert.equal(r.statusCode, 503);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('Sprint38 — admin routes reject non-admin role (403)', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'dev_local';
  process.env.NODE_ENV = 'test';
  const app = buildApp();
  try {
    let r = await app.inject({
      method: 'GET', url: '/api/admin/privacy/requests',
      headers: { 'x-sakina-test-principal': JSON.stringify({ role: 'sheikh' }) },
    });
    assert.equal(r.statusCode, 403);
    r = await app.inject({
      method: 'POST', url: '/api/admin/privacy/requests/abc/complete',
      headers: { 'x-sakina-test-principal': JSON.stringify({ role: 'sheikh' }) },
      payload: {},
    });
    assert.equal(r.statusCode, 403);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('Sprint38 — admin role can list privacy requests (foundation: empty list)', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'dev_local';
  process.env.NODE_ENV = 'test';
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    const r = await app.inject({
      method: 'GET', url: '/api/admin/privacy/requests',
      headers: { 'x-sakina-test-principal': JSON.stringify({ role: 'admin' }) },
    });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.configured, false);
    assert.deepEqual(body.requests, []);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('Sprint38 — admin role complete with no DB → 503 + truthful Arabic message', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'dev_local';
  process.env.NODE_ENV = 'test';
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    const r = await app.inject({
      method: 'POST', url: '/api/admin/privacy/requests/req-123/complete',
      headers: { 'x-sakina-test-principal': JSON.stringify({ role: 'admin' }) },
      payload: { note_ar: 'تم بحمد الله' },
    });
    assert.equal(r.statusCode, 503);
    const body = r.json();
    assert.equal(body.error, 'database_not_configured');
    assert.ok(/قاعدة البيانات/.test(body.message_ar));
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('Sprint38 — privacy/status never leaks raw email or DSN', async () => {
  const s = envSnap();
  process.env.DATABASE_URL = 'postgres://sprint38_leak:sprint38_pw@127.0.0.99:5432/sprint38_db';
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/privacy/status' });
    const raw = r.body;
    assert.ok(!raw.includes('sprint38_leak'));
    assert.ok(!raw.includes('sprint38_pw'));
    assert.ok(!raw.includes('sprint38_db'));
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('Sprint38 — child-safety statement is reachable (no PII)', async () => {
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/privacy/child-safety' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(typeof body.child_safety.title_ar, 'string');
    // Spot-check: must NOT request phone, address, or email from children.
    assert.ok(!/.*?(?:بريد|إيميل|email).*/.test(body.child_safety.body_ar.toLowerCase()) ||
              /لا (نطلب|نحفظ)/.test(body.child_safety.body_ar));
  } finally {
    await app.close();
  }
});
