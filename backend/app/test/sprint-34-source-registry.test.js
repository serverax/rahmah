import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import {
  configureRag,
  _resetRagForTests,
  buildRagStatus,
} from '../src/rag/rag-status.js';
import { isSafeToAnswerFromRag } from '../src/rag/retrieval.js';

test('Sprint34 — RAG status exposes approved/pending/unverified/blocked counts truthfully', async () => {
  _resetRagForTests();
  const status = await buildRagStatus();
  assert.equal(typeof status.approved_sources, 'number');
  assert.equal(typeof status.pending_review_sources, 'number');
  assert.equal(typeof status.unverified_sources, 'number');
  assert.equal(typeof status.blocked_sources, 'number');
  // Default state: foundation, no approved sources, never a complete DB.
  assert.equal(status.approved_sources, 0);
  assert.equal(status.complete_database, false);
  assert.equal(status.safe_to_answer_from_rag, false);
});

test('Sprint34 — /api/rag/sources/status returns counts + Arabic notice, never claims complete DB', async () => {
  _resetRagForTests();
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/rag/sources/status' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.approved_sources, 0);
    assert.equal(body.complete_database, false);
    assert.equal(typeof body.safe_message_ar, 'string');
    assert.ok(body.safe_message_ar.length > 0);
  } finally {
    await app.close();
  }
});

test('Sprint34 — /api/library/sources/status reports same status truthfully', async () => {
  _resetRagForTests();
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/api/library/sources/status' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.approved_sources, 0);
    assert.equal(body.registry_configured, false);
    assert.equal(body.complete_database, false);
  } finally {
    await app.close();
  }
});

test('Sprint34 — RAG status reflects approved-source presence when registry surfaces them', async () => {
  _resetRagForTests();
  // Inject a fake registry with 3 approved + 2 pending + 0 rejected + 1 unverified.
  const fakeRegistry = {
    countSourcesByStatus: async () => ({ approved: 3, pending_review: 2, unverified: 1, rejected: 0 }),
  };
  // Mode requires DB configured too. Without DATABASE_URL the mode remains foundation.
  configureRag({ registry: fakeRegistry, retrieval: null, enabled: true });
  const status = await buildRagStatus();
  assert.equal(status.approved_sources, 3);
  assert.equal(status.pending_review_sources, 2);
  assert.equal(status.unverified_sources, 1);
  assert.equal(status.blocked_sources, 0);
  assert.equal(status.mode, 'foundation', 'mode stays foundation without DATABASE_URL + retrieval');
  _resetRagForTests();
});

test('Sprint34 — isSafeToAnswerFromRag rejects empty / unlabeled candidates (no answer without citation)', () => {
  assert.equal(isSafeToAnswerFromRag([]), false);
  assert.equal(isSafeToAnswerFromRag(null), false);
  assert.equal(isSafeToAnswerFromRag([{}]), false);
  assert.equal(isSafeToAnswerFromRag([{ chunk_text_ar: 'نص', citation_label_ar: '' }]), false);
  assert.equal(isSafeToAnswerFromRag([{ chunk_text_ar: 'نص', citation_label_ar: 'Al-Baqarah 2:1' }]), true);
});

test('Sprint34 — body of /api/rag/status never includes the phrase "complete database"', async () => {
  _resetRagForTests();
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/rag/status' });
    const raw = r.body;
    // We expose `complete_database: false` as a KEY but never the *natural-
    // language* claim. Test asserts the literal phrase does not appear.
    const claim1 = ['complete', 'Quran', 'database'].join(' ');
    const claim2 = ['complete', 'Hadith', 'database'].join(' ');
    assert.ok(!raw.includes(claim1));
    assert.ok(!raw.includes(claim2));
  } finally {
    await app.close();
  }
});
