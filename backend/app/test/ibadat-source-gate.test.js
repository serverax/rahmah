import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import {
  configureSourceStore,
  _resetSourceStoreForTests,
} from '../src/safety/source-store.js';
import { _resetPoolForTests } from '../src/db/health.js';

const ask = (app, body) =>
  app.inject({ method: 'POST', url: '/api/ibadat/ask', payload: body });

test('ibadat: even with valid approved sources, route still blocks (answer_generation_not_enabled)', async () => {
  // Inject a repository that returns a clean approved source.
  const repo = {
    async lookupVerifiedSources() {
      return [{
        id: 'src-1',
        title: 'صحيح البخاري',
        citation_label: 'صحيح البخاري — كتاب الصلاة، باب رقم 1',
        citation_url: null,
        chunk_text: 'سُئِلَ النَّبِيُّ ﷺ',
        authority_level: 'primary',
        source_type: 'hadith_collection',
        language: 'ar',
        verification_status: 'approved',
      }];
    },
  };
  configureSourceStore({ repository: repo });
  const app = buildApp();
  try {
    const res = await ask(app, { question: 'متى تُصلَّى الصلاة؟', language: 'ar', scope: 'ibadat' });
    const body = res.json();
    // Still blocked — answer generation is not enabled in Sprint 5.
    assert.equal(body.blocked, true);
    assert.equal(body.reason, 'answer_generation_not_enabled');
    // No source bodies are echoed yet.
    assert.deepEqual(body.sources, []);
    // Wording for blocked fallback is preserved.
    assert.equal(
      body.answer,
      'لا أملك جواباً موثقاً لهذا السؤال حالياً. يرجى الرجوع إلى عالم موثوق.',
    );
  } finally {
    await app.close();
    _resetSourceStoreForTests();
  }
});

test('ibadat: with pending/rejected sources, route blocks with insufficient_verified_sources', async () => {
  const repo = {
    async lookupVerifiedSources() {
      return [
        { id: 'p', citation_label: 'c', chunk_text: 't', verification_status: 'pending' },
        { id: 'r', citation_label: 'c', chunk_text: 't', verification_status: 'rejected' },
      ];
    },
  };
  configureSourceStore({ repository: repo });
  const app = buildApp();
  try {
    const res = await ask(app, { question: 'كم ركعة في صلاة الوتر؟' });
    const body = res.json();
    assert.equal(body.blocked, true);
    assert.equal(body.reason, 'insufficient_verified_sources');
    assert.deepEqual(body.sources, []);
  } finally {
    await app.close();
    _resetSourceStoreForTests();
  }
});

test('ibadat: out-of-scope still returns out_of_scope reason regardless of repo', async () => {
  const repo = { async lookupVerifiedSources() { return [{ id: 'x', citation_label: 'c', chunk_text: 't', verification_status: 'approved' }]; } };
  configureSourceStore({ repository: repo });
  const app = buildApp();
  try {
    const res = await ask(app, { question: 'ما رأيك في السياسة؟' });
    const body = res.json();
    assert.equal(body.blocked, true);
    assert.equal(body.reason, 'out_of_scope');
    assert.equal(body.category, 'خارج النطاق');
  } finally {
    await app.close();
    _resetSourceStoreForTests();
  }
});

// ---------- /ready sources block --------------------------------------------

test('/ready exposes sources block with safety flags', async () => {
  const previousDb = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  _resetPoolForTests();
  _resetSourceStoreForTests();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    assert.equal(typeof body.sources, 'object');
    assert.equal(body.sources.registry_required, true);
    assert.equal(body.sources.verified_sources_required, true);
    assert.equal(body.sources.answer_generation_enabled, false);
    assert.equal(body.sources.retrieval_configured, false);
  } finally {
    await app.close();
    _resetPoolForTests();
    if (previousDb !== undefined) process.env.DATABASE_URL = previousDb;
  }
});

test('/ready reports retrieval_configured=true after repository is wired', async () => {
  const previousDb = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  _resetPoolForTests();
  configureSourceStore({ repository: { async lookupVerifiedSources() { return []; } } });
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    assert.equal(body.sources.retrieval_configured, true);
    // Even with retrieval wired, generation stays disabled.
    assert.equal(body.sources.answer_generation_enabled, false);
  } finally {
    await app.close();
    _resetPoolForTests();
    _resetSourceStoreForTests();
    if (previousDb !== undefined) process.env.DATABASE_URL = previousDb;
  }
});
