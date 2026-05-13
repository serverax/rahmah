import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHEIKH_ACTIONS,
  isAllowedSheikhAction,
  recordSheikhAction,
  configureSheikhAudit,
  isSheikhAuditConfigured,
  _resetSheikhAuditForTests,
} from '../src/audit/sheikh-action-audit.js';

before(() => _resetSheikhAuditForTests());
after(() => _resetSheikhAuditForTests());

test('SHEIKH_ACTIONS allow-list covers the lifecycle', () => {
  for (const a of [
    'question_submitted',
    'answer_submitted',
    'answer_rejected_missing_citation',
    'moderation_approved',
    'moderation_rejected',
    'public_qa_published',
  ]) {
    assert.equal(isAllowedSheikhAction(a), true, `must allow ${a}`);
  }
  assert.equal(isAllowedSheikhAction('publish_without_review'), false);
  assert.equal(isAllowedSheikhAction(''), false);
  assert.equal(isAllowedSheikhAction(null), false);
});

test('recordSheikhAction without pool returns no_pool', async () => {
  _resetSheikhAuditForTests();
  assert.equal(isSheikhAuditConfigured(), false);
  const r = await recordSheikhAction({
    action: 'question_submitted',
    target_type: 'question',
    target_id: 'abc',
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'no_pool');
});

test('recordSheikhAction validates action / target', async () => {
  _resetSheikhAuditForTests();
  const r1 = await recordSheikhAction({
    action: 'rogue_action',
    target_type: 'question',
    target_id: 'abc',
  });
  assert.equal(r1.reason, 'invalid_action');
  const r2 = await recordSheikhAction({
    action: 'question_submitted',
    target_type: '',
    target_id: 'abc',
  });
  assert.equal(r2.reason, 'invalid_target');
  const r3 = await recordSheikhAction({
    action: 'question_submitted',
    target_type: 'question',
    target_id: '',
  });
  assert.equal(r3.reason, 'invalid_target');
});

test('recordSheikhAction uses parameterized SQL and redacts forbidden metadata keys', async () => {
  const seen = [];
  configureSheikhAudit({
    pool: {
      query: async (sql, params) => {
        seen.push({ sql, params });
        return { rows: [{ id: 'audit-uuid-1' }] };
      },
    },
  });
  const r = await recordSheikhAction({
    actor_user_id: 'sheikh-user-1',
    action: 'public_qa_published',
    target_type: 'answer',
    target_id: 'answer-1',
    metadata: {
      title_ar: 'سؤال',
      // forbidden:
      password: 'leak',
      token: 'leak',
      database_url: 'postgres://x',
      phone: '+1234567890',
      nested: { api_key: 'leak', allowed: 'ok' },
    },
  });
  assert.equal(r.ok, true);
  assert.equal(r.audit_id, 'audit-uuid-1');
  assert.equal(seen.length, 1);
  assert.ok(seen[0].sql.includes('$1') && seen[0].sql.includes('$2'), 'SQL must be parameterized');
  const meta = seen[0].params[4];
  assert.equal(meta.title_ar, 'سؤال');
  assert.equal('password' in meta, false);
  assert.equal('token' in meta, false);
  assert.equal('database_url' in meta, false);
  assert.equal('phone' in meta, false);
  assert.equal('api_key' in meta.nested, false);
  assert.equal(meta.nested.allowed, 'ok');
  _resetSheikhAuditForTests();
});

test('recordSheikhAction swallows pool errors and returns insert_failed', async () => {
  configureSheikhAudit({
    pool: {
      query: async () => { throw new Error('boom'); },
    },
  });
  const r = await recordSheikhAction({
    action: 'question_submitted',
    target_type: 'question',
    target_id: 'q-1',
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'insert_failed');
  _resetSheikhAuditForTests();
});

test('SHEIKH_ACTIONS frozen + non-empty', () => {
  assert.ok(Array.isArray(SHEIKH_ACTIONS));
  assert.ok(SHEIKH_ACTIONS.length >= 8);
  assert.throws(() => { SHEIKH_ACTIONS.push('x'); });
});
