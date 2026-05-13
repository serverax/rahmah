import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from '../src/app.js';
import {
  evaluateChildContent,
  evaluateChildProfileField,
  AGE_BANDS,
  isValidAgeBand,
} from '../src/family/child-safety-policy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'db', 'migrations');

// -------------- Migration ----------------------------------------------------

test('migration 005 declares the 6 family-tier tables', async () => {
  const t = await fs.readFile(path.join(MIGRATIONS_DIR, '005_family_child_safety.sql'), 'utf8');
  for (const tbl of [
    'family_accounts',
    'family_members',
    'child_profiles',
    'child_progress',
    'guardian_settings',
    'privacy_audit_log',
  ]) {
    assert.ok(new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${tbl}\\b`).test(t), `missing ${tbl}`);
  }
});

test('migration 005 forbids public_profile=TRUE for children at schema level', async () => {
  const t = await fs.readFile(path.join(MIGRATIONS_DIR, '005_family_child_safety.sql'), 'utf8');
  assert.ok(/CHECK \(public_profile = FALSE\)/.test(t), 'public_profile CHECK missing');
  assert.ok(/CHECK \(public_sharing = FALSE\)/.test(t), 'public_sharing CHECK missing');
  assert.ok(/CHECK \(is_private = TRUE\)/.test(t),     'is_private CHECK missing');
});

test('migration 005 stores email_hash, never email/phone/date_of_birth on children', async () => {
  const t = await fs.readFile(path.join(MIGRATIONS_DIR, '005_family_child_safety.sql'), 'utf8');
  // family_accounts row has email_hash; ensure no plain email/phone/dob columns
  assert.ok(!/\bemail\s+TEXT/i.test(t),         'plain email column found');
  assert.ok(!/\bphone\b/i.test(t),              'phone column found');
  assert.ok(!/date_of_birth/i.test(t),          'date_of_birth column found');
});

// -------------- child-safety-policy module ----------------------------------

test('AGE_BANDS enum frozen + matches schema', () => {
  assert.deepEqual(AGE_BANDS.slice(), ['4-6', '7-9', '10-12', '13+']);
  assert.throws(() => { AGE_BANDS.push('x'); });
});

test('isValidAgeBand: accepts/rejects correctly', () => {
  assert.equal(isValidAgeBand('4-6'), true);
  assert.equal(isValidAgeBand('14+'), false);
});

test('evaluateChildContent: blocks personal-data prompts', () => {
  const r = evaluateChildContent({ body_ar: 'يا طفل اكتب رقم الجوال', age_band: '7-9' });
  assert.equal(r.decision, 'block');
  assert.equal(r.reason, 'asks_personal_data');
});

test('evaluateChildContent: blocks shaming language', () => {
  const r = evaluateChildContent({ body_ar: 'إجابتك غبية يا طفل', age_band: '7-9' });
  assert.equal(r.decision, 'block');
  assert.equal(r.reason, 'shaming_language');
});

test('evaluateChildContent: blocks political content', () => {
  const r = evaluateChildContent({ body_ar: 'يا طفل ادخل في حزب سياسي', age_band: '10-12' });
  assert.equal(r.decision, 'block');
  assert.equal(r.reason, 'political_content');
});

test('evaluateChildContent: younger bands skip sensitive topics', () => {
  const r = evaluateChildContent({
    body_ar: 'محتوى عادي',
    age_band: '4-6',
    topic_tags: ['punishment'],
  });
  assert.equal(r.decision, 'block');
  assert.equal(r.reason, 'topic_not_for_younger_band');
});

test('evaluateChildContent: 13+ allows discussion topics that 4-6 cannot', () => {
  const r4_6 = evaluateChildContent({
    body_ar: 'محتوى ملائم',
    age_band: '4-6',
    topic_tags: ['detailed_fiqh_dispute'],
  });
  assert.equal(r4_6.decision, 'block');
  const r13 = evaluateChildContent({
    body_ar: 'محتوى ملائم',
    age_band: '13+',
    topic_tags: ['detailed_fiqh_dispute'],
  });
  assert.equal(r13.decision, 'allow');
});

test('evaluateChildContent: gentle Islamic content allowed', () => {
  const r = evaluateChildContent({
    body_ar: 'بر الوالدين من أحب الأعمال إلى الله',
    age_band: '7-9',
  });
  assert.equal(r.decision, 'allow');
});

test('evaluateChildProfileField: rejects PII-shaped nickname', () => {
  const r = evaluateChildProfileField({ field: 'nickname_ar', value: 'محمد +96650111222' });
  assert.equal(r.decision, 'block');
  assert.equal(r.reason, 'nickname_looks_like_pii');
});

test('evaluateChildProfileField: nickname OK', () => {
  const r = evaluateChildProfileField({ field: 'nickname_ar', value: 'البطل الصغير' });
  assert.equal(r.decision, 'allow');
});

test('evaluateChildProfileField: only allow-listed fields accepted', () => {
  const r = evaluateChildProfileField({ field: 'phone', value: '+966...' });
  assert.equal(r.decision, 'block');
});

// -------------- Routes ------------------------------------------------------

test('GET /api/family/privacy returns Arabic privacy notice', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/family/privacy' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(body.privacy.title_ar.length > 0);
    assert.ok(body.privacy.body_ar.length > 0);
    // No English placeholder text leak.
    const raw = res.body;
    assert.ok(!/\bPrivacy Policy\b/.test(raw), 'leaked English privacy text');
    assert.ok(!/\bHome\b/.test(raw),           'leaked English Home text');
  } finally {
    await app.close();
  }
});

test('POST /api/family/children returns 503 auth_not_configured by default', async () => {
  const prev = process.env.SHEIKH_AUTH_REQUIRED;
  delete process.env.SHEIKH_AUTH_REQUIRED;
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/family/children',
      payload: { nickname_ar: 'البطل', age_band: '7-9' },
    });
    assert.equal(res.statusCode, 503);
    assert.equal(res.json().error, 'auth_not_configured');
  } finally {
    await app.close();
    if (prev === undefined) delete process.env.SHEIKH_AUTH_REQUIRED; else process.env.SHEIKH_AUTH_REQUIRED = prev;
  }
});

test('GET /api/family/guardian/settings returns 503 auth_not_configured by default', async () => {
  const prev = process.env.SHEIKH_AUTH_REQUIRED;
  delete process.env.SHEIKH_AUTH_REQUIRED;
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/family/guardian/settings' });
    assert.equal(res.statusCode, 503);
  } finally {
    await app.close();
    if (prev === undefined) delete process.env.SHEIKH_AUTH_REQUIRED; else process.env.SHEIKH_AUTH_REQUIRED = prev;
  }
});

test('POST /api/family/children schema rejects invalid age_band', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/family/children',
      payload: { nickname_ar: 'البطل', age_band: '14+' },
    });
    assert.equal(res.statusCode, 400);
  } finally {
    await app.close();
  }
});
