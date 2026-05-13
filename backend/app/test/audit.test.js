import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashQuestion, recordAnswerAudit } from '../src/audit/answer-audit.js';

test('hashQuestion returns sha256 hex of trimmed input', () => {
  const h1 = hashQuestion('هل يجوز تأخير صلاة العشاء؟');
  assert.equal(typeof h1, 'string');
  assert.equal(h1.length, 64);
  assert.ok(/^[0-9a-f]{64}$/.test(h1));
  // deterministic
  const h2 = hashQuestion('  هل يجوز تأخير صلاة العشاء؟  ');
  assert.equal(h1, h2, 'hash should be insensitive to surrounding whitespace');
});

test('hashQuestion returns null for empty / non-string', () => {
  assert.equal(hashQuestion(''),    null);
  assert.equal(hashQuestion('   '), null);
  assert.equal(hashQuestion(123),   null);
  assert.equal(hashQuestion(null),  null);
});

test('recordAnswerAudit is a safe no-op when pool is missing', async () => {
  const r = await recordAnswerAudit({
    pool: null,
    question: 'q', scope: 'ibadat', blocked: true,
    blockReason: 'insufficient_verified_sources', sourceCount: 0,
  });
  assert.equal(r.recorded, false);
  assert.equal(r.reason, 'no_pool');
});

test('recordAnswerAudit binds parameterized values and never sends raw question', async () => {
  const calls = [];
  const fakePool = {
    async query(sql, params) { calls.push({ sql, params }); return { rowCount: 1 }; },
  };
  const r = await recordAnswerAudit({
    pool: fakePool,
    question: 'سؤال خاص جداً',
    scope: 'ibadat',
    blocked: true,
    blockReason: 'insufficient_verified_sources',
    sourceCount: 0,
  });
  assert.equal(r.recorded, true);
  assert.equal(calls.length, 1);
  const { sql, params } = calls[0];
  // SQL contains parameter placeholders, never the raw question text
  assert.ok(/\$1, \$2, \$3, \$4, \$5/.test(sql), 'SQL must use $1..$5 placeholders');
  assert.ok(!sql.includes('سؤال خاص جداً'), 'raw question must never appear in SQL');
  // params: [question_hash, scope, blocked, block_reason, source_count]
  assert.equal(params.length, 5);
  assert.ok(/^[0-9a-f]{64}$/.test(params[0]), 'param 0 must be sha256 hex');
  assert.equal(params[1], 'ibadat');
  assert.equal(params[2], true);
  assert.equal(params[3], 'insufficient_verified_sources');
  assert.equal(params[4], 0);
  // The raw question must NOT appear anywhere in the bound params
  for (const p of params) {
    if (typeof p === 'string') {
      assert.ok(!p.includes('سؤال خاص'), `param leaked raw question text: ${p}`);
    }
  }
});

test('recordAnswerAudit handles empty question gracefully', async () => {
  const fakePool = { async query() { throw new Error('should not be called'); } };
  const r = await recordAnswerAudit({
    pool: fakePool, question: '   ', scope: 'ibadat', blocked: true, blockReason: null, sourceCount: 0,
  });
  assert.equal(r.recorded, false);
  assert.equal(r.reason, 'empty_question');
});

test('recordAnswerAudit swallows pool errors silently (audit must not affect response)', async () => {
  const fakePool = { async query() { throw new Error('insert blew up'); } };
  const r = await recordAnswerAudit({
    pool: fakePool, question: 'q', scope: 'ibadat', blocked: true, blockReason: 'x', sourceCount: 0,
  });
  assert.equal(r.recorded, false);
  assert.equal(r.reason, 'insert_failed');
});
