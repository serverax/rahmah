import { buildStrictRagPrompt, getLocalLlmConfig } from './config.js';

export class LocalLlmClient {
  constructor({ config = getLocalLlmConfig(), fetchImpl = globalThis.fetch } = {}) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async draft({ question, chunks, helper = false }) {
    if (!this.config.enabled) return { ok: false, error: 'local_llm_disabled' };
    if (!Array.isArray(chunks) || chunks.length === 0) return { ok: false, error: 'approved_context_required' };
    const prompt = buildStrictRagPrompt({ question, chunks });
    const model = helper ? (this.config.helperModel || 'smollm2:360m-instruct-q4_0') : this.config.model;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs || 15000);
    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ model, prompt, stream: false, options: { num_predict: this.config.maxTokens || 512 } }),
      });
      if (!response.ok) return { ok: false, error: 'local_llm_http_error' };
      const payload = await response.json();
      return parseLlmJson(payload.response);
    } catch {
      return { ok: false, error: 'local_llm_unavailable' };
    } finally {
      clearTimeout(timer);
    }
  }
}

export function parseLlmJson(text) {
  try {
    const parsed = JSON.parse(String(text || '').trim());
    return { answer_ar: parsed.answer_ar, citations: Array.isArray(parsed.citations) ? parsed.citations : [] };
  } catch {
    return { ok: false, error: 'invalid_llm_json' };
  }
}
