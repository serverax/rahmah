import { createHash } from 'node:crypto';

const PUNCT_RE = /[\u0640\u061f\u060c.,!?؛:()[\]{}<>"'`]+/g;

function normalizeSpace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function normalizeTrustedText(text) {
  return normalizeSpace(text).replace(PUNCT_RE, ' ').replace(/\s+/g, ' ').trim();
}

export function tokenizeTrustedText(text) {
  const normalized = normalizeTrustedText(text).toLowerCase();
  if (!normalized) return [];
  return normalized
    .split(/[\s/\\|]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

export function stableHash(text) {
  return createHash('sha256').update(String(text || '').trim()).digest('hex');
}

export function createFallbackEmbedding(text, dimensions = 16) {
  const size = Math.max(8, Math.min(64, dimensions | 0));
  const vector = new Array(size).fill(0);
  const tokens = tokenizeTrustedText(text);
  if (tokens.length === 0) return vector;
  for (const token of tokens) {
    const digest = createHash('sha256').update(token).digest();
    const slot = digest.readUInt32BE(0) % size;
    vector[slot] += 1;
  }
  const scale = Math.max(1, tokens.length);
  return vector.map((n) => Number((n / scale).toFixed(6)));
}

export function buildCitationLabel({ titleAr = '', surahNumber = null, ayahNumber = null, sourceReference = '' } = {}) {
  const title = normalizeSpace(titleAr);
  if (title && surahNumber && ayahNumber) return `${title} ${surahNumber}:${ayahNumber}`;
  if (title && sourceReference) return `${title} — ${sourceReference}`;
  if (title) return title;
  if (sourceReference) return sourceReference;
  return 'citation';
}

export function scoreTrustedChunk(question, candidate) {
  const q = normalizeTrustedText(question).toLowerCase();
  const qTokens = tokenizeTrustedText(question);
  if (!q) return 0;
  const titleAr = normalizeTrustedText(candidate?.title_ar || candidate?.document_title_ar || '').toLowerCase();
  const titleEn = normalizeTrustedText(candidate?.title_en || '').toLowerCase();
  const chunkText = normalizeTrustedText(candidate?.chunk_text_ar || candidate?.chunk_text || '').toLowerCase();
  const citation = normalizeTrustedText(candidate?.citation_label || candidate?.citation_label_ar || '').toLowerCase();
  const haystacks = [titleAr, titleEn, chunkText, citation].filter(Boolean);
  let score = 0;
  for (const h of haystacks) {
    if (h === q) score += 100;
    if (h.includes(q)) score += 80;
    for (const token of qTokens) {
      if (token && h.includes(token)) score += 10;
    }
  }
  if (candidate?.source_approved === true && String(candidate?.license_status || '').toLowerCase() === 'approved') {
    score += 10;
  }
  return Math.min(score, 100);
}

export function composeVerifiedAnswer(candidates, { maxChars = 2500 } = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { answer_ar: null, citation_labels: [] };
  }
  const citation_labels = [];
  const parts = [];
  for (const candidate of candidates) {
    const text = normalizeSpace(candidate?.chunk_text_ar || candidate?.chunk_text || '');
    const citation = normalizeSpace(candidate?.citation_label_ar || candidate?.citation_label || '');
    if (text && !parts.includes(text)) parts.push(text);
    if (citation && !citation_labels.includes(citation)) citation_labels.push(citation);
    if (parts.join('\n\n').length >= maxChars) break;
  }
  const answer_ar = parts.join('\n\n').slice(0, maxChars).trim() || null;
  return { answer_ar, citation_labels };
}

export function isApprovedTrustedSourceRecord(record) {
  if (!record || typeof record !== 'object') return false;
  if (record.source_approved !== true) return false;
  if (String(record.license_status || '').toLowerCase() !== 'approved') return false;
  if (typeof record.trust_level !== 'string' || record.trust_level.trim().length === 0) return false;
  if (typeof record.content_hash !== 'string' || record.content_hash.trim().length === 0) return false;
  return true;
}
