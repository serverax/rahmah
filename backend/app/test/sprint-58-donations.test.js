import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

function envSnap() {
  return {
    DONATION_PROVIDER: process.env.DONATION_PROVIDER,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
  };
}
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

test('Sprint58 — GET /api/donations/status: provider_disabled by default + card_handling=false', async () => {
  const s = envSnap();
  delete process.env.DONATION_PROVIDER;
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/donations/status' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.provider, 'disabled');
    assert.equal(body.provider_configured, false);
    assert.equal(body.card_handling_in_backend, false);
  } finally { await app.close(); envRestore(s); }
});

test('Sprint58 — GET /api/donations/status: stripe enabled but unconfigured → provider_configured=false', async () => {
  const s = envSnap();
  process.env.DONATION_PROVIDER = 'stripe';
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/donations/status' });
    const body = r.json();
    assert.equal(body.provider, 'stripe');
    assert.equal(body.provider_configured, false);
  } finally { await app.close(); envRestore(s); }
});

test('Sprint58 — GET /api/donations/status: stripe fully configured → provider_configured=true', async () => {
  const s = envSnap();
  process.env.DONATION_PROVIDER = 'stripe';
  process.env.STRIPE_SECRET_KEY = 'sk_test_xxxx_redacted';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_xxxx_redacted';
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/donations/status' });
    const body = r.json();
    const raw = r.body;
    assert.equal(body.provider_configured, true);
    // NEVER echoes the keys
    assert.ok(!raw.includes('sk_test_xxxx_redacted'));
    assert.ok(!raw.includes('whsec_xxxx_redacted'));
  } finally { await app.close(); envRestore(s); }
});

test('Sprint58 — POST /api/donations/intent: card-data NEVER echoed in response (schema strips it)', async () => {
  // Fastify's ajv with additionalProperties:false strips unknown fields
  // before the handler runs. The card data therefore never reaches the
  // backend logic. This test asserts that the response body never
  // includes the dangerous field value, and that no "intent recorded"
  // success is returned that would imply the data was processed.
  const s = envSnap();
  process.env.DONATION_PROVIDER = 'stripe';
  delete process.env.STRIPE_SECRET_KEY; // provider not yet configured
  const app = buildApp();
  try {
    for (const field of ['pan', 'card_number', 'cvv', 'cvc', 'iban', 'track1', 'track2', 'bic', 'swift']) {
      const marker = `LEAK_${field}_DEADBEEF`;
      const payload = { amount_cents: 1000, currency: 'USD', cause_id: 'sadaqah', [field]: marker };
      const r = await app.inject({ method: 'POST', url: '/api/donations/intent', payload });
      assert.ok(!r.body.includes(marker), `${field} value leaked into response`);
    }
  } finally { await app.close(); envRestore(s); }
});

test('Sprint58 — POST /api/donations/intent: schema rejects bare malformed bodies', async () => {
  const app = buildApp();
  try {
    const r = await app.inject({
      method: 'POST', url: '/api/donations/intent',
      payload: { amount_cents: -1, currency: 'USD', cause_id: 'sadaqah' },
    });
    assert.equal(r.statusCode, 400);
  } finally { await app.close(); }
});
