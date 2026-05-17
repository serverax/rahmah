import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import {
  processRahmaEvent,
  engineMetadata,
} from '../src/engine/rahma-control-engine.js';
import {
  SUPPORTED_EVENTS,
  isSupportedEvent,
  isAllowedDecision,
} from '../src/engine/engine-types.js';
import { citationGate } from '../src/engine/citation-gate.js';
import { reviewGate } from '../src/engine/review-gate.js';
import { freshnessCheck } from '../src/engine/freshness-checker.js';
import { recommend } from '../src/engine/recommendation-engine.js';
import { ingestionDecide } from '../src/engine/data-ingestion-controller.js';
import { logDecision } from '../src/engine/audit-logger.js';
import { _resetSheikhAuditForTests } from '../src/audit/sheikh-action-audit.js';

// -------------- Metadata ----------------------------------------------------

test('engineMetadata reports implemented + deterministic_rules + ≥15 events', () => {
  const m = engineMetadata();
  assert.equal(m.engine_implemented, true);
  assert.equal(m.mode, 'deterministic_rules');
  assert.ok(m.modules_loaded.length >= 9);
  assert.ok(m.supported_events.length >= 15);
  assert.ok(m.safety_rules_loaded.length >= 8);
  // No-LLM, no external-AI affordances.
  assert.ok(!m.modules_loaded.includes('openai'));
  assert.ok(!m.modules_loaded.includes('llm'));
});

test('SUPPORTED_EVENTS includes the canonical event list', () => {
  for (const e of [
    'USER_ASKED_SHEIKH_QUESTION',
    'SHEIKH_REQUESTED_PUBLISH',
    'NEW_ISLAMIC_CONTENT_ADDED',
    'CHILD_GAME_SCENARIO_ADDED',
    'CHARITY_CAMPAIGN_REQUESTED_PUBLICATION',
    'FAMILY_CHILD_PROFILE_CREATED',
    'ADMIN_REQUESTED_RECOMMENDATIONS',
  ]) {
    assert.ok(SUPPORTED_EVENTS.includes(e), `missing event ${e}`);
  }
});

test('decision allow-list is the canonical set', () => {
  for (const d of [
    'allow', 'block', 'queue_review', 'publish', 'hide',
    'recommend', 'needs_source', 'needs_auth', 'service_not_configured',
  ]) {
    assert.equal(isAllowedDecision(d), true, `must allow ${d}`);
  }
  assert.equal(isAllowedDecision('publish_without_review'), false);
});

// -------------- Validation --------------------------------------------------

test('processRahmaEvent: invalid envelope → block', async () => {
  const r = await processRahmaEvent(null);
  assert.equal(r.decision, 'block');
  assert.equal(r.reason, 'invalid_event_envelope');
});

test('processRahmaEvent: unsupported event → queue_review', async () => {
  const r = await processRahmaEvent({ event_type: 'BOGUS' });
  assert.equal(r.decision, 'queue_review');
  assert.equal(r.reason, 'unsupported_event_type');
});

test('processRahmaEvent: invalid actor_type → block', async () => {
  const r = await processRahmaEvent({ event_type: 'USER_OPENED_HOME', actor_type: 'rogue' });
  assert.equal(r.decision, 'block');
  assert.equal(r.reason, 'invalid_actor_type');
});

// -------------- Sheikh workflow gates --------------------------------------

test('SHEIKH_REQUESTED_PUBLISH without citations → block with Arabic user message', async () => {
  const r = await processRahmaEvent({
    event_type: 'SHEIKH_REQUESTED_PUBLISH',
    actor_type: 'sheikh',
    payload: { answer_text: 'إجابة بدون مصادر', citations: [] },
  });
  assert.equal(r.decision, 'block');
  assert.equal(r.reason, 'missing_citation');
  assert.ok(r.user_safe_message_ar.includes('مرجع'));
  assert.equal(r.audit_log_required, true);
});

test('SHEIKH_REQUESTED_PUBLISH with Quran citation → queue_review', async () => {
  const r = await processRahmaEvent({
    event_type: 'SHEIKH_REQUESTED_PUBLISH',
    actor_type: 'sheikh',
    payload: {
      answer_text: 'إجابة وافية',
      citations: [{ citation_type: 'quran', citation_label: 'البقرة 183' }],
    },
  });
  assert.equal(r.decision, 'queue_review');
});

test('SHEIKH_DRAFTED_ANSWER without citation still allowed (draft only)', async () => {
  const r = await processRahmaEvent({
    event_type: 'SHEIKH_DRAFTED_ANSWER',
    actor_type: 'sheikh',
    payload: { answer_text: 'مسودة' },
  });
  assert.equal(r.decision, 'allow');
});

test('USER_ASKED_SHEIKH_QUESTION: empty question → block', async () => {
  const r = await processRahmaEvent({
    event_type: 'USER_ASKED_SHEIKH_QUESTION',
    actor_type: 'user',
    payload: { question_text: 'hi' },
  });
  assert.equal(r.decision, 'block');
});

test('USER_ASKED_SHEIKH_QUESTION: valid question → queue_review + audit_required', async () => {
  const r = await processRahmaEvent({
    event_type: 'USER_ASKED_SHEIKH_QUESTION',
    actor_type: 'user',
    payload: { question_text: 'كيف تكون صفة الوضوء الصحيحة؟' },
  });
  assert.equal(r.decision, 'queue_review');
  assert.equal(r.audit_log_required, true);
});

// -------------- Ingestion --------------------------------------------------

test('NEW_ISLAMIC_CONTENT_ADDED: missing source_reference on quran → needs_source', async () => {
  const r = await processRahmaEvent({
    event_type: 'NEW_ISLAMIC_CONTENT_ADDED',
    payload: { source_type: 'quran', body_ar: 'نص قرآني', source_reference: '' },
  });
  assert.equal(r.decision, 'needs_source');
});

test('NEW_ISLAMIC_CONTENT_ADDED: dua with reference → queue_review', async () => {
  const r = await processRahmaEvent({
    event_type: 'NEW_ISLAMIC_CONTENT_ADDED',
    payload: {
      source_type: 'dua',
      body_ar: 'اللهم اجعلنا من الذاكرين',
      source_reference: 'مرجع داخلي',
    },
  });
  assert.equal(r.decision, 'queue_review');
});

// -------------- Child safety -----------------------------------------------

test('CHILD_GAME_SCENARIO_ADDED: asks personal data → block with child-safe Arabic message', async () => {
  const r = await processRahmaEvent({
    event_type: 'CHILD_GAME_SCENARIO_ADDED',
    payload: {
      body_ar: 'يا طفل اكتب رقم الجوال',
      age_band: '7-9',
    },
  });
  assert.equal(r.decision, 'block');
  assert.ok(r.user_safe_message_ar.includes('بيانات'));
});

test('CHILD_GAME_SCENARIO_ADDED: shaming language → block', async () => {
  const r = await processRahmaEvent({
    event_type: 'CHILD_GAME_SCENARIO_ADDED',
    payload: { body_ar: 'إجابتك غبية يا طفل', age_band: '7-9' },
  });
  assert.equal(r.decision, 'block');
});

test('FAMILY_CHILD_PROFILE_CREATED: PII nickname → block', async () => {
  const r = await processRahmaEvent({
    event_type: 'FAMILY_CHILD_PROFILE_CREATED',
    payload: { nickname_ar: 'محمد +966500000', age_band: '7-9' },
  });
  assert.equal(r.decision, 'block');
});

test('FAMILY_CHILD_PROFILE_CREATED: clean nickname → allow', async () => {
  const r = await processRahmaEvent({
    event_type: 'FAMILY_CHILD_PROFILE_CREATED',
    payload: { nickname_ar: 'البطل', age_band: '7-9' },
  });
  assert.equal(r.decision, 'allow');
});

// -------------- Charity ----------------------------------------------------

test('CHARITY_CAMPAIGN_REQUESTED_PUBLICATION: approved → publish', async () => {
  const r = await processRahmaEvent({
    event_type: 'CHARITY_CAMPAIGN_REQUESTED_PUBLICATION',
    payload: { verification_status: 'approved' },
  });
  assert.equal(r.decision, 'publish');
});

test('CHARITY_CAMPAIGN_REQUESTED_PUBLICATION: pending → queue_review', async () => {
  const r = await processRahmaEvent({
    event_type: 'CHARITY_CAMPAIGN_REQUESTED_PUBLICATION',
    payload: { verification_status: 'pending_review' },
  });
  assert.equal(r.decision, 'queue_review');
});

test('CHARITY_CAMPAIGN_REQUESTED_PUBLICATION: rejected → block', async () => {
  const r = await processRahmaEvent({
    event_type: 'CHARITY_CAMPAIGN_REQUESTED_PUBLICATION',
    payload: { verification_status: 'rejected' },
  });
  assert.equal(r.decision, 'block');
});

// -------------- Recommendations --------------------------------------------

test('recommend: filters out unapproved candidates', async () => {
  const r = await recommend({
    candidates: [
      { id: '1', title_ar: 'معتمد', verification_status: 'approved' },
      { id: '2', title_ar: 'قيد المراجعة', verification_status: 'pending_review' },
      { id: '3', title_ar: 'مرفوض', verification_status: 'rejected' },
    ],
  });
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].id, '1');
});

test('recommend: child audience filters sensitive topics', async () => {
  const r = await recommend({
    audience: 'child',
    age_band: '4-6',
    candidates: [
      { id: '1', verification_status: 'approved', topic_tags: ['death'] },
      { id: '2', verification_status: 'approved', topic_tags: [] },
    ],
  });
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].id, '2');
});

test('recommend: returns empty when no candidates — never invents', async () => {
  const r = await recommend({ candidates: [] });
  assert.equal(r.items.length, 0);
});

// -------------- Freshness --------------------------------------------------

test('freshnessCheck: no source_reference → high priority refresh task', () => {
  const r = freshnessCheck({ source_reference: '', verification_status: 'pending_review' });
  assert.equal(r.fresh, false);
  assert.equal(r.priority, 'high');
});

test('freshnessCheck: approved + recent → fresh', () => {
  const now = Date.parse('2026-05-13T00:00:00Z');
  const updated = now - 7 * 24 * 60 * 60 * 1000;
  const r = freshnessCheck({
    source_reference: 'مرجع',
    verification_status: 'approved',
    updated_at: updated,
    now,
  });
  assert.equal(r.fresh, true);
  assert.equal(r.priority, 'low');
});

// -------------- Routes -----------------------------------------------------

test('GET /api/engine/status reports implemented=true', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/engine/status' });
    const body = res.json();
    assert.equal(body.engine_implemented, true);
    assert.equal(body.mode, 'deterministic_rules');
    assert.ok(body.supported_events_count >= 15);
    assert.ok(body.safety_rules_count >= 8);
  } finally {
    await app.close();
  }
});

test('POST /api/engine/process-event: publish without citation → block + audit_status truthful', async () => {
  _resetSheikhAuditForTests();
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/engine/process-event',
      payload: {
        event_type: 'SHEIKH_REQUESTED_PUBLISH',
        actor_type: 'sheikh',
        payload: { answer_text: 'إجابة', citations: [] },
      },
    });
    const body = res.json();
    assert.equal(body.decision, 'block');
    assert.equal(body.reason, 'missing_citation');
    assert.ok(body.user_safe_message_ar.includes('مرجع'));
    // No DB wired → audit_status must reflect it honestly.
    assert.ok(
      body.audit_status === 'not_persisted_storage_not_configured' ||
      body.audit_status === 'not_persisted_event_not_routed',
      `unexpected audit_status: ${body.audit_status}`,
    );
  } finally {
    await app.close();
  }
});

test('POST /api/engine/process-event: validates event_type via schema', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/engine/process-event',
      payload: {}, // missing event_type
    });
    assert.equal(res.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('GET /api/engine/recommendations returns empty list when no candidates wired', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/engine/recommendations' });
    const body = res.json();
    assert.equal(body.ok, true);
    assert.deepEqual(body.items, []);
    assert.ok(body.message_ar.includes('لا توجد'));
  } finally {
    await app.close();
  }
});

test('GET /api/engine/review-queue returns 503 service_not_configured without DB', async () => {
  const prev = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/engine/review-queue' });
    assert.equal(res.statusCode, 503);
    const body = res.json();
    assert.equal(body.error, 'service_not_configured');
  } finally {
    await app.close();
    if (prev === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = prev;
  }
});

// -------------- Audit-logger contract --------------------------------------

test('logDecision returns not_persisted_storage_not_configured without pool', async () => {
  _resetSheikhAuditForTests();
  const r = await logDecision({
    action: 'public_qa_published',
    target_type: 'answer',
    target_id: 'a-1',
  });
  assert.equal(r.audit_status, 'not_persisted_storage_not_configured');
});

test('logDecision routes unknown action to not_persisted_event_not_routed', async () => {
  const r = await logDecision({
    action: 'rogue_action',
    target_type: 'x',
    target_id: 'y',
  });
  assert.equal(r.audit_status, 'not_persisted_event_not_routed');
});

// -------------- Sub-gates ---------------------------------------------------

test('citationGate: empty answer → block empty_answer_text', () => {
  const r = citationGate({ answer_text: '', citations: [] });
  assert.equal(r.decision, 'block');
  assert.equal(r.reason, 'empty_answer_text');
});

test('reviewGate: approved → allow; rejected → block; pending → queue_review', () => {
  assert.equal(reviewGate({ verification_status: 'approved' }).decision, 'allow');
  assert.equal(reviewGate({ verification_status: 'rejected' }).decision, 'block');
  assert.equal(reviewGate({ verification_status: 'pending_review' }).decision, 'queue_review');
});

test('ingestionDecide: still surfaces engine-level decisions', () => {
  const r = ingestionDecide({
    source_type: 'quran',
    body_ar: 'نص قرآني صالح',
    source_reference: '',
  });
  assert.equal(r.decision, 'needs_source');
});

// -------------- isSupportedEvent / canonical --------------------------------

test('isSupportedEvent rejects empty / non-string', () => {
  assert.equal(isSupportedEvent(''), false);
  assert.equal(isSupportedEvent(null), false);
  assert.equal(isSupportedEvent(123), false);
  assert.equal(isSupportedEvent('USER_OPENED_HOME'), true);
});
