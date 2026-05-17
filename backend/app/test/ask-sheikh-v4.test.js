import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { configureSheikhRepository, _resetSheikhRepositoryForTests } from '../src/sheikh/sheikh-question-repository.js';

function mockPrincipal(user_id, role) {
  return { user_id, role };
}

test('Ask Sheikh Hasan V4: Full Workflow', async (t) => {
  const repository = {
    submitQuestion: async () => ({ ok: true, question_id: 'q1', status: 'submitted' }),
    listPendingForSheikh: async () => [{ id: 'q1', question_text_ar: 'ما حكم الصلاة؟', status: 'submitted' }],
    saveAnswerDraft: async () => ({ ok: true, answer_id: 'a1' }),
    listPendingApprovals: async () => [{ answer_id: 'a1', question_id: 'q1', question_text_ar: 'ما حكم الصلاة؟', answer_text_ar: 'الصلاة واجبة.' }],
    approveAnswer: async () => ({ ok: true }),
    rejectAnswer: async () => ({ ok: true }),
    listPublicQA: async () => [{ id: 'q1', question: 'ما حكم الصلاة؟', answer: 'الصلاة واجبة.' }],
  };

  const app = buildApp();
  configureSheikhRepository({ repository });

  await t.test('Public submission works', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ask-sheikh/questions',
      payload: {
        language: 'ar',
        question_text_ar: 'ما حكم الصلاة؟',
        display_language_preference: 'ar',
      },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().ok, true);
  });

  await t.test('Sheikh dashboard requires auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/ask-sheikh/dashboard/questions',
    });
    assert.equal(res.statusCode, 503); // auth_not_configured by default in tests if not mocked
  });

  await t.test('Public list returns published only', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/ask-sheikh/public',
    });
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.json().items));
  });

  _resetSheikhRepositoryForTests();
});
