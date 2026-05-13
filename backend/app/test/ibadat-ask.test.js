import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

const ask = (app, body) =>
  app.inject({ method: 'POST', url: '/api/ibadat/ask', payload: body });

const BLOCKED_ANSWER = 'لا أملك جواباً موثقاً لهذا السؤال حالياً. يرجى الرجوع إلى عالم موثوق.';

test('rejects out-of-scope question politely with blocked=true and zero sources', async () => {
  const app = buildApp();
  try {
    const res = await ask(app, { question: 'ما رأيك في السياسة الحالية؟' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.blocked, true);
    assert.equal(body.category, 'خارج النطاق');
    assert.equal(body.confidence, 'low');
    assert.deepEqual(body.sources, []);
  } finally {
    await app.close();
  }
});

test('rejects inheritance question (out of scope)', async () => {
  const app = buildApp();
  try {
    const res = await ask(app, { question: 'كم نصيب الابنة في الميراث؟' });
    const body = res.json();
    assert.equal(body.blocked, true);
    assert.equal(body.category, 'خارج النطاق');
  } finally {
    await app.close();
  }
});

test('blocks in-scope salah question with fallback wording (no sources yet)', async () => {
  const app = buildApp();
  try {
    const res = await ask(app, {
      question: 'هل يجوز تأخير صلاة العشاء؟',
      language: 'ar',
      scope: 'ibadat',
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.blocked, true);
    assert.equal(body.category, 'غير مؤكد');
    assert.equal(body.confidence, 'low');
    assert.deepEqual(body.sources, []);
    assert.equal(body.answer, BLOCKED_ANSWER);
  } finally {
    await app.close();
  }
});

test('blocks in-scope zakat question with fallback wording', async () => {
  const app = buildApp();
  try {
    const res = await ask(app, { question: 'ما نصاب زكاة المال؟' });
    const body = res.json();
    assert.equal(body.blocked, true);
    assert.equal(body.answer, BLOCKED_ANSWER);
  } finally {
    await app.close();
  }
});

test('rejects empty question body via schema validation', async () => {
  const app = buildApp();
  try {
    const res = await ask(app, { question: '' });
    assert.equal(res.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('rejects missing body field via schema validation', async () => {
  const app = buildApp();
  try {
    const res = await ask(app, {});
    assert.equal(res.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('rejects unknown scope value via schema enum', async () => {
  const app = buildApp();
  try {
    const res = await ask(app, { question: 'مسألة فقهية', scope: 'general' });
    assert.equal(res.statusCode, 400);
  } finally {
    await app.close();
  }
});
