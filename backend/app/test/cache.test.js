import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { MemoryCache } from '../src/cache/memory-cache.js';
import {
  isAllowedKey,
  isCacheableValue,
  isCacheablePublicQARow,
  isCacheablePublicQAListEntry,
  isCacheableQuestionStatus,
} from '../src/cache/cache-policy.js';
import {
  cacheStatusForReady,
  getCache,
  isRedisUrlConfigured,
  safeSet,
  safeGet,
  setPublicQADetail,
  setPublicQAList,
  setQuestionStatus,
  _resetCacheForTests,
} from '../src/cache/index.js';
import {
  _resetSheikhRepositoryForTests,
  configureSheikhRepository,
} from '../src/sheikh/sheikh-question-repository.js';

function envSnapshot() {
  return {
    REDIS_URL: process.env.REDIS_URL,
  };
}
function envRestore(s) {
  for (const [k, v] of Object.entries(s)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

before(() => {
  _resetCacheForTests();
  _resetSheikhRepositoryForTests();
});
after(() => {
  _resetCacheForTests();
  _resetSheikhRepositoryForTests();
});

// ------------- Policy: allowed keys ------------------------------------------

test('isAllowedKey accepts the four allowed namespaces', () => {
  assert.equal(isAllowedKey('sakina:public_qa:list:en:salah'), true);
  assert.equal(isAllowedKey('sakina:public_qa:detail:wudu-validity'), true);
  assert.equal(isAllowedKey('sakina:question_status:abc-123'), true);
  assert.equal(isAllowedKey('sakina:ready:health'), true);
});

test('isAllowedKey rejects keys outside the allowed namespaces', () => {
  assert.equal(isAllowedKey('user:1:email'), false);
  assert.equal(isAllowedKey('sakina:secret:database_url'), false);
  assert.equal(isAllowedKey(''), false);
  assert.equal(isAllowedKey(null), false);
  assert.equal(isAllowedKey(undefined), false);
  // unsafe characters
  assert.equal(isAllowedKey('sakina:public_qa:list:en/salah'), false);
  assert.equal(isAllowedKey('sakina:public_qa:list: en:salah'), false);
});

// ------------- Policy: forbidden value fields --------------------------------

test('isCacheableValue refuses objects with PII / secret field names', () => {
  assert.equal(isCacheableValue({ email_hash: 'a'.repeat(64) }), false);
  assert.equal(isCacheableValue({ phone: '+44 000' }), false);
  assert.equal(isCacheableValue({ password: 'x' }), false);
  assert.equal(isCacheableValue({ token: 'x' }), false);
  assert.equal(isCacheableValue({ database_url: 'postgres://x' }), false);
  assert.equal(isCacheableValue({ question_text: 'private' }), false);
  assert.equal(isCacheableValue({ user_id: '1' }), false);
  assert.equal(isCacheableValue({ assigned_sheikh_id: '1' }), false);
});

test('isCacheableValue accepts safe projections', () => {
  assert.equal(isCacheableValue({ slug: 'a', title: 'b' }), true);
  assert.equal(isCacheableValue([
    { slug: 'a', title: 'b' },
    { slug: 'c', title: 'd' },
  ]), true);
});

// ------------- Policy: public Q&A row validation -----------------------------

test('isCacheablePublicQARow refuses rows with no citations', () => {
  assert.equal(isCacheablePublicQARow({ slug: 'x', citations: [] }), false);
  assert.equal(isCacheablePublicQARow({ slug: 'x' }), false);
});

test('isCacheablePublicQARow refuses rows with invalid citation types', () => {
  assert.equal(isCacheablePublicQARow({
    slug: 'x',
    citations: [{ citation_type: 'tweet', citation_label: 'a' }],
  }), false);
});

test('isCacheablePublicQARow refuses rows with empty citation_label', () => {
  assert.equal(isCacheablePublicQARow({
    slug: 'x',
    citations: [{ citation_type: 'quran', citation_label: '   ' }],
  }), false);
});

test('isCacheablePublicQARow accepts valid quran/hadith/fiqh/scholar_note', () => {
  for (const t of ['quran', 'hadith', 'fiqh', 'scholar_note']) {
    assert.equal(isCacheablePublicQARow({
      slug: 'x',
      citations: [{ citation_type: t, citation_label: 'L' }],
    }), true, `type ${t} must be accepted`);
  }
});

test('isCacheablePublicQAListEntry requires slug+title+language', () => {
  assert.equal(isCacheablePublicQAListEntry({}), false);
  assert.equal(isCacheablePublicQAListEntry({ slug: 's', title: 't' }), false);
  assert.equal(isCacheablePublicQAListEntry({ slug: 's', title: 't', language: 'en' }), true);
});

test('isCacheableQuestionStatus refuses any non-allowed field', () => {
  assert.equal(isCacheableQuestionStatus({
    question_id: 'a', status: 'pending_review', language: 'en', category: null,
    created_at: 't', updated_at: 't',
    question_text: 'leak',
  }), false);
  assert.equal(isCacheableQuestionStatus({
    question_id: 'a', status: 'pending_review', language: 'en', category: null,
    created_at: 't', updated_at: 't',
  }), true);
});

// ------------- MemoryCache basics --------------------------------------------

test('MemoryCache: get/set/del round trip', async () => {
  const c = new MemoryCache();
  assert.equal(await c.get('sakina:ready:health'), null);
  await c.set('sakina:ready:health', { ok: true }, 60_000);
  assert.deepEqual(await c.get('sakina:ready:health'), { ok: true });
  await c.del('sakina:ready:health');
  assert.equal(await c.get('sakina:ready:health'), null);
});

test('MemoryCache: TTL expiry returns null', async () => {
  let t = 1_000;
  const c = new MemoryCache({ now: () => t });
  await c.set('sakina:ready:health', { ok: true }, 100);
  t = 1_050;
  assert.deepEqual(await c.get('sakina:ready:health'), { ok: true });
  t = 1_101;
  assert.equal(await c.get('sakina:ready:health'), null);
});

test('MemoryCache: eviction when at maxEntries', async () => {
  const c = new MemoryCache({ maxEntries: 2 });
  await c.set('sakina:public_qa:detail:a', 1, 60_000);
  await c.set('sakina:public_qa:detail:b', 2, 60_000);
  await c.set('sakina:public_qa:detail:c', 3, 60_000);
  assert.equal(c.size(), 2);
  assert.equal(await c.get('sakina:public_qa:detail:a'), null);
});

// ------------- Public Q&A cache policy through safeSet ----------------------

test('setPublicQADetail refuses to cache rows with no citations', async () => {
  _resetCacheForTests();
  const ok = await setPublicQADetail('demo', { slug: 'demo', citations: [] });
  assert.equal(ok, false);
});

test('setPublicQADetail refuses to cache rows with PII fields', async () => {
  _resetCacheForTests();
  const ok = await setPublicQADetail('demo', {
    slug: 'demo',
    citations: [{ citation_type: 'quran', citation_label: 'L' }],
    user_id: 'leak',
  });
  assert.equal(ok, false);
});

test('setPublicQADetail caches a clean row with at least one citation', async () => {
  _resetCacheForTests();
  const ok = await setPublicQADetail('demo', {
    slug: 'demo',
    title: 'X',
    language: 'en',
    citations: [{ citation_type: 'quran', citation_label: 'L', verification_status: 'verified' }],
  });
  assert.equal(ok, true);
});

test('setPublicQAList refuses to cache list with malformed entries', async () => {
  _resetCacheForTests();
  const ok = await setPublicQAList({
    language: 'en',
    category: 'salah',
    items: [{ slug: 'x', title: 't' }], // missing language
  });
  assert.equal(ok, false);
});

test('setQuestionStatus refuses projections with question_text', async () => {
  _resetCacheForTests();
  const ok = await setQuestionStatus('abc', {
    question_id: 'abc',
    status: 'pending_review',
    question_text: 'leak',
  });
  assert.equal(ok, false);
});

// ------------- Redis URL detection / status block ----------------------------

test('cacheStatusForReady: REDIS_URL unset → mode=memory, redis_url_configured=false', () => {
  const snap = envSnapshot();
  delete process.env.REDIS_URL;
  _resetCacheForTests();
  const s = cacheStatusForReady();
  assert.equal(s.mode, 'memory');
  assert.equal(s.configured, true);
  assert.equal(s.redis_url_configured, false);
  assert.equal(s.external_network_required, false);
  assert.equal(s.safe_fallback_enabled, true);
  envRestore(snap);
});

test('cacheStatusForReady: REDIS_URL set → still memory mode (Sprint 8 fallback), redis_url_configured=true', () => {
  const snap = envSnapshot();
  process.env.REDIS_URL = 'redis://leak-host:6379';
  _resetCacheForTests();
  const s = cacheStatusForReady();
  assert.equal(s.mode, 'memory');
  assert.equal(s.redis_url_configured, true);
  envRestore(snap);
});

test('isRedisUrlConfigured reflects REDIS_URL presence', () => {
  const snap = envSnapshot();
  delete process.env.REDIS_URL;
  assert.equal(isRedisUrlConfigured(), false);
  process.env.REDIS_URL = 'redis://anything';
  assert.equal(isRedisUrlConfigured(), true);
  envRestore(snap);
});

// ------------- /ready: cache block present, no secret leak -------------------

test('GET /ready surfaces a cache block; never leaks REDIS_URL', async () => {
  const snap = envSnapshot();
  process.env.REDIS_URL = 'redis://leak_user:leak_pass@127.0.0.99:6379/0';
  _resetCacheForTests();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const raw = res.body;
    const body = res.json();
    assert.equal(res.statusCode, 200);
    assert.equal(typeof body.cache, 'object');
    assert.equal(body.cache.mode, 'memory');
    assert.equal(body.cache.redis_url_configured, true);
    assert.equal(body.cache.external_network_required, false);
    assert.equal(body.cache.safe_fallback_enabled, true);
    assert.ok(!raw.includes('leak_user'),  '/ready leaked REDIS_URL username');
    assert.ok(!raw.includes('leak_pass'),  '/ready leaked REDIS_URL password');
    assert.ok(!raw.includes('127.0.0.99'), '/ready leaked REDIS_URL host');
    assert.ok(!/redis:\/\//.test(raw),      '/ready response contains a redis:// substring');
  } finally {
    await app.close();
    _resetCacheForTests();
    envRestore(snap);
  }
});

// ------------- Public Q&A route uses cache + identity-leak safety ------------

test('GET /api/public/sheikh-hasan/qa/:slug — second call hits cache and never re-queries repo', async () => {
  let calls = 0;
  configureSheikhRepository({
    repository: {
      submitQuestion: async () => ({}),
      listPendingForSheikh: async () => [],
      getQuestionStatus: async () => ({}),
      saveAnswerDraft: async () => ({}),
      listPublicQA: async () => [],
      getPublicQABySlug: async () => {
        calls++;
        return {
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
        };
      },
      recordReport: async () => ({}),
    },
  });
  _resetCacheForTests();
  const app = buildApp();
  try {
    const r1 = await app.inject({ method: 'GET', url: '/api/public/sheikh-hasan/qa/wudu-validity' });
    assert.equal(r1.statusCode, 200);
    const b1 = r1.json();
    assert.equal(b1.cached, false);
    const r2 = await app.inject({ method: 'GET', url: '/api/public/sheikh-hasan/qa/wudu-validity' });
    assert.equal(r2.statusCode, 200);
    const b2 = r2.json();
    assert.equal(b2.cached, true);
    assert.equal(calls, 1, 'repository must be called only once when a cache hit occurs');
  } finally {
    await app.close();
    _resetSheikhRepositoryForTests();
    _resetCacheForTests();
  }
});

test('GET /api/public/sheikh-hasan/qa/:slug — answers with empty citations are NOT cached', async () => {
  let calls = 0;
  configureSheikhRepository({
    repository: {
      submitQuestion: async () => ({}),
      listPendingForSheikh: async () => [],
      getQuestionStatus: async () => ({}),
      saveAnswerDraft: async () => ({}),
      listPublicQA: async () => [],
      getPublicQABySlug: async () => {
        calls++;
        return {
          slug: 'no-cite',
          title: 'Without citations',
          language: 'en',
          category: 'salah',
          published_at: '2026-05-13T00:00:00Z',
          answer_text: 'No citations here.',
          sheikh_name: 'Sheikh Hasan',
          citations: [],
        };
      },
      recordReport: async () => ({}),
    },
  });
  _resetCacheForTests();
  const app = buildApp();
  try {
    await app.inject({ method: 'GET', url: '/api/public/sheikh-hasan/qa/no-cite' });
    await app.inject({ method: 'GET', url: '/api/public/sheikh-hasan/qa/no-cite' });
    assert.equal(calls, 2, 'uncited answers must NOT be cached — both calls must hit the repo');
  } finally {
    await app.close();
    _resetSheikhRepositoryForTests();
    _resetCacheForTests();
  }
});

test('GET /api/sheikh-hasan/questions/:id/status uses cache and projects safely', async () => {
  let calls = 0;
  configureSheikhRepository({
    repository: {
      submitQuestion: async () => ({}),
      listPendingForSheikh: async () => [],
      getQuestionStatus: async () => {
        calls++;
        return {
          ok: true,
          id: 'q-1',
          status: 'pending_review',
          language: 'en',
          category: 'salah',
          created_at: '2026-05-13T00:00:00Z',
          updated_at: '2026-05-13T00:00:00Z',
          // adversarial fields:
          question_text: 'PRIVATE-LEAK',
          assigned_sheikh_id: 'should-not-leak',
        };
      },
      saveAnswerDraft: async () => ({}),
      listPublicQA: async () => [],
      getPublicQABySlug: async () => null,
      recordReport: async () => ({}),
    },
  });
  _resetCacheForTests();
  const app = buildApp();
  try {
    const r1 = await app.inject({ method: 'GET', url: '/api/sheikh-hasan/questions/q-1/status' });
    assert.equal(r1.statusCode, 200);
    const b1 = r1.json();
    assert.equal(b1.cached, false);
    assert.equal(b1.status, 'pending_review');
    assert.ok(!r1.body.includes('PRIVATE-LEAK'),     'first response leaked question_text');
    assert.ok(!r1.body.includes('should-not-leak'),  'first response leaked assigned_sheikh_id');

    const r2 = await app.inject({ method: 'GET', url: '/api/sheikh-hasan/questions/q-1/status' });
    assert.equal(r2.statusCode, 200);
    const b2 = r2.json();
    assert.equal(b2.cached, true);
    assert.ok(!r2.body.includes('PRIVATE-LEAK'),     'cached response leaked question_text');
    assert.ok(!r2.body.includes('should-not-leak'),  'cached response leaked assigned_sheikh_id');
    assert.equal(calls, 1, 'status route must hit cache on second call');
  } finally {
    await app.close();
    _resetSheikhRepositoryForTests();
    _resetCacheForTests();
  }
});

// ------------- safeSet / safeGet API integrity -------------------------------

test('safeSet refuses keys outside allowed namespaces', async () => {
  _resetCacheForTests();
  const ok = await safeSet('user:1:email', 'value@example.com', 60_000);
  assert.equal(ok, false);
  const v = await safeGet('user:1:email');
  assert.equal(v, null);
});

test('safeSet of a primitive under allowed key is fine; cache returns value', async () => {
  _resetCacheForTests();
  const ok = await safeSet('sakina:ready:health', 'ok', 60_000);
  assert.equal(ok, true);
  const v = await safeGet('sakina:ready:health');
  assert.equal(v, 'ok');
});

// ------------- getCache returns memory by default ----------------------------

test('getCache returns a singleton MemoryCache instance', () => {
  _resetCacheForTests();
  const a = getCache();
  const b = getCache();
  assert.equal(a, b, 'cache must be a process singleton');
  assert.equal(a.mode, 'memory');
  assert.equal(a.configured, true);
});
