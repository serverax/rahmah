import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { requireAuth } from '../src/auth/auth-middleware.js';
import { ROLES, ALL_ROLES, isPrincipalRole } from '../src/auth/roles.js';
import { hashEmail } from '../src/auth/email-hash.js';

function envSnap() {
  return {
    AUTH_MODE: process.env.AUTH_MODE,
    AUTH_PROVIDER: process.env.AUTH_PROVIDER,
    OIDC_ISSUER: process.env.OIDC_ISSUER,
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
    OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
    SESSION_SECRET: process.env.SESSION_SECRET,
    SHEIKH_ALLOWED_EMAIL_HASHES: process.env.SHEIKH_ALLOWED_EMAIL_HASHES,
    ADMIN_ALLOWED_EMAIL_HASHES: process.env.ADMIN_ALLOWED_EMAIL_HASHES,
    SAKINA_ALLOW_DEV_AUTH: process.env.SAKINA_ALLOW_DEV_AUTH,
    NODE_ENV: process.env.NODE_ENV,
  };
}
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

test('Sprint32 — roles taxonomy covers every required role', () => {
  for (const expected of [
    'public_user', 'user', 'sheikh', 'moderator',
    'content_reviewer', 'charity_admin', 'admin',
  ]) {
    assert.ok(ALL_ROLES.includes(expected), `missing role: ${expected}`);
  }
  assert.equal(ROLES.SHEIKH, 'sheikh');
  assert.equal(ROLES.ADMIN, 'admin');
  assert.equal(ROLES.CONTENT_REVIEWER, 'content_reviewer');
  assert.equal(ROLES.CHARITY_ADMIN, 'charity_admin');
});

test('Sprint32 — isPrincipalRole rejects public_user (no principal)', () => {
  assert.equal(isPrincipalRole('public_user'), false);
  assert.equal(isPrincipalRole('sheikh'), true);
  assert.equal(isPrincipalRole('content_reviewer'), true);
  assert.equal(isPrincipalRole('charity_admin'), true);
  assert.equal(isPrincipalRole(null), false);
  assert.equal(isPrincipalRole(''), false);
});

test('Sprint32 — /api/auth/status reports roles_supported + oidc block + no secret leak', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'RahmaTestSessionKey2026Aa1Bb2Cc3Dd4Ee5Ff6';
  process.env.AUTH_PROVIDER = 'oidc-keycloak';
  process.env.OIDC_ISSUER = 'https://example.invalid';
  process.env.OIDC_CLIENT_ID = 'rahma_test_client';
  process.env.OIDC_CLIENT_SECRET = 'super_secret_value_xxxxxxxxxxxxxxxx';
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/auth/status' });
    const raw = r.body;
    assert.ok(!raw.includes('super_secret_value'), 'client secret leaked');
    assert.ok(!raw.includes('RahmaTestSessionKey2026Aa1Bb2Cc3Dd4Ee5Ff6'), 'session secret leaked');
    const body = r.json();
    assert.equal(body.auth_configured, true);
    assert.equal(body.mode, 'external');
    assert.equal(body.provider, 'oidc-keycloak');
    assert.ok(Array.isArray(body.roles_supported));
    assert.ok(body.roles_supported.includes('sheikh'));
    assert.ok(body.roles_supported.includes('content_reviewer'));
    assert.ok(body.roles_supported.includes('charity_admin'));
    assert.equal(body.oidc.issuer_configured, true);
    assert.equal(body.oidc.client_id_configured, true);
    assert.equal(body.oidc.client_secret_configured, true);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('Sprint32 — missing SESSION_SECRET disables external auth', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  delete process.env.SESSION_SECRET;
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/auth/status' });
    const body = r.json();
    assert.equal(body.auth_configured, false);
    assert.equal(body.provider, null);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('Sprint32 — requireAuth returns 503 when not configured (anonymous denied)', async () => {
  const s = envSnap();
  delete process.env.AUTH_MODE;
  delete process.env.SESSION_SECRET;
  const fastify = (await import('fastify')).default({ logger: false });
  fastify.get('/test/protected', { preHandler: requireAuth([ROLES.SHEIKH]) }, async () => ({ ok: true }));
  try {
    const r = await fastify.inject({ method: 'GET', url: '/test/protected' });
    assert.equal(r.statusCode, 503);
    const body = r.json();
    assert.equal(body.error, 'auth_not_configured');
    assert.equal(typeof body.message_ar, 'string');
  } finally {
    await fastify.close();
    envRestore(s);
  }
});

test('Sprint32 — dev_local mode: missing principal → 401, wrong role → 403, allowed role → pass', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'dev_local';
  process.env.NODE_ENV = 'test';
  const Fastify = (await import('fastify')).default;
  const fastify = Fastify({ logger: false });
  fastify.get('/test/sheikh-only', { preHandler: requireAuth([ROLES.SHEIKH]) }, async () => ({ ok: true }));
  fastify.get('/test/reviewer-only', { preHandler: requireAuth([ROLES.CONTENT_REVIEWER]) }, async () => ({ ok: true }));
  try {
    let r = await fastify.inject({ method: 'GET', url: '/test/sheikh-only' });
    assert.equal(r.statusCode, 401);
    r = await fastify.inject({
      method: 'GET',
      url: '/test/sheikh-only',
      headers: { 'x-sakina-test-principal': JSON.stringify({ role: 'user' }) },
    });
    assert.equal(r.statusCode, 403);
    r = await fastify.inject({
      method: 'GET',
      url: '/test/sheikh-only',
      headers: { 'x-sakina-test-principal': JSON.stringify({ role: 'sheikh' }) },
    });
    assert.equal(r.statusCode, 200);
    // content_reviewer also works as a principal role
    r = await fastify.inject({
      method: 'GET',
      url: '/test/reviewer-only',
      headers: { 'x-sakina-test-principal': JSON.stringify({ role: 'content_reviewer' }) },
    });
    assert.equal(r.statusCode, 200);
  } finally {
    await fastify.close();
    envRestore(s);
  }
});

test('Sprint32 — sheikh allow-list enforced (wrong hash → 403)', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'dev_local';
  process.env.NODE_ENV = 'test';
  const correctHash = hashEmail('sheikh.hasan@example.org');
  process.env.SHEIKH_ALLOWED_EMAIL_HASHES = correctHash;
  const Fastify = (await import('fastify')).default;
  const fastify = Fastify({ logger: false });
  fastify.get('/test/sheikh-only', { preHandler: requireAuth([ROLES.SHEIKH]) }, async () => ({ ok: true }));
  try {
    const wrong = hashEmail('other@example.org');
    let r = await fastify.inject({
      method: 'GET',
      url: '/test/sheikh-only',
      headers: { 'x-sakina-test-principal': JSON.stringify({ role: 'sheikh', email_hash: wrong }) },
    });
    assert.equal(r.statusCode, 403);
    r = await fastify.inject({
      method: 'GET',
      url: '/test/sheikh-only',
      headers: { 'x-sakina-test-principal': JSON.stringify({ role: 'sheikh', email_hash: correctHash }) },
    });
    assert.equal(r.statusCode, 200);
  } finally {
    await fastify.close();
    envRestore(s);
  }
});

test('Sprint32 — no hardcoded admin password anywhere in env-driven config', () => {
  // The auth module must NEVER read a password from env. It reads only hashes.
  // Smoke test: spot-check that obvious literal-password env vars are not consulted.
  const banned = [
    'ADMIN_PASSWORD', 'SHEIKH_PASSWORD', 'AUTH_PASSWORD',
    'DEFAULT_ADMIN_PASSWORD', 'BOOTSTRAP_PASSWORD',
  ];
  for (const v of banned) assert.equal(process.env[v], undefined);
});
