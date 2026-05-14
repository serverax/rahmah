import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  submitQuestion,
  getQuestion,
  draftSheikhAnswer,
  listPublicAnswers,
  saveGameProgress,
  donationsProvider,
  recordDonationIntent,
  registerDevice,
} from '../src/services/mobile-services.js';
import {
  _resetSheikhRepositoryForTests,
  configureSheikhRepository,
} from '../src/sheikh/sheikh-question-repository.js';

function envSnap() {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    DONATION_PROVIDER: process.env.DONATION_PROVIDER,
  };
}
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

test('Sprint44 — submitQuestion: no DB → persisted=false, pending_review_local_only', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  const r = await submitQuestion({ question_ar: 'سؤال' });
  assert.equal(r.persisted, false);
  assert.equal(r.status, 'pending_review_local_only');
  envRestore(s);
});

test('Sprint44 — getQuestion: no DB → service_not_configured', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  const r = await getQuestion('q1');
  assert.equal(r.persisted, false);
  assert.equal(r.reason, 'database_not_configured');
  envRestore(s);
});

test('Sprint44 — draftSheikhAnswer: empty citations → insufficient_citation, persisted=false', async () => {
  const r = await draftSheikhAnswer({
    question_id: 'q1', sheikh_user_id: 's1',
    answer_ar: 'نص الجواب', citations: [], publication_mode: 'public',
  });
  assert.equal(r.persisted, false);
  assert.equal(r.citation_status, 'insufficient_citation');
});

test('Sprint44 — draftSheikhAnswer: scholar_note only with no DB → local-only, citation_status=scholar_advice_needs_review', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  const r = await draftSheikhAnswer({
    question_id: 'q1', sheikh_user_id: 's1',
    answer_ar: 'نص الجواب',
    citations: [{ citation_type: 'scholar_note', citation_label: 'note' }],
    publication_mode: 'public',
  });
  assert.equal(r.persisted, false);
  assert.equal(r.citation_status, 'scholar_advice_needs_review');
  envRestore(s);
});

test('Sprint44 — draftSheikhAnswer: quran-cited + DB unset → local-only with pending_moderation_local_only', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  const r = await draftSheikhAnswer({
    question_id: 'q1', sheikh_user_id: 's1',
    answer_ar: 'نص الجواب',
    citations: [{ citation_type: 'quran', citation_label: 'Al-Baqarah 2:255' }],
    publication_mode: 'public',
  });
  assert.equal(r.persisted, false);
  assert.equal(r.citation_status, 'quran_cited');
  assert.equal(r.next_publication_status, 'pending_moderation_local_only');
  envRestore(s);
});

test('Sprint44 — listPublicAnswers: no DB → configured=false, items=[]', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  _resetSheikhRepositoryForTests();
  const r = await listPublicAnswers();
  assert.equal(r.configured, false);
  assert.deepEqual(r.items, []);
  envRestore(s);
});

test('Sprint44 — saveGameProgress: no DB → local_only', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  const r = await saveGameProgress({ scenario_id: 'salah-order-1', attempts_count: 3, correct_count: 2 });
  assert.equal(r.persisted, false);
  assert.equal(r.status, 'local_only');
  envRestore(s);
});

test('Sprint44 — donations provider: default disabled, env can promote', () => {
  const s = envSnap();
  delete process.env.DONATION_PROVIDER;
  assert.equal(donationsProvider(), 'disabled');
  process.env.DONATION_PROVIDER = 'stripe';
  assert.equal(donationsProvider(), 'stripe');
  process.env.DONATION_PROVIDER = 'invalid';
  assert.equal(donationsProvider(), 'disabled');
  envRestore(s);
});

test('Sprint44 — recordDonationIntent: provider disabled → provider_disabled', async () => {
  const s = envSnap();
  delete process.env.DONATION_PROVIDER;
  const r = await recordDonationIntent({ amount_cents: 1000, currency: 'USD', cause_id: 'sadaqah_zakat' });
  assert.equal(r.persisted, false);
  assert.equal(r.status, 'provider_disabled');
  envRestore(s);
});

test('Sprint44 — recordDonationIntent: provider enabled + no DB → storage_not_configured', async () => {
  const s = envSnap();
  process.env.DONATION_PROVIDER = 'stripe';
  delete process.env.DATABASE_URL;
  const r = await recordDonationIntent({ amount_cents: 1000, currency: 'USD', cause_id: 'sadaqah_zakat' });
  assert.equal(r.persisted, false);
  assert.equal(r.status, 'storage_not_configured');
  envRestore(s);
});

test('Sprint44 — registerDevice: no DB → persisted=false', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  const r = await registerDevice({ platform: 'android', app_version: '0.1.0' });
  assert.equal(r.persisted, false);
  envRestore(s);
});
