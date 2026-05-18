/**
 * backend/app/test/repository-persistence.test.js
 *
 * PROOF OF PERSISTENCE: Verifies that repositories use the DB pool.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivacyRepository } from '../src/services/privacy-repository.js';
import { createSheikhQuestionRepository } from '../src/sheikh/sheikh-question-repository.js';

test('Privacy Repository: persists to DB when pool is present', async () => {
  const seen = { sql: [], params: [] };
  const mockPool = {
    query: async (sql, params) => {
      seen.sql.push(sql);
      seen.params.push(params);
      if (sql.includes('INSERT')) {
        return { rows: [{ id: 'fake-123', status: 'received', created_at: new Date() }] };
      }
      return { rows: [] };
    }
  };

  const repo = createPrivacyRepository({ pool: mockPool });
  const res = await repo.createPrivacyRequest({
    type: 'delete_account',
    emailHash: 'abc-123-hash',
    metadata: { reason: 'test' }
  });

  assert.equal(res.ok, true);
  assert.equal(res.persisted, true);
  assert.ok(seen.sql[0].includes('INSERT INTO privacy_requests'));
  assert.equal(seen.params[0][0], 'delete_account');
  assert.equal(seen.params[0][1], 'abc-123-hash');
});

test('Sheikh Repository: persists to DB when pool is present', async () => {
  const seen = { sql: [], params: [] };
  const mockPool = {
    query: async (sql, params) => {
      seen.sql.push(sql);
      seen.params.push(params);
      if (sql.includes('INSERT INTO ask_sheikh_questions')) {
        return { rows: [{ id: 'q-456', status: 'submitted', created_at: new Date() }] };
      }
      return { rows: [] };
    }
  };

  const repo = createSheikhQuestionRepository({ pool: mockPool });
  const res = await repo.submitQuestion({
    question_text_ar: 'كيف حالك؟',
    language: 'ar'
  });

  assert.equal(res.ok, true);
  assert.ok(seen.sql[0].includes('INSERT INTO ask_sheikh_questions'));
  assert.equal(seen.params[0][2], 'كيف حالك؟'); // question_text_ar index
});
