import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import {
  configureRag,
  _resetRagForTests,
} from '../src/rag/rag-status.js';
import { configureRagRouteRetrieval, _resetRagRouteForTests } from '../src/routes/rag.js';
import { decideRagAnswer, filterApprovedCandidates, _MESSAGES } from '../src/rag/answer-gate.js';
import { _resetRahmaAlgorithmForTests } from '../src/services/rahma-algorithm.service.js';

test('Sprint36 — answer gate: retrieval unavailable → rag_unavailable + Arabic notice', () => {
  const d = decideRagAnswer({ retrieval_available: false });
  assert.equal(d.safety_status, 'rag_unavailable');
  assert.equal(d.answer_ar, null);
  assert.equal(d.citations.length, 0);
  assert.equal(d.insufficient_sources_message_ar, _MESSAGES.RAG_UNAVAILABLE_AR);
});

test('Sprint36 — answer gate: empty candidates → insufficient_sources', () => {
  const d = decideRagAnswer({ retrieval_available: true, retrieval_candidates: [] });
  assert.equal(d.safety_status, 'insufficient_sources');
  assert.equal(d.answer_ar, null);
  assert.equal(d.citations.length, 0);
});

test('Sprint36 — answer gate: missing citation_label_ar → dropped', () => {
  const c = [
    { chunk_text_ar: 'نص', citation_label_ar: '' },
    { chunk_text_ar: 'نص', citation_label_ar: '  ' },
    { chunk_text_ar: 'نص', citation_label_ar: 'OK', source_status: 'approved', document_status: 'approved', chunk_status: 'approved' },
  ];
  const filtered = filterApprovedCandidates(c);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].citation_label_ar, 'OK');
});

test('Sprint36 — answer gate: pending/blocked source → dropped', () => {
  const c = [
    { chunk_text_ar: 'نص', citation_label_ar: 'Q', source_status: 'pending_review' },
    { chunk_text_ar: 'نص', citation_label_ar: 'Q', source_status: 'rejected' },
    { chunk_text_ar: 'نص', citation_label_ar: 'Q', source_status: 'unverified' },
    { chunk_text_ar: 'نص', citation_label_ar: 'Q', source_status: 'approved' },
  ];
  const filtered = filterApprovedCandidates(c);
  assert.equal(filtered.length, 1);
});

test('Sprint36 — answer gate: fixture-tagged chunk → dropped', () => {
  const c = [
    { chunk_text_ar: 'نص', citation_label_ar: 'F', is_test_fixture: true, source_status: 'approved' },
    { chunk_text_ar: 'نص', citation_label_ar: 'P', source_status: 'approved' },
  ];
  const filtered = filterApprovedCandidates(c);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].citation_label_ar, 'P');
});

test('Sprint36 — answer gate: cited path returns citations array with source labels', () => {
  const d = decideRagAnswer({
    retrieval_available: true,
    retrieval_candidates: [
      {
        chunk_text_ar: 'نص الذكر',
        citation_label_ar: 'Al-Baqarah 2:255',
        source_type: 'quran',
        source_name_ar: 'القرآن الكريم',
        source_status: 'approved',
        document_status: 'approved',
        chunk_status: 'approved',
        language: 'ar',
      },
    ],
  });
  assert.equal(d.safety_status, 'cited');
  assert.equal(d.answer_ar, null, 'gate never writes prose answers');
  assert.equal(d.citations.length, 1);
  assert.equal(d.citations[0].citation_label_ar, 'Al-Baqarah 2:255');
  assert.equal(d.citations[0].source_type, 'quran');
});

test('Sprint36 — POST /api/rag/query: rag_unavailable when no retrieval adapter wired', async () => {
  _resetRagForTests();
  _resetRagRouteForTests();
  _resetRahmaAlgorithmForTests();
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({
      method: 'POST', url: '/api/rag/query',
      payload: { question_ar: 'سؤال اختباري عن الصلاة' },
    });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.safety_status, 'rag_unavailable');
    assert.equal(body.citations.length, 0);
    assert.equal(body.answer_ar, null);
  } finally {
    await app.close();
  }
});

test('Sprint36 — POST /api/rag/query: insufficient_sources when retrieval returns []', async () => {
  _resetRagForTests();
  _resetRagRouteForTests();
  _resetRahmaAlgorithmForTests();
  const fakeRetrieval = { retrieve: async () => ({ ok: true, candidates: [] }) };
  configureRag({ registry: { countSourcesByStatus: async () => ({ approved: 0, pending_review: 0, unverified: 0, rejected: 0 }) }, retrieval: fakeRetrieval, enabled: true });
  configureRagRouteRetrieval(fakeRetrieval);
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({
      method: 'POST', url: '/api/rag/query',
      payload: { question_ar: 'سؤال اختباري' },
    });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.safety_status, 'insufficient_sources');
    assert.equal(body.answer_ar, null);
    assert.ok(typeof body.insufficient_sources_message_ar === 'string');
  } finally {
    await app.close();
    _resetRagForTests();
    _resetRagRouteForTests();
    _resetRahmaAlgorithmForTests();
  }
});

test('Sprint36 — POST /api/rag/query: cited when retrieval returns approved candidate', async () => {
  _resetRagForTests();
  _resetRagRouteForTests();
  _resetRahmaAlgorithmForTests();
  const fakeRetrieval = {
    retrieve: async () => ({
      ok: true,
      candidates: [
        {
          chunk_text_ar: 'بِسْمِ اللَّهِ',
          citation_label_ar: 'Al-Fatiha 1:1',
          source_type: 'quran',
          source_name_ar: 'القرآن الكريم',
          source_status: 'approved',
          document_status: 'approved',
          chunk_status: 'approved',
          language: 'ar',
        },
      ],
    }),
  };
  configureRag({ registry: { countSourcesByStatus: async () => ({ approved: 1, pending_review: 0, unverified: 0, rejected: 0 }) }, retrieval: fakeRetrieval, enabled: true });
  configureRagRouteRetrieval(fakeRetrieval);
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({
      method: 'POST', url: '/api/rag/query',
      payload: { question_ar: 'ما هي الفاتحة؟' },
    });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.safety_status, 'cited');
    assert.equal(body.answer_ar, null, 'no LLM-drafted answer in cited path');
    assert.equal(body.citations.length, 1);
    assert.equal(body.citations[0].source_type, 'quran');
  } finally {
    await app.close();
    _resetRagForTests();
    _resetRagRouteForTests();
    _resetRahmaAlgorithmForTests();
  }
});

test('Sprint36 — no external LLM imports in src/ (smoke check)', async () => {
  // Spot-check: the codebase must never depend on these packages.
  const banned = [
    'openai', '@openai/agents', '@anthropic-ai/sdk', '@google/generative-ai',
    'langchain', 'llamaindex', 'cohere-ai',
  ];
  const { readFileSync } = await import('node:fs');
  const path = await import('node:path');
  const __filename = (await import('node:url')).fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const pkg = JSON.parse(readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
  const deps = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
  for (const b of banned) {
    assert.ok(!deps.includes(b), `banned LLM dep found: ${b}`);
  }
});
