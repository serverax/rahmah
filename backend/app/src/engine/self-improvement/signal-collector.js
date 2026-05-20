/**
 * Self-improvement signal collector.
 *
 * Accepts safe, aggregate signals from app analytics, support queues, and
 * review workflows. All free-text evidence is redacted before storage.
 */

import { anonymiseEvidence, redactPersonalData } from './privacy-redactor.js';

const SIGNAL_TYPES = new Set([
  'failed_search',
  'unanswered_question',
  'repeated_request',
  'app_error',
  'slow_screen',
  'missing_category',
  'children_engagement_drop',
  'prayer_issue',
  'azan_issue',
  'offline_sync_failure',
  'accessibility_issue',
  'rag_retrieval_failure',
  'api_not_configured',
  'feature_request',
  'performance_issue',
]);

function normaliseCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(1000, Math.floor(n));
}

function deriveSignalType(source, fallback = 'feature_request') {
  const raw = String(source || fallback).toLowerCase();
  if (SIGNAL_TYPES.has(raw)) return raw;
  if (raw.includes('search')) return 'failed_search';
  if (raw.includes('question')) return 'unanswered_question';
  if (raw.includes('error') || raw.includes('exception')) return 'app_error';
  if (raw.includes('slow') || raw.includes('lag')) return 'slow_screen';
  if (raw.includes('offline') || raw.includes('sync')) return 'offline_sync_failure';
  if (raw.includes('azan') || raw.includes('notification')) return 'azan_issue';
  if (raw.includes('prayer') || raw.includes('qibla') || raw.includes('hijri')) return 'prayer_issue';
  if (raw.includes('children') || raw.includes('game')) return 'children_engagement_drop';
  if (raw.includes('rag') || raw.includes('retrieval')) return 'rag_retrieval_failure';
  return fallback;
}

export function SelfImprovementSignalCollector(input = {}) {
  const rawSignals = Array.isArray(input.signals) ? input.signals : [];
  const source = typeof input.source === 'string' ? input.source : 'unknown';

  const signals = rawSignals.map((signal, index) => {
    const record = signal && typeof signal === 'object' ? signal : {};
    const signal_type = deriveSignalType(record.signal_type || record.type || record.kind || source);
    const screen = typeof record.screen === 'string' ? record.screen : null;
    const count = normaliseCount(record.count || record.occurrences);
    const evidence = [];

    if (typeof record.user_text === 'string' && record.user_text.trim()) {
      evidence.push(redactPersonalData(record.user_text).redacted_text);
    }
    if (typeof record.question_text === 'string' && record.question_text.trim()) {
      evidence.push(redactPersonalData(record.question_text).redacted_text);
    }
    if (typeof record.error_text === 'string' && record.error_text.trim()) {
      evidence.push(redactPersonalData(record.error_text).redacted_text);
    }
    if (typeof record.feedback_text === 'string' && record.feedback_text.trim()) {
      evidence.push(redactPersonalData(record.feedback_text).redacted_text);
    }

    const anonymised_evidence = evidence.length > 0
      ? evidence.join(' | ')
      : JSON.stringify(anonymiseEvidence(record));

    return Object.freeze({
      id: typeof record.id === 'string' && record.id.trim() ? record.id : `signal-${index + 1}`,
      signal_type,
      source: typeof record.source === 'string' && record.source.trim() ? record.source : source,
      screen,
      count,
      anonymised_evidence,
      risk_level: normaliseRisk(record.risk_level || record.risk || 'medium'),
      created_at: typeof record.created_at === 'string' ? record.created_at : new Date().toISOString(),
      metadata: anonymiseEvidence(record.metadata || {}),
    });
  });

  return Object.freeze({
    source,
    collected_count: signals.length,
    signals: Object.freeze(signals),
  });
}

function normaliseRisk(value) {
  const risk = String(value || 'medium').toLowerCase();
  if (risk === 'low' || risk === 'medium' || risk === 'high') return risk;
  return 'medium';
}
