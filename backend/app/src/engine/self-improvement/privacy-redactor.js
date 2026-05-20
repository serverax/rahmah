/**
 * Privacy redaction helpers for the Rahma self-improvement engine.
 *
 * The engine must not keep raw personal data in proposals or audit drafts.
 * This module performs coarse, deterministic redaction only.
 */

const PHONE_RE = /(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)/g;
const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;
const GPS_RE = /\b-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/g;
const PHONE_WORDS_RE = /\b(?:phone|mobile|whatsapp|tel|telephone)\s*[:=]?\s*[+\d][\d\s().-]{6,}\b/gi;
const QUESTION_PREFIXES = [
  {
    regex: /my name is\s+([^\n,.!?]{2,40})/i,
    replacement: '[REDACTED_NAME]',
  },
  {
    regex: /اسمي\s+([^\n,.!?]{2,40})/u,
    replacement: '[REDACTED_NAME]',
  },
  {
    regex: /انا اسمي\s+([^\n,.!?]{2,40})/u,
    replacement: '[REDACTED_NAME]',
  },
  {
    regex: /أنا اسمي\s+([^\n,.!?]{2,40})/u,
    replacement: '[REDACTED_NAME]',
  },
  {
    // Only redact obvious names, not numeric identifiers or phone numbers.
    regex: /call me\s+([A-Za-z\u0600-\u06FF][^\n,.!?]{1,40})/iu,
    replacement: '[REDACTED_NAME]',
  },
];

function cleanWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

export function redactPersonalData(input) {
  const text = typeof input === 'string' ? input : String(input ?? '');
  if (!text.trim()) {
    return Object.freeze({
      original_length: 0,
      redacted_text: '',
      redaction_count: 0,
      redacted: false,
    });
  }

  let redactions = 0;
  let out = text;

  const replaceWith = (regex, replacement) => {
    out = out.replace(regex, () => {
      redactions += 1;
      return replacement;
    });
  };

  replaceWith(PHONE_RE, '[REDACTED_PHONE]');
  replaceWith(EMAIL_RE, '[REDACTED_EMAIL]');
  replaceWith(GPS_RE, '[REDACTED_GPS]');
  replaceWith(PHONE_WORDS_RE, '[REDACTED_PHONE]');

  for (const { regex, replacement } of QUESTION_PREFIXES) {
    out = out.replace(regex, (_match, name) => {
      if (typeof name === 'string' && name.trim().length > 0) {
        redactions += 1;
        return _match.replace(name, replacement);
      }
      return _match;
    });
  }

  if (/[\u0660-\u0669\u06F0-\u06F9]/.test(out)) {
    // Avoid over-redacting Arabic numerals globally. Only target obvious GPS
    // and phone patterns above. This branch is intentionally a no-op and keeps
    // the function deterministic and narrow.
  }

  out = cleanWhitespace(out);

  return Object.freeze({
    original_length: text.length,
    redacted_text: out,
    redaction_count: redactions,
    redacted: redactions > 0,
  });
}

export function anonymiseEvidence(evidence) {
  if (Array.isArray(evidence)) {
    return Object.freeze(evidence.map((entry) => anonymiseEvidence(entry)));
  }
  if (!evidence || typeof evidence !== 'object') {
    return evidence;
  }

  const out = {};
  for (const [key, value] of Object.entries(evidence)) {
    if (key === 'name' || key === 'full_name' || key === 'phone' || key === 'phone_number' || key === 'gps') {
      continue;
    }
    if (typeof value === 'string') {
      const redacted = redactPersonalData(value);
      out[key] = redacted.redacted ? redacted.redacted_text : '[REDACTED_TEXT]';
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.map((item) => (typeof item === 'string'
        ? redactPersonalData(item).redacted_text
        : anonymiseEvidence(item)));
      continue;
    }
    if (value && typeof value === 'object') {
      out[key] = anonymiseEvidence(value);
      continue;
    }
    out[key] = value;
  }
  return Object.freeze(out);
}
