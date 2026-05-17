import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideListPending,
  decideAnswerDraft,
  decidePublish,
} from '../src/services/sheikh-workflow-service.js';
import {
  configureSheikhRepository,
  _resetSheikhRepositoryForTests,
} from '../src/sheikh/sheikh-question-repository.js';

function envSnap() { return { AUTH_MODE: process.env.AUTH_MODE, SESSION_SECRET: process.env.SESSION_SECRET, DATABASE_URL: process.env.DATABASE_URL }; }
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

test('Sprint65 — listPending: 503-shaped error when auth not configured', () => {
  const s = envSnap();
  delete process.env.AUTH_MODE;
  delete process.env.SESSION_SECRET;
  _resetSheikhRepositoryForTests();
  const d = decideListPending();
  assert.equal(d.error, 'auth_not_configured');
  envRestore(s);
});

test('Sprint65 — listPending: auth configured, repo unconfigured → service_not_configured', () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'a'.repeat(32);
  _resetSheikhRepositoryForTests();
  const d = decideListPending();
  assert.equal(d.reason, 'service_not_configured');
  envRestore(s);
});

test('Sprint65 — answerDraft: insufficient citation blocked', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'a'.repeat(32);
  const d = await decideAnswerDraft({ citations: [], publication_mode: 'public' });
  assert.equal(d.ok, false);
  assert.equal(d.reason, 'no_citations_provided');
  envRestore(s);
});

test('Sprint65 — answerDraft: quran-cited public draft, no DB → persisted=false', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'a'.repeat(32);
  delete process.env.DATABASE_URL;
  const d = await decideAnswerDraft({
    citations: [{ citation_type: 'quran', citation_label: 'Al-Fatiha 1:1' }],
    publication_mode: 'public',
  });
  assert.equal(d.persisted, false);
  assert.equal(d.citation_status, 'quran_cited');
  assert.equal(d.reason, 'database_not_configured');
  envRestore(s);
});

test('Sprint65 — publish: insufficient citation_status blocked', () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'a'.repeat(32);
  configureSheikhRepository({ repository: {} });
  const d = decidePublish({
    citation_status: 'scholar_advice_needs_review',
    wasm_fatwa_gate_available: true,
    wasm_child_safety_available: true,
  });
  assert.equal(d.ok, false);
  assert.equal(d.reason, 'citation_status_requires_explicit_override');
  _resetSheikhRepositoryForTests();
  envRestore(s);
});

test('Sprint65 — publish: WASM fatwa-gate unavailable → blocker', () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'a'.repeat(32);
  configureSheikhRepository({ repository: {} });
  const d = decidePublish({
    citation_status: 'quran_cited',
    wasm_fatwa_gate_available: false,
    wasm_child_safety_available: true,
  });
  assert.equal(d.reason, 'wasm_fatwa_gate_unavailable');
  _resetSheikhRepositoryForTests();
  envRestore(s);
});

test('Sprint65 — publish: WASM child-safety unavailable → blocker', () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'a'.repeat(32);
  configureSheikhRepository({ repository: {} });
  const d = decidePublish({
    citation_status: 'quran_cited',
    wasm_fatwa_gate_available: true,
    wasm_child_safety_available: false,
  });
  assert.equal(d.reason, 'wasm_child_safety_unavailable');
  _resetSheikhRepositoryForTests();
  envRestore(s);
});

test('Sprint65 — publish: all gates green → published_public, persisted=false (repo INSERT not wired)', () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'a'.repeat(32);
  configureSheikhRepository({ repository: {} });
  const d = decidePublish({
    citation_status: 'quran_cited',
    wasm_fatwa_gate_available: true,
    wasm_child_safety_available: true,
  });
  assert.equal(d.ok, true);
  assert.equal(d.next_publication_status, 'published_public');
  assert.equal(d.persisted, false);
  _resetSheikhRepositoryForTests();
  envRestore(s);
});

test('Sprint65 — publish: requires auth configured', () => {
  const s = envSnap();
  delete process.env.AUTH_MODE;
  delete process.env.SESSION_SECRET;
  const d = decidePublish({
    citation_status: 'quran_cited',
    wasm_fatwa_gate_available: true,
    wasm_child_safety_available: true,
  });
  assert.equal(d.error, 'auth_not_configured');
  envRestore(s);
});
