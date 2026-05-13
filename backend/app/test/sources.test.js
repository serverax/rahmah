import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSourceRepository } from '../src/sources/source-repository.js';
import { validateSourcesForAnswer } from '../src/safety/citation-validator.js';
import {
  configureSourceStore,
  configureSourceStoreWithPool,
  lookupSources,
  _resetSourceStoreForTests,
} from '../src/safety/source-store.js';
import { isSourceRetrievalConfigured } from '../src/safety/source-store-status.js';

// ---------- source-repository ------------------------------------------------

test('createSourceRepository without pool returns empty array', async () => {
  const repo = createSourceRepository();
  const out = await repo.lookupVerifiedSources({ question: 'x', scope: 'salah' });
  assert.deepEqual(out, []);
});

test('createSourceRepository with pool uses parameterized SQL (no concat)', async () => {
  const calls = [];
  const fakePool = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };
  const repo = createSourceRepository({ pool: fakePool });
  await repo.lookupVerifiedSources({ question: 'مسألة', scope: 'salah', language: 'ar', limit: 3 });
  assert.equal(calls.length, 1);
  const { sql, params } = calls[0];
  // SQL contains $1 and $2 placeholders — not the literal values
  assert.ok(/\$1/.test(sql),  'SQL missing $1 placeholder');
  assert.ok(/\$2/.test(sql),  'SQL missing $2 placeholder');
  // Values arrive via params array — not concatenated into SQL
  assert.deepEqual(params, ['ar', 3]);
  // Query enforces approved-only at SQL level
  assert.ok(/verification_status\s*=\s*'approved'/.test(sql), "SQL must restrict to 'approved'");
});

test('repository handles pool errors by returning empty (fail-closed)', async () => {
  const fakePool = { async query() { throw new Error('boom'); } };
  const repo = createSourceRepository({ pool: fakePool });
  const out = await repo.lookupVerifiedSources({ question: 'x' });
  assert.deepEqual(out, []);
});

test('repository normalizes invalid limit/language to safe defaults', async () => {
  const calls = [];
  const fakePool = { async query(sql, params) { calls.push({ sql, params }); return { rows: [] }; } };
  const repo = createSourceRepository({ pool: fakePool });
  await repo.lookupVerifiedSources({ question: 'q', limit: 99999, language: 12345 });
  assert.equal(calls[0].params[0], 'ar'); // language fallback
  assert.equal(calls[0].params[1], 8);    // limit clamped to max=8
});

// ---------- citation-validator -----------------------------------------------

test('validator rejects empty/non-array sources', () => {
  for (const v of [undefined, null, 0, 'x', {}]) {
    const r = validateSourcesForAnswer(v);
    assert.equal(r.canAnswer, false);
    assert.equal(r.reason, 'insufficient_verified_sources');
    assert.deepEqual(r.validSources, []);
  }
  const r2 = validateSourcesForAnswer([]);
  assert.equal(r2.canAnswer, false);
  assert.equal(r2.reason, 'insufficient_verified_sources');
});

test('validator rejects malformed sources (missing id/citation_label/chunk_text)', () => {
  const malformed = [
    { id: '', citation_label: 'x', chunk_text: 'y' },
    { id: '1', citation_label: '', chunk_text: 'y' },
    { id: '1', citation_label: 'x', chunk_text: '   ' },
    { id: '1', citation_label: 'x' },                       // missing chunk_text
    'not-an-object',
    null,
  ];
  const r = validateSourcesForAnswer(malformed);
  assert.equal(r.canAnswer, false);
  assert.equal(r.reason, 'insufficient_verified_sources');
});

test('validator rejects pending/rejected even if all other fields are valid', () => {
  const r1 = validateSourcesForAnswer([{
    id: '1', citation_label: 'Bukhari 1', chunk_text: 'text', verification_status: 'pending',
  }]);
  assert.equal(r1.canAnswer, false);
  const r2 = validateSourcesForAnswer([{
    id: '1', citation_label: 'Bukhari 1', chunk_text: 'text', verification_status: 'rejected',
  }]);
  assert.equal(r2.canAnswer, false);
});

test('validator accepts a clean approved source', () => {
  const r = validateSourcesForAnswer([{
    id: 'src-1', citation_label: 'صحيح البخاري — كتاب الصلاة', chunk_text: 'سُئِلَ النَّبِيُّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ',
    verification_status: 'approved',
  }]);
  assert.equal(r.canAnswer, true);
  assert.equal(r.reason, null);
  assert.equal(r.validSources.length, 1);
});

// ---------- source-store wrapper --------------------------------------------

test('source-store returns [] when no repository configured (fail-closed default)', async () => {
  _resetSourceStoreForTests();
  assert.equal(isSourceRetrievalConfigured(), false);
  const out = await lookupSources('سؤال عن الصلاة', 'salah', 'ar', 4);
  assert.deepEqual(out, []);
});

test('source-store delegates to injected repository when configured', async () => {
  const repo = {
    async lookupVerifiedSources({ language, limit }) {
      return [{
        id: 'r1', citation_label: 'cite', chunk_text: 't', verification_status: 'approved',
        language, _limit: limit,
      }];
    },
  };
  configureSourceStore({ repository: repo });
  try {
    assert.equal(isSourceRetrievalConfigured(), true);
    const out = await lookupSources('q', 'salah', 'ar', 2);
    assert.equal(out.length, 1);
    assert.equal(out[0].id, 'r1');
  } finally {
    _resetSourceStoreForTests();
  }
});

test('source-store filters out pending/rejected even when repo lies', async () => {
  const repo = {
    async lookupVerifiedSources() {
      return [
        { id: 'a', citation_label: 'c', chunk_text: 't', verification_status: 'pending' },
        { id: 'b', citation_label: 'c', chunk_text: 't', verification_status: 'rejected' },
        { id: 'c', citation_label: 'c', chunk_text: 't', verification_status: 'approved' },
      ];
    },
  };
  configureSourceStore({ repository: repo });
  try {
    const out = await lookupSources('q', 'salah');
    assert.equal(out.length, 1);
    assert.equal(out[0].id, 'c');
  } finally {
    _resetSourceStoreForTests();
  }
});

test('configureSourceStoreWithPool builds a real repository', async () => {
  const fakePool = { async query() { return { rows: [] }; } };
  configureSourceStoreWithPool({ pool: fakePool });
  try {
    assert.equal(isSourceRetrievalConfigured(), true);
    const out = await lookupSources('q', 'salah');
    assert.deepEqual(out, []);
  } finally {
    _resetSourceStoreForTests();
  }
});
