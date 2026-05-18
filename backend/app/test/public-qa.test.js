import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import {
  _resetSheikhRepositoryForTests,
  configureSheikhRepository,
} from '../src/sheikh/sheikh-question-repository.js';

before(() => _resetSheikhRepositoryForTests());
after(() => _resetSheikhRepositoryForTests());

test('GET /api/public/sheikh-hasan/qa returns empty list with configured=false when no repository', async () => {
  const oldUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  _resetSheikhRepositoryForTests();
  const app = buildApp({ autoInit: false });
  try {
    const res = await app.inject({ method: 'GET', url: '/api/public/sheikh-hasan/qa' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.configured, false);
    assert.deepEqual(body.items, []);
  } finally {
    await app.close();
    process.env.DATABASE_URL = oldUrl;
  }
});


test('GET /api/public/sheikh-hasan/qa returns only items repository surfaces (no internal columns)', async () => {
  const repoItems = [
    { slug: 'wudu-validity', title: 'How long does wudu remain valid?', language: 'en', category: 'salah', published_at: '2026-05-13T00:00:00Z' },
    { slug: 'salat-witr',    title: 'How many rakat in witr?',          language: 'en', category: 'salah', published_at: '2026-05-12T00:00:00Z' },
  ];
  configureSheikhRepository({
    repository: {
      submitQuestion: async () => ({ ok: false, reason: 'unused' }),
      listPendingForSheikh: async () => [],
      getQuestionStatus: async () => ({ ok: false, reason: 'unused' }),
      saveAnswerDraft: async () => ({ ok: false, reason: 'unused' }),
      listPublicQA: async () => repoItems,
      getPublicQABySlug: async () => null,
      recordReport: async () => ({ ok: false, reason: 'unused' }),
    },
  });
  const app = buildApp({ autoInit: false });
  try {
    const res = await app.inject({ method: 'GET', url: '/api/public/sheikh-hasan/qa' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.configured, true);
    assert.equal(body.items.length, 2);
    // Ensure no user_id / sheikh_user_id / email_hash leaks even if the
    // (mock) repository tried to include them.
    const raw = res.body;
    assert.ok(!raw.includes('user_id'),       'list response leaked user_id');
    assert.ok(!raw.includes('email_hash'),    'list response leaked email_hash');
    assert.ok(!raw.includes('sheikh_user_id'),'list response leaked sheikh_user_id');
  } finally {
    await app.close();
    _resetSheikhRepositoryForTests();
  }
});

test('GET /api/public/sheikh-hasan/qa/:slug returns 503 when no repository', async () => {
  const oldUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  _resetSheikhRepositoryForTests();
  const app = buildApp({ autoInit: false });
  try {
    const res = await app.inject({ method: 'GET', url: '/api/public/sheikh-hasan/qa/some-slug' });
    assert.equal(res.statusCode, 503);
    const body = res.json();
    assert.equal(body.error, 'service_not_configured');
  } finally {
    await app.close();
    process.env.DATABASE_URL = oldUrl;
  }
});


test('GET /api/public/sheikh-hasan/qa/:slug returns 404 when slug not found', async () => {
  configureSheikhRepository({
    repository: {
      submitQuestion: async () => ({}),
      listPendingForSheikh: async () => [],
      getQuestionStatus: async () => ({}),
      saveAnswerDraft: async () => ({}),
      listPublicQA: async () => [],
      getPublicQABySlug: async () => null,
      recordReport: async () => ({}),
    },
  });
  const app = buildApp({ autoInit: false });
  try {
    const res = await app.inject({ method: 'GET', url: '/api/public/sheikh-hasan/qa/missing-slug' });
    assert.equal(res.statusCode, 404);
  } finally {
    await app.close();
    _resetSheikhRepositoryForTests();
  }
});

test('GET /api/public/sheikh-hasan/qa/:slug returns projected detail, hides identity fields', async () => {
  const raw = {
    slug: 'wudu-validity',
    title: 'How long does wudu remain valid?',
    language: 'en',
    category: 'salah',
    published_at: '2026-05-13T00:00:00Z',
    answer_text: 'A short scholar answer.',
    sheikh_name: 'Sheikh Hasan',
    citations: [
      { citation_type: 'quran', citation_label: 'Al-Maidah 5:6', verification_status: 'verified' },
    ],
    // adversarial fields:
    user_id: 'should-not-leak',
    email_hash: 'a'.repeat(64),
    question_hash: 'b'.repeat(64),
    sheikh_user_id: 'should-not-leak-either',
  };
  configureSheikhRepository({
    repository: {
      submitQuestion: async () => ({}),
      listPendingForSheikh: async () => [],
      getQuestionStatus: async () => ({}),
      saveAnswerDraft: async () => ({}),
      listPublicQA: async () => [],
      getPublicQABySlug: async () => raw,
      recordReport: async () => ({}),
    },
  });
  const app = buildApp({ autoInit: false });
  try {
    const res = await app.inject({ method: 'GET', url: '/api/public/sheikh-hasan/qa/wudu-validity' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.qa.slug, 'wudu-validity');
    assert.equal(body.qa.title, 'How long does wudu remain valid?');
    assert.equal(body.qa.answer_text, 'A short scholar answer.');
    assert.equal(body.qa.sheikh_name, 'Sheikh Hasan');
    assert.equal(body.qa.citations.length, 1);
    const rawBody = res.body;
    assert.ok(!rawBody.includes('should-not-leak'),    'detail leaked user_id sentinel');
    assert.ok(!rawBody.includes('email_hash'),         'detail leaked email_hash field');
    assert.ok(!rawBody.includes('question_hash'),      'detail leaked question_hash field');
    assert.ok(!rawBody.includes('sheikh_user_id'),     'detail leaked sheikh_user_id');
  } finally {
    await app.close();
    _resetSheikhRepositoryForTests();
  }
});

test('POST /api/public/sheikh-hasan/qa/:slug/report rejects empty reason via schema', async () => {
  const app = buildApp({ autoInit: false });
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/public/sheikh-hasan/qa/whatever/report',
      payload: { reason: '' },
    });
    assert.equal(res.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('POST /api/public/sheikh-hasan/qa/:slug/report returns 503 when no repository', async () => {
  const oldUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  _resetSheikhRepositoryForTests();
  const app = buildApp({ autoInit: false });
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/public/sheikh-hasan/qa/whatever/report',
      payload: { reason: 'inappropriate content' },
    });
    assert.equal(res.statusCode, 503);
    const body = res.json();
    assert.equal(body.error, 'service_not_configured');
  } finally {
    await app.close();
    process.env.DATABASE_URL = oldUrl;
  }
});

