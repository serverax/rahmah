export function classifyQuestion(text = '') {
  const q = text.toLowerCase();
  if (/قرآن|اية|آية|سورة|تلاوة/.test(q)) return 'quran';
  if (/حديث|صحيح|رواه|البخاري|مسلم/.test(q)) return 'hadith';
  if (/صلاة|وضوء|زكاة|صيام|حج|فقه|حكم/.test(q)) return 'fiqh';
  if (/أسرة|زوج|زوجة|أطفال|طفل|والد/.test(q)) return 'family';
  if (/دعاء|ذكر|أذكار/.test(q)) return 'adhkar';
  return 'general';
}

export function approvedChunk(chunk) {
  return Boolean(
    chunk &&
    chunk.source_approved === true &&
    chunk.license_status === 'approved' &&
    chunk.source_id &&
    chunk.citation &&
    (chunk.text_ar || chunk.translation)
  );
}

export function filterApprovedChunks(chunks = [], { language = 'ar', category } = {}) {
  return chunks.filter((chunk) => {
    if (!approvedChunk(chunk)) return false;
    if (chunk.language && chunk.language !== language) return false;
    if (category && chunk.category && chunk.category !== category) return false;
    return true;
  });
}

export function findExactApprovedAnswer({ question, cachedAnswers = [] }) {
  const normalized = normalizeQuestion(question);
  return cachedAnswers.find((answer) =>
    answer.approved === true &&
    answer.publication_status === 'approved_public' &&
    normalizeQuestion(answer.question_ar) === normalized &&
    Array.isArray(answer.citations) &&
    answer.citations.length > 0
  ) || null;
}

export function validateDraftAnswer(draft) {
  if (!draft || typeof draft.answer_ar !== 'string' || draft.answer_ar.trim().length === 0) {
    return { ok: false, reason: 'empty_answer' };
  }
  if (!Array.isArray(draft.citations) || draft.citations.length === 0) {
    return { ok: false, reason: 'missing_citations' };
  }
  return { ok: true };
}

export async function answerWithRag({ question, cachedAnswers = [], chunks = [], llm, language = 'ar' }) {
  const exact = findExactApprovedAnswer({ question, cachedAnswers });
  if (exact) {
    return { ok: true, mode: 'exact_cache', answer_ar: exact.answer_ar, citations: exact.citations, requires_review: false, llm_called: false };
  }

  const category = classifyQuestion(question);
  const approved = filterApprovedChunks(chunks, { language, category });
  if (approved.length === 0) {
    return {
      ok: false,
      mode: 'review_required',
      refusal_ar: 'لا أستطيع الإجابة بثقة بدون مصدر معتمد. سيتم تحويل السؤال للمراجعة.',
      category,
      requires_review: true,
      llm_called: false,
    };
  }

  if (!llm || typeof llm.draft !== 'function') {
    return { ok: false, mode: 'llm_unavailable', requires_review: true, llm_called: false };
  }

  const draft = await llm.draft({ question, chunks: approved });
  const validation = validateDraftAnswer(draft);
  if (!validation.ok) {
    return { ok: false, mode: 'draft_rejected', reason: validation.reason, requires_review: true, llm_called: true };
  }

  return {
    ok: true,
    mode: 'rag_draft_requires_review',
    answer_ar: draft.answer_ar,
    citations: draft.citations,
    category,
    requires_review: true,
    llm_called: true,
  };
}

export function normalizeQuestion(text = '') {
  return String(text).trim().replace(/[؟?!.،,]/g, '').replace(/\s+/g, ' ').toLowerCase();
}

export function publicApprovedAnswers(answers = []) {
  return answers.filter((answer) =>
    answer.approved === true &&
    answer.publication_status === 'approved_public' &&
    Array.isArray(answer.citations) &&
    answer.citations.length > 0
  );
}

export function offlineApprovedAnswerCache(answers = []) {
  return publicApprovedAnswers(answers).map((answer) => ({
    answer_id: answer.answer_id || answer.id,
    question_ar: answer.question_ar,
    answer_ar: answer.answer_ar,
    citations: answer.citations,
    cached_at: answer.cached_at || new Date(0).toISOString(),
  }));
}

export function deterministicOnlyModule(name) {
  return ['prayer', 'qibla', 'hijri', 'quran_normalization', 'children_rewards', 'source_approval', 'cache_freshness', 'sync_state'].includes(name);
}
