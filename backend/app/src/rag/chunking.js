/**
 * Deterministic text chunker — Arabic-aware.
 *
 * Splits a long text into bounded chunks while preserving paragraph and
 * sentence boundaries where possible. Pure function, no I/O.
 *
 * Rules:
 *   - Maximum chunk length defaults to 600 characters; never exceeds 1200.
 *   - Splits on Arabic full-stop (.), question mark (؟), Arabic semicolon (؛),
 *     and Latin counterparts; also on double newlines.
 *   - Empty inputs → empty list.
 *   - Whitespace-only inputs → empty list.
 */

const DEFAULT_MAX = 600;
const HARD_MAX = 1200;
const MIN_CHUNK = 32;

const SENTENCE_BOUNDARY = /[،؛؟.!?؟،؛]+\s+|\n{2,}/g;

export function chunkArabicText(text, { maxChars = DEFAULT_MAX } = {}) {
  if (typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];
  const target = Math.min(Math.max(MIN_CHUNK, maxChars | 0), HARD_MAX);

  // Pre-split on sentence boundaries to avoid breaking mid-word.
  const sentences = trimmed
    .split(SENTENCE_BOUNDARY)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) return [trimmed.slice(0, target)];

  const chunks = [];
  let buf = '';
  for (const s of sentences) {
    if (s.length > target) {
      // Sentence itself exceeds target — flush buffer and slice the sentence.
      if (buf.length > 0) { chunks.push(buf); buf = ''; }
      for (let i = 0; i < s.length; i += target) {
        chunks.push(s.slice(i, i + target));
      }
      continue;
    }
    if (buf.length === 0) {
      buf = s;
    } else if (buf.length + 1 + s.length <= target) {
      buf = `${buf} ${s}`;
    } else {
      chunks.push(buf);
      buf = s;
    }
  }
  if (buf.length > 0) chunks.push(buf);

  return chunks;
}

export function chunkLength(chunks) {
  if (!Array.isArray(chunks)) return 0;
  let n = 0;
  for (const c of chunks) if (typeof c === 'string') n += c.length;
  return n;
}
