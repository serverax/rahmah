import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import {
  _resetSheikhRepositoryForTests,
  configureSheikhRepository,
} from '../src/sheikh/sheikh-question-repository.js';
import { _resetPoolForTests } from '../src/db/health.js';

function envSnapshot() {
  return {
    SHEIKH_AUTH_REQUIRED: process.env.SHEIKH_AUTH_REQUIRED,
    WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED,
    ASK_SHEIKH_HASAN_ENABLED: process.env.ASK_SHEIKH_HASAN_ENABLED,
    PUBLIC_SHEIKH_QA_ENABLED: process.env.PUBLIC_SHEIKH_QA_ENABLED,
    DATABASE_URL: process.env.DATABASE_URL,
  };
}
function envRestore(s) {
  for (const [k, v] of Object.entries(s)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

before(() => {
  _resetSheikhRepositoryForTests();
  delete process.env.SHEIKH_AUTH_REQUIRED;
  delete process.env.WHATSAPP_ENABLED;
  delete process.env.DATABASE_URL;
  _resetPoolForTests();
});

after(() => {
  _resetSheikhRepositoryForTests();
});

test('POST /api/sheikh-hasan/ask returns 503 service_not_configured when no repository', async () => {
  const snap = envSnapshot();
  _resetSheikhRepositoryForTests();
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sheikh-hasan/ask',
      payload: { question: 'How do I make wudu?', language: 'en', category: 'salah' },
    });
    assert.equal(res.statusCode, 503);
    const body = res.json();
    assert.equal(body.ok, false);
    assert.equal(body.error, 'service_not_configured');
  } finally {
    await app.close();
    envRestore(snap);
  }
});

test('POST /api/sheikh-hasan/ask rejects empty body via schema', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sheikh-hasan/ask',
      payload: {},
    });
    assert.equal(res.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('POST /api/sheikh-hasan/ask rejects short question via schema', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sheikh-hasan/ask',
      payload: { question: 'hi', language: 'en', category: 'salah' },
    });
    assert.equal(res.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('POST /api/sheikh-hasan/ask happy path with mock repository returns ok=true + pending_review', async () => {
  const snap = envSnapshot();
  const seen = { calls: [] };
  configureSheikhRepository({
    repository: {
      submitQuestion: async (args) => {
        seen.calls.push({ name: 'submitQuestion', args });
        return { ok: true, question_id: 'fake-uuid', status: 'pending_review', created_at: new Date().toISOString() };
      },
      listPendingForSheikh: async () => [],
      getQuestionStatus: async () => ({ ok: false, reason: 'not_found' }),
      saveAnswerDraft: async () => ({ ok: false, reason: 'service_not_configured' }),
      listPublicQA: async () => [],
      getPublicQABySlug: async () => null,
      recordReport: async () => ({ ok: false, reason: 'service_not_configured' }),
    },
  });
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sheikh-hasan/ask',
      payload: {
        question: 'When does Ramadan fasting begin?',
        language: 'en',
        category: 'fasting',
        public_allowed: false,
      },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.status, 'pending_review');
    assert.equal(body.question_id, 'fake-uuid');
    // The repository must have been called exactly once.
    assert.equal(seen.calls.length, 1);
    assert.equal(seen.calls[0].name, 'submitQuestion');
    // user_id must be null (no auth wired).
    assert.equal(seen.calls[0].args.user_id, null);
    // public_allowed is forwarded.
    assert.equal(seen.calls[0].args.public_allowed, false);
  } finally {
    await app.close();
    _resetSheikhRepositoryForTests();
    envRestore(snap);
  }
});

test('GET /api/sheikh-hasan/sheikh/questions returns 503 auth_not_configured by default', async () => {
  const snap = envSnapshot();
  delete process.env.SHEIKH_AUTH_REQUIRED;
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'GET',
      url: '/api/sheikh-hasan/sheikh/questions',
    });
    assert.equal(res.statusCode, 503);
    const body = res.json();
    assert.equal(body.ok, false);
    assert.equal(body.error, 'auth_not_configured');
  } finally {
    await app.close();
    envRestore(snap);
  }
});

test('GET /api/sheikh-hasan/sheikh/questions still 503 when SHEIKH_AUTH_REQUIRED=true but no principal', async () => {
  const snap = envSnapshot();
  process.env.SHEIKH_AUTH_REQUIRED = 'true';
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'GET',
      url: '/api/sheikh-hasan/sheikh/questions',
    });
    assert.equal(res.statusCode, 503);
    const body = res.json();
    assert.equal(body.error, 'auth_not_configured');
  } finally {
    await app.close();
    envRestore(snap);
  }
});

test('POST /api/sheikh-hasan/moderation/answers/:id/publish returns 503 auth_not_configured by default', async () => {
  const snap = envSnapshot();
  delete process.env.SHEIKH_AUTH_REQUIRED;
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sheikh-hasan/moderation/answers/fake/publish',
      payload: { citation_status: 'quran_cited', publication_status: 'pending_moderation' },
    });
    assert.equal(res.statusCode, 503);
    const body = res.json();
    assert.equal(body.error, 'auth_not_configured');
  } finally {
    await app.close();
    envRestore(snap);
  }
});

test('GET /ready surfaces ask_sheikh_hasan + public_qa blocks with correct defaults', async () => {
  const snap = envSnapshot();
  delete process.env.SHEIKH_AUTH_REQUIRED;
  delete process.env.WHATSAPP_ENABLED;
  delete process.env.DATABASE_URL;
  _resetPoolForTests();
  _resetSheikhRepositoryForTests();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    assert.equal(res.statusCode, 200);
    // ask_sheikh_hasan block
    assert.equal(typeof body.ask_sheikh_hasan, 'object');
    assert.equal(body.ask_sheikh_hasan.sheikh_login_required, true);
    assert.equal(body.ask_sheikh_hasan.sheikh_auth_configured, false);
    assert.equal(body.ask_sheikh_hasan.citation_required_for_public_answers, true);
    assert.equal(body.ask_sheikh_hasan.moderation_required, true);
    assert.equal(body.ask_sheikh_hasan.repository_configured, false);
    assert.equal(body.ask_sheikh_hasan.whatsapp_configured, false);
    // public_qa block
    assert.equal(typeof body.public_qa, 'object');
    assert.equal(body.public_qa.private_user_identity_hidden, true);
    assert.equal(body.public_qa.report_content_required, true);
    assert.equal(body.public_qa.repository_configured, false);
  } finally {
    await app.close();
    envRestore(snap);
  }
});
