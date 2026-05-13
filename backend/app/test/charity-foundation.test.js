import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from '../src/app.js';
import {
  CAMPAIGN_CATEGORIES,
  isPubliclyListable,
  evaluateDonationIntent,
  publicCampaignProjection,
} from '../src/charity/campaign-policy.js';
import {
  configureCharityRepository,
  _resetCharityRepositoryForTests,
} from '../src/routes/charity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'db', 'migrations');

function envSnapshot() { return { CHARITY_PAYMENT_PROVIDER_STATUS: process.env.CHARITY_PAYMENT_PROVIDER_STATUS }; }
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

before(() => _resetCharityRepositoryForTests());
after(() => _resetCharityRepositoryForTests());

// -------------- Migration ----------------------------------------------------

test('migration 006 declares charity tables', async () => {
  const t = await fs.readFile(path.join(MIGRATIONS_DIR, '006_charity_campaigns.sql'), 'utf8');
  for (const tbl of [
    'charity_campaigns',
    'charity_campaign_updates',
    'charity_donation_intents',
    'charity_payment_provider_config',
    'charity_transparency_logs',
  ]) {
    assert.ok(new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${tbl}\\b`).test(t), `missing ${tbl}`);
  }
});

test('migration 006: no real provider secrets / no card columns', async () => {
  const t = await fs.readFile(path.join(MIGRATIONS_DIR, '006_charity_campaigns.sql'), 'utf8');
  // Reject anything that looks like a stored card / cvv / iban / etc.
  assert.ok(!/card_number/i.test(t),  'no card_number column');
  assert.ok(!/cvv/i.test(t),          'no cvv column');
  assert.ok(!/\bpan\b/i.test(t),      'no pan column');
  assert.ok(!/iban/i.test(t),         'no iban column');
  assert.ok(!/STRIPE_SECRET/i.test(t),'no provider-secret literal');
});

// -------------- Policy ------------------------------------------------------

test('CAMPAIGN_CATEGORIES is the expected closed set', () => {
  assert.ok(CAMPAIGN_CATEGORIES.includes('food_relief'));
  assert.ok(CAMPAIGN_CATEGORIES.includes('orphan_support'));
  assert.ok(!CAMPAIGN_CATEGORIES.includes('investment'));
});

test('isPubliclyListable: requires active + approved + title + description', () => {
  assert.equal(isPubliclyListable(null), false);
  assert.equal(isPubliclyListable({}), false);
  assert.equal(isPubliclyListable({
    status: 'active', verification_status: 'approved',
    title_ar: 't', description_ar: 'd',
  }), true);
  assert.equal(isPubliclyListable({
    status: 'draft', verification_status: 'approved',
    title_ar: 't', description_ar: 'd',
  }), false);
  assert.equal(isPubliclyListable({
    status: 'active', verification_status: 'pending_review',
    title_ar: 't', description_ar: 'd',
  }), false);
});

test('evaluateDonationIntent: provider disabled → provider_not_configured + Arabic message', () => {
  const r = evaluateDonationIntent({
    campaign: {
      status: 'active', verification_status: 'approved',
      title_ar: 't', description_ar: 'd',
    },
    amount: 10,
    provider_status: 'disabled',
  });
  assert.equal(r.decision, 'provider_not_configured');
  assert.ok(r.user_message_ar.includes('الدفع غير مفعل'));
});

test('evaluateDonationIntent: campaign not active → block', () => {
  const r = evaluateDonationIntent({
    campaign: {
      status: 'draft', verification_status: 'approved',
      title_ar: 't', description_ar: 'd',
    },
    amount: 10,
    provider_status: 'sandbox',
  });
  assert.equal(r.decision, 'block');
});

test('evaluateDonationIntent: amount <= 0 → block', () => {
  const r = evaluateDonationIntent({
    campaign: {
      status: 'active', verification_status: 'approved',
      title_ar: 't', description_ar: 'd',
    },
    amount: 0,
    provider_status: 'sandbox',
  });
  assert.equal(r.decision, 'block');
  assert.equal(r.reason, 'invalid_amount');
});

test('evaluateDonationIntent: provider sandbox + active campaign + positive amount → allow_intent_record', () => {
  const r = evaluateDonationIntent({
    campaign: {
      status: 'active', verification_status: 'approved',
      title_ar: 't', description_ar: 'd',
    },
    amount: 25,
    currency: 'USD',
    provider_status: 'sandbox',
  });
  assert.equal(r.decision, 'allow_intent_record');
});

test('publicCampaignProjection: strips no fields beyond explicit', () => {
  const row = {
    id: 'c1',
    title_ar: 't', description_ar: 'd',
    category: 'food_relief',
    target_amount: 100,
    collected_amount: 20,
    status: 'active', verification_status: 'approved',
    updated_at: '2026-05-13T00:00:00Z',
    // adversarial fields:
    admin_notes: 'leak',
    payment_provider: 'leak',
  };
  const p = publicCampaignProjection(row);
  const raw = JSON.stringify(p);
  assert.ok(!raw.includes('admin_notes'), 'projection leaked admin_notes');
  assert.ok(!raw.includes('payment_provider'), 'projection leaked payment_provider');
});

// -------------- Routes ------------------------------------------------------

test('GET /api/sadaqah/campaigns returns empty list when no repo', async () => {
  _resetCharityRepositoryForTests();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/sadaqah/campaigns' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.configured, false);
    assert.deepEqual(body.items, []);
  } finally {
    await app.close();
  }
});

test('GET /api/sadaqah/campaigns surfaces ONLY active+approved entries', async () => {
  configureCharityRepository({
    repository: {
      listPublic: async () => [
        { id: 'a', title_ar: 'ت', description_ar: 'و', category: 'food_relief',
          status: 'active', verification_status: 'approved' },
        { id: 'b', title_ar: 'ت', description_ar: 'و', category: 'food_relief',
          status: 'paused', verification_status: 'approved' },
        { id: 'c', title_ar: 'ت', description_ar: 'و', category: 'food_relief',
          status: 'active', verification_status: 'pending_review' },
      ],
      findById: async () => null,
    },
  });
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/sadaqah/campaigns' });
    const body = res.json();
    assert.equal(body.items.length, 1, 'only one approved+active should show');
    assert.equal(body.items[0].id, 'a');
  } finally {
    await app.close();
    _resetCharityRepositoryForTests();
  }
});

test('POST /api/sadaqah/campaigns/:id/donate returns provider_not_configured by default', async () => {
  const snap = envSnapshot();
  delete process.env.CHARITY_PAYMENT_PROVIDER_STATUS;
  configureCharityRepository({
    repository: {
      listPublic: async () => [],
      findById: async () => ({
        id: 'a', title_ar: 'ت', description_ar: 'و', category: 'food_relief',
        status: 'active', verification_status: 'approved',
      }),
    },
  });
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sadaqah/campaigns/a/donate',
      payload: { amount: 25, currency: 'USD' },
    });
    assert.equal(res.statusCode, 503);
    const body = res.json();
    assert.equal(body.error, 'payment_provider_not_active');
    assert.ok(body.message_ar.includes('الدفع غير مفعل'));
  } finally {
    await app.close();
    _resetCharityRepositoryForTests();
    envRestore(snap);
  }
});

test('GET /api/sadaqah/transparency renders Arabic notice + honest provider status', async () => {
  const snap = envSnapshot();
  delete process.env.CHARITY_PAYMENT_PROVIDER_STATUS;
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/sadaqah/transparency' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.provider_status, 'disabled');
    assert.ok(body.transparency.title_ar.length > 0);
    assert.ok(body.transparency.body_ar.length > 0);
    const raw = res.body;
    assert.ok(!/donation successful/i.test(raw), 'leaked fake success claim');
    assert.ok(!/payment complete/i.test(raw),    'leaked fake success claim');
  } finally {
    await app.close();
    envRestore(snap);
  }
});

test('Charity routes do not echo any English fake-success claims', async () => {
  const app = buildApp();
  try {
    for (const url of ['/api/sadaqah/campaigns', '/api/sadaqah/transparency']) {
      const res = await app.inject({ method: 'GET', url });
      const raw = res.body;
      assert.ok(!/donation successful/i.test(raw));
      assert.ok(!/payment complete/i.test(raw));
      assert.ok(!/funds transferred/i.test(raw));
      assert.ok(!/verified charity/i.test(raw));
    }
  } finally {
    await app.close();
  }
});
