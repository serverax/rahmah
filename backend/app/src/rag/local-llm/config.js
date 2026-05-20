export function getLocalLlmConfig(env = process.env) {
  const enabled = String(env.RAHMA_LOCAL_LLM_ENABLED || 'false').toLowerCase() === 'true';
  return {
    enabled,
    provider: env.RAHMA_LOCAL_LLM_PROVIDER || 'ollama',
    model: env.RAHMA_LOCAL_LLM_MODEL || 'qwen2.5:0.5b-instruct-q5_0',
    helperModel: env.RAHMA_LOCAL_LLM_HELPER_MODEL || 'smollm2:360m-instruct-q4_0',
    requireApprovedContext: String(env.RAHMA_LOCAL_LLM_REQUIRE_APPROVED_CONTEXT || 'true').toLowerCase() !== 'false',
    requireCitations: String(env.RAHMA_LOCAL_LLM_REQUIRE_CITATIONS || 'true').toLowerCase() !== 'false',
    allowDirectReligiousAnswers: String(env.RAHMA_LOCAL_LLM_ALLOW_DIRECT_RELIGIOUS_ANSWERS || 'false').toLowerCase() === 'true',
    baseUrl: env.RAHMA_LOCAL_LLM_BASE_URL || 'http://localhost:11434',
    timeoutMs: Number(env.RAHMA_LOCAL_LLM_TIMEOUT_MS || 15000),
  };
}

export const LOCAL_LLM_CLUSTER_DEFAULTS = Object.freeze({
  RAHMA_LOCAL_LLM_ENABLED: 'true',
  RAHMA_LOCAL_LLM_PROVIDER: 'ollama',
  RAHMA_LOCAL_LLM_MODEL: 'qwen2.5:0.5b-instruct-q5_0',
  RAHMA_LOCAL_LLM_HELPER_MODEL: 'smollm2:360m-instruct-q4_0',
  RAHMA_LOCAL_LLM_BASE_URL: 'http://ollama.ordinox-ai.svc.cluster.local:11434',
});

export function buildStrictRagPrompt({ question, chunks }) {
  const context = chunks.map((chunk, i) => [
    `[${i + 1}] source_id=${chunk.source_id}`,
    `title=${chunk.title || ''}`,
    `citation=${chunk.citation || ''}`,
    `text_ar=${chunk.text_ar || ''}`,
    `translation=${chunk.translation || ''}`,
  ].join('\n')).join('\n\n');

  return `أنت مساعد صياغة فقط داخل تطبيق رحمة. لست جهة فتوى.\n\nالقواعد الصارمة:\n- أجب فقط من السياق المعتمد المرفق.\n- أدرج الاستشهادات كما هي.\n- إذا كان السياق غير كاف فقل: لا أستطيع الإجابة بثقة بدون مصدر معتمد.\n- لا تخترع آية أو حديثاً أو حكماً أو اسم عالم.\n- لا تعدل النص العربي للقرآن.\n\nالسؤال:\n${question}\n\nالسياق المعتمد:\n${context}\n\nأعد JSON فقط بالشكل: {"answer_ar":"...","citations":["..."]}`;
}

