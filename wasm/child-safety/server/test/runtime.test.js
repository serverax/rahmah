import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/index.js';
import { evaluateChildContent } from '../src/policy.js';

test('child-safety: GET /health returns runtime identity', async () => {
  const app = buildServer();
  try {
    const r = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'rahma-child-safety-wasm');
    assert.equal(typeof body.runtime_mode, 'string');
  } finally { await app.close(); }
});

test('child-safety: POST /evaluate blocks empty body', async () => {
  const app = buildServer();
  try {
    const r = await app.inject({ method: 'POST', url: '/evaluate', payload: { body_ar: '', age_band: '7-9' } });
    assert.equal(r.statusCode, 200);
    assert.equal(r.json().decision, 'block');
    assert.equal(r.json().reason, 'empty_body');
  } finally { await app.close(); }
});

test('child-safety: POST /evaluate blocks PII request in Arabic', async () => {
  const app = buildServer();
  try {
    const r = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: { body_ar: 'ما هو رقم الجوال الذي تستخدمه؟', age_band: '7-9' },
    });
    assert.equal(r.json().decision, 'block');
    assert.equal(r.json().reason, 'asks_personal_data');
  } finally { await app.close(); }
});

test('child-safety: POST /evaluate blocks shaming pattern', async () => {
  const app = buildServer();
  try {
    const r = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: { body_ar: 'أنت غبي إذا لم تفهم.', age_band: '7-9' },
    });
    assert.equal(r.json().reason, 'shaming_language');
  } finally { await app.close(); }
});

test('child-safety: POST /evaluate blocks sensitive topic for younger band', async () => {
  const app = buildServer();
  try {
    const r = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: { body_ar: 'محتوى محايد', age_band: '7-9', topic_tags: ['death'] },
    });
    const b = r.json();
    assert.equal(b.decision, 'block');
    assert.equal(b.reason, 'topic_not_for_younger_band');
    assert.equal(b.sensitive_topic, 'death');
  } finally { await app.close(); }
});

test('child-safety: POST /evaluate allows safe content', async () => {
  const app = buildServer();
  try {
    const r = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: { body_ar: 'نتعلم آداب الصلاة اليوم.', age_band: '7-9', topic_tags: ['salah'] },
    });
    assert.equal(r.json().decision, 'allow');
  } finally { await app.close(); }
});

test('child-safety: POST /evaluate validates age_band enum', async () => {
  const app = buildServer();
  try {
    const r = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: { body_ar: 'نص', age_band: '99' },
    });
    // schema rejects → 400 (Fastify default)
    assert.equal(r.statusCode, 400);
  } finally { await app.close(); }
});

test('child-safety: policy function exposed for direct calls', () => {
  const d = evaluateChildContent({ body_ar: 'سني خير من شيعي', age_band: '13+' });
  assert.equal(d.decision, 'block');
  assert.equal(d.reason, 'sectarian_content');
});

test('child-safety: /evaluate response NEVER echoes the input body', async () => {
  const app = buildServer();
  try {
    const r = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: { body_ar: 'leaky_marker_xyz123', age_band: '7-9' },
    });
    assert.ok(!r.body.includes('leaky_marker_xyz123'));
  } finally { await app.close(); }
});

test('child-safety: POST /evaluate-profile-field allows safe nickname', async () => {
  const app = buildServer();
  try {
    const r = await app.inject({
      method: 'POST', url: '/evaluate-profile-field',
      payload: { field: 'nickname_ar', value: 'بطل صغير' },
    });
    assert.equal(r.json().decision, 'allow');
  } finally { await app.close(); }
});

test('child-safety: POST /evaluate-profile-field blocks PII in nickname', async () => {
  const app = buildServer();
  try {
    const r = await app.inject({
      method: 'POST', url: '/evaluate-profile-field',
      payload: { field: 'nickname_ar', value: '0123456789' },
    });
    assert.equal(r.json().decision, 'block');
    assert.equal(r.json().reason, 'nickname_looks_like_pii');
  } finally { await app.close(); }
});

test('child-safety: POST /evaluate-profile-field blocks invalid field', async () => {
  const app = buildServer();
  try {
    const r = await app.inject({
      method: 'POST', url: '/evaluate-profile-field',
      payload: { field: 'real_name', value: 'Alice' },
    });
    assert.equal(r.json().decision, 'block');
    assert.equal(r.json().reason, 'field_not_collected_for_children');
  } finally { await app.close(); }
});
