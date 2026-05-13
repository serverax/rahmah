import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from '../src/app.js';
import {
  decideIngestion,
  isAllowedDecision,
} from '../src/rag/ingestion-controller.js';
import { chunkArabicText, chunkLength } from '../src/rag/chunking.js';
import { createIslamicSourceRegistry } from '../src/rag/source-registry.js';
import { createIslamicRetrieval, isSafeToAnswerFromRag } from '../src/rag/retrieval.js';
import {
  buildRagStatus,
  configureRag,
  _resetRagForTests,
} from '../src/rag/rag-status.js';
import { _resetPoolForTests } from '../src/db/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'db', 'migrations');

function envSnapshot() { return { DATABASE_URL: process.env.DATABASE_URL }; }
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

before(() => _resetRagForTests());
after(() => _resetRagForTests());

// -------------- Migration shape ----------------------------------------------

test('migration 004 declares the 8 required tables', async () => {
  const text = await fs.readFile(path.join(MIGRATIONS_DIR, '004_islamic_rag_foundation.sql'), 'utf8');
  for (const t of [
    'islamic_source_registry',
    'islamic_source_documents',
    'islamic_source_chunks',
    'islamic_source_embeddings',
    'islamic_ingestion_jobs',
    'islamic_ingestion_job_events',
    'islamic_rag_query_audit',
    'islamic_source_review_status',
  ]) {
    assert.ok(new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${t}\\b`).test(text), `missing table ${t}`);
  }
});

test('migration 004 has no secrets / destructive ops / seed INSERTs', async () => {
  const text = await fs.readFile(path.join(MIGRATIONS_DIR, '004_islamic_rag_foundation.sql'), 'utf8');
  assert.ok(!/INSERT\s+INTO\s+islamic_/i.test(text), 'no seed INSERTs allowed');
  assert.ok(!/DROP\s+DATABASE/i.test(text));
  assert.ok(!/DROP\s+SCHEMA/i.test(text));
  assert.ok(!/TRUNCATE\s+/i.test(text));
  assert.ok(!/DELETE\s+FROM\s+islamic_/i.test(text));
  assert.ok(!/postgres(ql)?:\/\//.test(text));
  assert.ok(!/REPLACE_ME/.test(text));
});

test('migration 004 partial index for approved chunks exists', async () => {
  const text = await fs.readFile(path.join(MIGRATIONS_DIR, '004_islamic_rag_foundation.sql'), 'utf8');
  assert.ok(/WHERE verification_status = 'approved'/.test(text), 'partial index missing');
});

// -------------- Ingestion controller ----------------------------------------

test('ingestion: rejected when source_type invalid', () => {
  const r = decideIngestion({ source_type: 'bogus', body_ar: 'محتوى', source_reference: 'مرجع' });
  assert.equal(r.decision, 'rejected');
  assert.equal(r.reason, 'invalid_source_type');
});

test('ingestion: body too short → rejected', () => {
  const r = decideIngestion({ source_type: 'dua', body_ar: 'هي', source_reference: 'مرجع' });
  assert.equal(r.decision, 'rejected');
});

test('ingestion: quran without source_reference → needs_source', () => {
  const r = decideIngestion({
    source_type: 'quran',
    body_ar: 'اللهم علمنا ما ينفعنا وانفعنا بما علمتنا',
    source_reference: '',
  });
  assert.equal(r.decision, 'needs_source');
});

test('ingestion: child_content asking phone number → rejected', () => {
  const r = decideIngestion({
    source_type: 'child_content',
    body_ar: 'يا طفل أعطنا رقم الجوال من فضلك',
    source_reference: 'سيناريو',
  });
  assert.equal(r.decision, 'rejected');
  assert.equal(r.reason, 'child_content_asks_personal_data');
});

test('ingestion: child_content with shaming → rejected', () => {
  const r = decideIngestion({
    source_type: 'child_content',
    body_ar: 'إجابتك غبية يا طفل',
    source_reference: 'سيناريو',
  });
  assert.equal(r.decision, 'rejected');
  assert.equal(r.reason, 'child_content_shaming_language');
});

test('ingestion: dua / azkar default → pending_review', () => {
  const r = decideIngestion({
    source_type: 'dua',
    body_ar: 'اللهم اجعلنا من الذاكرين',
    source_reference: 'مرجع داخلي',
  });
  assert.equal(r.decision, 'pending_review');
});

test('ingestion: fiqh_note / sheikh_answer → needs_sheikh_review', () => {
  for (const t of ['fiqh_note', 'sheikh_answer']) {
    const r = decideIngestion({
      source_type: t,
      body_ar: 'ملاحظة علمية تحتاج لمراجعة الشيخ',
      source_reference: 'كتاب',
    });
    assert.equal(r.decision, 'needs_sheikh_review', `for ${t}`);
  }
});

test('ingestion: duplicate content_hash → duplicate', () => {
  const first = decideIngestion({
    source_type: 'dua',
    body_ar: 'اللهم اجعلنا من الذاكرين',
    source_reference: 'مرجع داخلي',
  });
  assert.equal(first.decision, 'pending_review');
  const seen = new Set([first.content_hash]);
  const second = decideIngestion({
    source_type: 'dua',
    body_ar: 'اللهم اجعلنا من الذاكرين',
    source_reference: 'مرجع داخلي',
  }, { existingHashes: seen });
  assert.equal(second.decision, 'duplicate');
});

test('isAllowedDecision allow-list', () => {
  for (const d of ['pending_review', 'needs_source', 'needs_sheikh_review', 'duplicate', 'rejected']) {
    assert.equal(isAllowedDecision(d), true);
  }
  assert.equal(isAllowedDecision('publish'), false);
});

// -------------- Chunking ----------------------------------------------------

test('chunkArabicText: empty input → []', () => {
  assert.deepEqual(chunkArabicText(''), []);
  assert.deepEqual(chunkArabicText('   '), []);
  assert.deepEqual(chunkArabicText(null), []);
});

test('chunkArabicText: produces bounded chunks', () => {
  const text = 'هذه جملة. وهذه جملة أخرى. وهذه ثالثة. '.repeat(40);
  const chunks = chunkArabicText(text, { maxChars: 100 });
  for (const c of chunks) assert.ok(c.length <= 100, `chunk too long: ${c.length}`);
  assert.ok(chunks.length > 1);
  assert.ok(chunkLength(chunks) > 0);
});

// -------------- Source registry (no pool) -----------------------------------

test('source-registry without pool returns service_not_configured', async () => {
  const reg = createIslamicSourceRegistry({});
  const r = await reg.registerSource({
    source_type: 'dua',
    source_name_ar: 'دعاء',
    source_reference: 'مرجع',
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'service_not_configured');
});

test('source-registry rejects invalid source_type before DB call', async () => {
  const reg = createIslamicSourceRegistry({});
  const r = await reg.registerSource({
    source_type: 'invalid',
    source_name_ar: 'name',
    source_reference: 'ref',
  });
  assert.equal(r.reason, 'invalid_source_type');
});

test('source-registry countSourcesByStatus returns zeros without pool', async () => {
  const reg = createIslamicSourceRegistry({});
  const counts = await reg.countSourcesByStatus();
  assert.deepEqual(counts, { approved: 0, pending_review: 0, unverified: 0, rejected: 0 });
});

// -------------- Retrieval ---------------------------------------------------

test('retrieval without pool returns not_configured', async () => {
  const r = createIslamicRetrieval({});
  const out = await r.retrieve({ question: 'كيف نصلي؟' });
  assert.equal(out.ok, false);
  assert.equal(out.reason, 'not_configured');
  assert.deepEqual(out.candidates, []);
});

test('isSafeToAnswerFromRag: empty / malformed candidates → false', () => {
  assert.equal(isSafeToAnswerFromRag([]), false);
  assert.equal(isSafeToAnswerFromRag(null), false);
  assert.equal(isSafeToAnswerFromRag([{ chunk_text_ar: '' }]), false);
  assert.equal(isSafeToAnswerFromRag([{ chunk_text_ar: 'نص', citation_label_ar: '' }]), false);
});

test('isSafeToAnswerFromRag: well-formed candidate → true', () => {
  assert.equal(isSafeToAnswerFromRag([
    { chunk_text_ar: 'نص قصير', citation_label_ar: 'البقرة 183' },
  ]), true);
});

// -------------- /api/rag/status route ---------------------------------------

test('GET /api/rag/status (no DB) returns mode=foundation, safe=false', async () => {
  const snap = envSnapshot();
  delete process.env.DATABASE_URL;
  _resetPoolForTests();
  _resetRagForTests();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/rag/status' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.rag_enabled, true);
    assert.equal(body.mode, 'foundation');
    assert.equal(body.database_configured, false);
    assert.equal(body.vector_configured, false);
    assert.equal(body.documents_indexed, 0);
    assert.equal(body.chunks_indexed, 0);
    assert.equal(body.safe_to_answer_from_rag, false);
  } finally {
    await app.close();
    envRestore(snap);
  }
});

test('rag-status reflects registry + retrieval injection but stays mode=foundation without DB', async () => {
  const snap = envSnapshot();
  delete process.env.DATABASE_URL;
  _resetPoolForTests();
  _resetRagForTests();
  configureRag({
    registry: createIslamicSourceRegistry({}),
    retrieval: createIslamicRetrieval({}),
  });
  const s = await buildRagStatus();
  // No DB → mode stays foundation even with registry+retrieval objects.
  assert.equal(s.mode, 'foundation');
  assert.equal(s.safe_to_answer_from_rag, false);
  envRestore(snap);
  _resetRagForTests();
});

// -------------- /ready contains rag block -----------------------------------

test('GET /ready contains rag block + engine block + sheikh_audit block', async () => {
  const snap = envSnapshot();
  delete process.env.DATABASE_URL;
  _resetPoolForTests();
  _resetRagForTests();
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    assert.equal(typeof body.rag, 'object');
    assert.equal(body.rag.mode, 'foundation');
    assert.equal(body.rag.documents_indexed, 0);
    assert.equal(typeof body.engine, 'object');
    assert.equal(body.engine.implemented, false);
    assert.equal(body.engine.mode, 'not_implemented');
    assert.equal(typeof body.sheikh_audit, 'object');
    assert.equal(body.sheikh_audit.configured, false);
    assert.equal(body.safe_to_serve_public, false);
  } finally {
    await app.close();
    envRestore(snap);
  }
});
