import test from 'node:test';
import assert from 'node:assert/strict';
import { answerWithRag, filterApprovedChunks, validateDraftAnswer, publicApprovedAnswers, offlineApprovedAnswerCache, deterministicOnlyModule } from '../src/rag/answer-flow/safe-rag-answer.js';
import { LocalLlmClient } from '../src/rag/local-llm/client.js';
import { getLocalLlmConfig, buildStrictRagPrompt } from '../src/rag/local-llm/config.js';

test('exact approved cached answer returns without LLM', async () => {
  let called = false;
  const result = await answerWithRag({
    question: 'هل يمكن قراءة الأذكار من الهاتف؟',
    cachedAnswers: [{ question_ar: 'هل يمكن قراءة الأذكار من الهاتف؟', answer_ar: 'نعم.', citations: ['approved-source:1'], approved: true, publication_status: 'approved_public' }],
    chunks: [],
    llm: { draft: async () => { called = true; return {}; } },
  });
  assert.equal(result.mode, 'exact_cache');
  assert.equal(result.llm_called, false);
  assert.equal(called, false);
});

test('LLM is called only when approved chunks exist', async () => {
  let called = false;
  const chunks = [{ source_id: 'tanzil-quran-text', license_status: 'approved', source_approved: true, citation: 'Quran 1:1', text_ar: 'بِسْمِ ٱللَّهِ', category: 'quran', language: 'ar' }];
  const result = await answerWithRag({
    question: 'ما معنى آية من القرآن؟',
    chunks,
    llm: { draft: async () => { called = true; return { answer_ar: 'النص يشير إلى البدء باسم الله.', citations: ['Quran 1:1'] }; } },
  });
  assert.equal(called, true);
  assert.equal(result.mode, 'rag_draft_requires_review');
  assert.equal(result.requires_review, true);
});

test('LLM is not called when no approved source exists', async () => {
  let called = false;
  const result = await answerWithRag({
    question: 'ما حكم مسألة؟',
    chunks: [{ source_id: 'unknown', license_status: 'needs_review', source_approved: false, citation: 'x', text_ar: 'x' }],
    llm: { draft: async () => { called = true; return {}; } },
  });
  assert.equal(called, false);
  assert.equal(result.mode, 'review_required');
  assert.match(result.refusal_ar, /لا أستطيع/);
});

test('answer without citation is rejected', () => {
  assert.deepEqual(validateDraftAnswer({ answer_ar: 'نص بلا مصدر', citations: [] }), { ok: false, reason: 'missing_citations' });
});

test('unapproved sources are blocked from retrieval', () => {
  const approved = filterApprovedChunks([
    { source_id: 'ok', license_status: 'approved', source_approved: true, citation: 'c', text_ar: 'x' },
    { source_id: 'bad', license_status: 'needs_review', source_approved: true, citation: 'c', text_ar: 'x' },
    { source_id: 'bad2', license_status: 'approved', source_approved: false, citation: 'c', text_ar: 'x' },
  ]);
  assert.equal(approved.length, 1);
  assert.equal(approved[0].source_id, 'ok');
});

test('local LLM config defaults to controlled tiny model', () => {
  const cfg = getLocalLlmConfig({ RAHMA_LOCAL_LLM_ENABLED: 'true' });
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.provider, 'ollama');
  assert.equal(cfg.model, 'qwen2.5:0.5b-instruct-q5_0');
  assert.equal(cfg.baseUrl, 'http://localhost:11434');
});

test('strict prompt forbids invention and requires citations', () => {
  const prompt = buildStrictRagPrompt({ question: 'سؤال', chunks: [{ source_id: 's', citation: 'c', text_ar: 'نص' }] });
  assert.match(prompt, /أجب فقط من السياق المعتمد/);
  assert.match(prompt, /لا تخترع/);
  assert.match(prompt, /لا تعدل النص العربي للقرآن/);
});

test('public endpoint projection only returns approved Sheikh answers', () => {
  const answers = publicApprovedAnswers([
    { id: 'a1', question_ar: 'q', answer_ar: 'a', citations: ['c'], approved: true, publication_status: 'approved_public' },
    { id: 'a2', question_ar: 'q', answer_ar: 'draft', citations: ['c'], approved: false, publication_status: 'pending_review' },
    { id: 'a3', question_ar: 'q', answer_ar: 'no citation', citations: [], approved: true, publication_status: 'approved_public' },
  ]);
  assert.equal(answers.length, 1);
  assert.equal(answers[0].id, 'a1');
});

test('offline cache uses only approved public answers', () => {
  const cached = offlineApprovedAnswerCache([
    { id: 'a1', question_ar: 'q', answer_ar: 'a', citations: ['c'], approved: true, publication_status: 'approved_public' },
    { id: 'a2', question_ar: 'q', answer_ar: 'pending', citations: ['c'], approved: true, publication_status: 'pending_review' },
  ]);
  assert.equal(cached.length, 1);
  assert.equal(cached[0].answer_ar, 'a');
});

test('deterministic modules are not LLM modules', () => {
  for (const name of ['prayer', 'qibla', 'hijri', 'quran_normalization', 'children_rewards', 'source_approval', 'cache_freshness', 'sync_state']) {
    assert.equal(deterministicOnlyModule(name), true);
  }
});

test('local LLM client parses valid JSON and hides prompt on errors', async () => {
  const client = new LocalLlmClient({
    config: { enabled: true, baseUrl: 'http://ollama.invalid', model: 'qwen2.5:0.5b-instruct-q5_0', timeoutMs: 100, maxTokens: 32 },
    fetchImpl: async () => ({ ok: true, json: async () => ({ response: '{"answer_ar":"جواب","citations":["c"]}' }) }),
  });
  const result = await client.draft({ question: 'سؤال', chunks: [{ source_id: 's', citation: 'c', text_ar: 'نص' }] });
  assert.equal(result.answer_ar, 'جواب');
  assert.deepEqual(result.citations, ['c']);

  const failed = await new LocalLlmClient({
    config: { enabled: true, baseUrl: 'http://ollama.invalid', model: 'm', timeoutMs: 100 },
    fetchImpl: async () => ({ ok: false }),
  }).draft({ question: 'SECRET_PROMPT_SHOULD_NOT_LEAK', chunks: [{ source_id: 's', citation: 'c', text_ar: 'نص' }] });
  assert.equal(failed.error, 'local_llm_http_error');
  assert.equal(JSON.stringify(failed).includes('SECRET_PROMPT_SHOULD_NOT_LEAK'), false);
});
