import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { _DONATION_TEST_HELPERS } from '../src/routes/donations.js';

function envSnap() {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    DONATION_PROVIDER: process.env.DONATION_PROVIDER,
    AUTH_MODE: process.env.AUTH_MODE,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };
}
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

test('mobile-delivery: /health reports rahma-api (legacy: sakina-backend)', async () => {
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/health' });
    const body = r.json();
    assert.equal(body.service, 'rahma-api');
    assert.equal(body.legacy_service_name, 'sakina-backend');
  } finally {
    await app.close();
  }
});

test('mobile-delivery: /ready reports platform=mobile-only + public_ingress=disabled', async () => {
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const body = r.json();
    assert.equal(body.service, 'rahma-api');
    assert.equal(body.platform, 'mobile-only');
    assert.equal(body.public_ingress, 'disabled');
    // never echoes a DSN in /ready body (defense-in-depth)
    assert.ok(!r.body.includes('postgres://'));
  } finally {
    await app.close();
  }
});

test('mobile-delivery: POST /api/sheikh/login → 503 auth_not_configured + Arabic guidance', async () => {
  const s = envSnap();
  delete process.env.AUTH_MODE;
  delete process.env.SESSION_SECRET;
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'POST', url: '/api/sheikh/login', payload: { email: 'x@y.z', password: 'redacted' } });
    assert.equal(r.statusCode, 503);
    const body = r.json();
    assert.equal(body.error, 'auth_not_configured');
    assert.equal(body.password_grant_supported, false);
    assert.equal(typeof body.guidance_ar, 'string');
    assert.ok(body.guidance_ar.length > 0);
    // never echoes any password value
    assert.ok(!r.body.includes('redacted'));
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('mobile-delivery: POST /api/sheikh/login when AUTH_MODE=external → password_grant_not_supported', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'a'.repeat(32);
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'POST', url: '/api/sheikh/login', payload: {} });
    assert.equal(r.statusCode, 400);
    const body = r.json();
    assert.equal(body.error, 'password_grant_not_supported');
    assert.equal(body.mode, 'external');
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('mobile-delivery: POST /api/donations/intent — provider_disabled by default', async () => {
  const s = envSnap();
  delete process.env.DONATION_PROVIDER;
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    const r = await app.inject({
      method: 'POST', url: '/api/donations/intent',
      payload: { amount_cents: 1000, currency: 'USD', cause_id: 'sadaqah_zakat' },
    });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.status, 'provider_disabled');
    assert.equal(body.provider, 'disabled');
    assert.equal(body.persisted, false);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('mobile-delivery: POST /api/donations/intent — schema rejects invalid amounts', async () => {
  const s = envSnap();
  process.env.DONATION_PROVIDER = 'stripe';
  const app = buildApp();
  try {
    let r = await app.inject({ method: 'POST', url: '/api/donations/intent', payload: { amount_cents: 0, currency: 'USD', cause_id: 'sadaqah_zakat' } });
    assert.equal(r.statusCode, 400);
    r = await app.inject({ method: 'POST', url: '/api/donations/intent', payload: { amount_cents: 500, currency: 'US', cause_id: 'sadaqah_zakat' } });
    assert.equal(r.statusCode, 400);
    r = await app.inject({ method: 'POST', url: '/api/donations/intent', payload: { amount_cents: 500, currency: 'USD', cause_id: '' } });
    assert.equal(r.statusCode, 400);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('mobile-delivery: POST /api/donations/intent — provider enabled + no DB → storage_not_configured', async () => {
  const s = envSnap();
  process.env.DONATION_PROVIDER = 'stripe';
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    const r = await app.inject({
      method: 'POST', url: '/api/donations/intent',
      payload: { amount_cents: 1000, currency: 'USD', cause_id: 'sadaqah_zakat' },
    });
    const body = r.json();
    assert.equal(body.status, 'storage_not_configured');
    assert.equal(body.provider, 'stripe');
    assert.equal(body.persisted, false);
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('mobile-delivery: GET /api/donations/status/:id — invalid id rejected', async () => {
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/donations/status/' + 'a'.repeat(80) });
    assert.equal(r.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('mobile-delivery: GET /api/donations/status/:id — provider disabled response', async () => {
  const s = envSnap();
  delete process.env.DONATION_PROVIDER;
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/donations/status/abc123' });
    const body = r.json();
    assert.equal(body.intent_id, 'abc123');
    assert.equal(body.status, 'provider_disabled');
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('mobile-delivery: donations helper — provider name + enabled flag', () => {
  const s = envSnap();
  try {
    delete process.env.DONATION_PROVIDER;
    assert.equal(_DONATION_TEST_HELPERS.providerName(), 'disabled');
    assert.equal(_DONATION_TEST_HELPERS.providerEnabled(), false);
    process.env.DONATION_PROVIDER = 'PAYPAL';
    assert.equal(_DONATION_TEST_HELPERS.providerName(), 'paypal');
    assert.equal(_DONATION_TEST_HELPERS.providerEnabled(), true);
    process.env.DONATION_PROVIDER = 'invalid_provider';
    assert.equal(_DONATION_TEST_HELPERS.providerName(), 'disabled');
  } finally {
    envRestore(s);
  }
});

test('mobile-delivery: /api/mobile/status announces public_ingress=disabled + 4 WASM modules', async () => {
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/mobile/status' });
    const body = r.json();
    assert.equal(body.public_ingress, 'disabled');
    assert.equal(body.platform, 'mobile-only');
    assert.equal(body.wasm.modules.length, 4);
    assert.ok(body.wasm.modules.includes('fatwa-policy-gate'));
    assert.ok(body.wasm.modules.includes('quran-hadith-citation'));
    assert.ok(body.wasm.modules.includes('child-safety'));
    assert.ok(body.wasm.modules.includes('content-rule-engine'));
  } finally {
    await app.close();
  }
});
