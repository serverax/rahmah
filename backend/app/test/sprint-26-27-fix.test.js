import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import { buildApp } from '../src/app.js';
import {
  getAuthMode,
  isAuthConfigured,
  isSheikhLoginEnabled,
  isAdminLoginEnabled,
  getAllowedSheikhEmailHashes,
} from '../src/auth/auth-config.js';
import { requireAuth } from '../src/auth/auth-middleware.js';
import { hashEmail, isValidEmailHash } from '../src/auth/email-hash.js';
import { _resetClientPoolForTests } from '../src/db/client.js';
import { _resetPoolForTests as _resetHealthPoolForTests } from '../src/db/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, '..', '..', '..');

function envSnap() {
  return {
    AUTH_MODE: process.env.AUTH_MODE,
    SESSION_SECRET: process.env.SESSION_SECRET,
    AUTH_SHEIKH_LOGIN: process.env.AUTH_SHEIKH_LOGIN,
    AUTH_ADMIN_LOGIN: process.env.AUTH_ADMIN_LOGIN,
    SHEIKH_ALLOWED_EMAIL_HASHES: process.env.SHEIKH_ALLOWED_EMAIL_HASHES,
    SAKINA_ALLOW_DEV_AUTH: process.env.SAKINA_ALLOW_DEV_AUTH,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
  };
}
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

function resetAllPools() {
  _resetClientPoolForTests();
  _resetHealthPoolForTests();
}

// ============================================================
// FIX 1 — Sprint 26 auth
// ============================================================

test('S26 fix: hashEmail produces 64-char hex; rejects empty / non-string', () => {
  const h = hashEmail('Alice@Example.COM');
  assert.ok(isValidEmailHash(h));
  assert.equal(hashEmail(''), null);
  assert.equal(hashEmail(123), null);
});

test('S26 fix: auth defaults to not_configured', () => {
  const s = envSnap();
  delete process.env.AUTH_MODE;
  delete process.env.SESSION_SECRET;
  assert.equal(getAuthMode(), 'not_configured');
  assert.equal(isAuthConfigured(), false);
  assert.equal(isSheikhLoginEnabled(), false);
  assert.equal(isAdminLoginEnabled(), false);
  envRestore(s);
});

test('S26 fix: external mode requires SESSION_SECRET ≥ 32 chars', () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  delete process.env.SESSION_SECRET;
  assert.equal(isAuthConfigured(), false);
  process.env.SESSION_SECRET = 'RahmaTestSessionKey2026Aa1Bb2Cc3Dd4Ee5Ff6';
  assert.equal(isAuthConfigured(), true);
  envRestore(s);
});

test('S26 fix: getAllowedSheikhEmailHashes parses only 64-char hex hashes', () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'dev_local';
  process.env.NODE_ENV = 'test';
  process.env.SHEIKH_ALLOWED_EMAIL_HASHES = `${'a'.repeat(64)},shortvalue,${'b'.repeat(64)}`;
  const set = getAllowedSheikhEmailHashes();
  assert.equal(set.size, 2);
  envRestore(s);
});

test('S26 fix: GET /api/auth/status reachable + default not_configured', async () => {
  const s = envSnap();
  delete process.env.AUTH_MODE;
  delete process.env.SESSION_SECRET;
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/auth/status' });
    assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.auth_configured, false);
    assert.equal(body.mode, 'not_configured');
    assert.equal(body.sheikh_login_enabled, false);
    assert.equal(body.admin_login_enabled, false);
    assert.ok(body.safe_message_ar.includes('غير مفعل'));
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('S26 fix: /api/auth/status never leaks SESSION_SECRET', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'leak_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/auth/status' });
    assert.ok(!res.body.includes('leak_secret_xxxxxxx'));
  } finally {
    await app.close();
    envRestore(s);
  }
});

async function buildTinyProtected(roles) {
  const app = Fastify({ logger: false, disableRequestLogging: true });
  app.get('/protected', { preHandler: requireAuth(roles) }, async () => ({ ok: true }));
  app.get('/open', async () => ({ ok: true, public: true }));
  return app;
}

test('S26 fix: requireAuth returns 503 when auth_not_configured', async () => {
  const s = envSnap();
  delete process.env.AUTH_MODE;
  const app = await buildTinyProtected(['sheikh']);
  try {
    const res = await app.inject({ method: 'GET', url: '/protected' });
    assert.equal(res.statusCode, 503);
    assert.equal(res.json().error, 'auth_not_configured');
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('S26 fix: requireAuth returns 401 when configured but no principal', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'dev_local';
  process.env.NODE_ENV = 'test';
  const app = await buildTinyProtected(['sheikh']);
  try {
    const res = await app.inject({ method: 'GET', url: '/protected' });
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().error, 'unauthenticated');
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('S26 fix: requireAuth allows dev principal for matching role', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'dev_local';
  process.env.NODE_ENV = 'test';
  const app = await buildTinyProtected(['sheikh', 'admin']);
  try {
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { 'x-sakina-test-principal': JSON.stringify({ role: 'sheikh', user_id: 'u-1' }) },
    });
    assert.equal(res.statusCode, 200);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('S26 fix: requireAuth returns 403 for wrong role', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'dev_local';
  process.env.NODE_ENV = 'test';
  const app = await buildTinyProtected(['admin']);
  try {
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { 'x-sakina-test-principal': JSON.stringify({ role: 'sheikh', user_id: 'u-1' }) },
    });
    assert.equal(res.statusCode, 403);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('S26 fix: existing Sheikh routes still blocked when auth missing', async () => {
  const s = envSnap();
  delete process.env.SHEIKH_AUTH_REQUIRED;
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/sheikh-hasan/sheikh/questions' });
    // Existing requireRole (sheikh-auth-policy) returns 503 auth_not_configured.
    assert.equal(res.statusCode, 503);
    assert.equal(res.json().error, 'auth_not_configured');
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('S26 fix: public routes remain public without auth', async () => {
  const app = buildApp();
  try {
    for (const url of [
      '/health',
      '/ready',
      '/api/auth/status',
      '/api/public/sheikh-hasan/qa',
      '/api/library/status',
      '/api/library/categories',
      '/api/privacy/status',
      '/api/terms/status',
      '/api/rag/status',
      '/api/engine/status',
    ]) {
      const res = await app.inject({ method: 'GET', url });
      assert.notEqual(res.statusCode, 401, `${url} unexpected 401`);
      assert.notEqual(res.statusCode, 403, `${url} unexpected 403`);
      assert.notEqual(res.statusCode, 404, `${url} 404 — route missing`);
    }
  } finally {
    await app.close();
  }
});

test('S26 fix: no hardcoded password / token literals inside src/auth/*', async () => {
  const dir = path.join(REPO, 'backend', 'app', 'src', 'auth');
  for (const f of await fs.readdir(dir)) {
    const txt = await fs.readFile(path.join(dir, f), 'utf8');
    assert.ok(!/password\s*=\s*['"][A-Za-z0-9]{6,}['"]/.test(txt), `${f} hardcoded password literal`);
    assert.ok(!/token\s*=\s*['"][A-Za-z0-9]{20,}['"]/.test(txt), `${f} hardcoded token literal`);
  }
});

test('S26 fix: sheikh-login.html shows Arabic not-configured message + no fake password input', async () => {
  const html = await fs.readFile(path.join(REPO, 'apps', 'web', 'public', 'sheikh-login.html'), 'utf8');
  assert.ok(/<html\s+lang="ar"\s+dir="rtl">/i.test(html));
  // Login page must not have a working password input that pretends to authenticate.
  assert.ok(!/<input[^>]*type="password"[^>]*>/i.test(html), 'fake password input present');
  // Arabic not-configured message is in the existing sheikh.js dictionary used by this page.
  const sheikhJs = await fs.readFile(path.join(REPO, 'apps', 'web', 'public', 'assets', 'sheikh.js'), 'utf8');
  assert.ok(sheikhJs.includes('تسجيل دخول الشيخ غير مفعل بعد'));
});

// ============================================================
// FIX 2 — Sprint 27 DB status
// ============================================================

test('S27 fix: GET /api/db/status reachable + database_configured=false when DATABASE_URL missing', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  resetAllPools();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/db/status' });
    assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.database_configured, false);
    assert.equal(body.database_reachable, false);
    assert.equal(body.migration_table_exists, false);
    assert.equal(body.applied_migrations_count, 0);
    assert.equal(body.pending_migrations_count, null);
    assert.ok(body.safe_message_ar.includes('غير مفعلة'));
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('S27 fix: /api/db/status reachable=false when DATABASE_URL set but host unroutable', async () => {
  const s = envSnap();
  process.env.DATABASE_URL = 'postgres://x:y@127.0.0.99:65530/z';
  resetAllPools();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/db/status' });
    const body = res.json();
    assert.equal(body.database_configured, true);
    assert.equal(body.database_reachable, false);
    assert.equal(body.migration_table_exists, false);
    // Must not echo the DSN.
    assert.ok(!res.body.includes('127.0.0.99'));
    assert.ok(!res.body.includes('postgres://'));
  } finally {
    await app.close();
    envRestore(s);
    resetAllPools();
  }
});

test('S27 fix: /ready still surfaces DB truth + does not leak DATABASE_URL', async () => {
  const s = envSnap();
  process.env.DATABASE_URL = 'postgres://leak_user:leak_pass@127.0.0.99:5432/leak_db';
  resetAllPools();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    assert.equal(typeof body.database, 'object');
    assert.equal(body.database.configured, true);
    // Will be false because the host is unreachable.
    assert.equal(body.database.connected, false);
    assert.ok(!res.body.includes('leak_user'));
    assert.ok(!res.body.includes('leak_pass'));
    assert.ok(!res.body.includes('leak_db'));
  } finally {
    await app.close();
    envRestore(s);
    resetAllPools();
  }
});

test('S27 fix: package.json has db:migrate + db:check scripts', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(REPO, 'backend', 'app', 'package.json'), 'utf8'));
  assert.ok(pkg.scripts['db:migrate']);
  assert.ok(pkg.scripts['db:check']);
});

test('S27 fix: /api/rag/status remains foundation when DB missing', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  resetAllPools();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/rag/status' });
    const body = res.json();
    assert.equal(body.mode, 'foundation');
    assert.equal(body.safe_to_answer_from_rag, false);
  } finally {
    await app.close();
    envRestore(s);
  }
});
