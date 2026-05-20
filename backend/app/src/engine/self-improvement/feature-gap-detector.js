/**
 * Feature gap detector.
 *
 * Converts anonymised signals into actionable improvement gaps.
 * This module only analyses aggregate signals. It never stores raw user text.
 */

const GAP_RULES = [
  {
    gap_type: 'content_gap',
    title: 'Missing local content or unanswered question pattern',
    signal_types: new Set(['failed_search', 'unanswered_question', 'missing_category']),
    screen_hints: ['home', 'quran', 'adhkar', 'library', 'hadith', 'ask_sheikh'],
    threshold: 3,
  },
  {
    gap_type: 'ui_ux_improvement',
    title: 'Screen layout / RTL / empty-state issue',
    signal_types: new Set(['accessibility_issue', 'slow_screen', 'app_error']),
    screen_hints: ['home', 'settings', 'quran', 'ask_sheikh', 'children_game'],
    threshold: 2,
  },
  {
    gap_type: 'algorithm_improvement',
    title: 'Deterministic calculation or scoring logic needs repair',
    signal_types: new Set(['prayer_issue']),
    screen_hints: ['prayer', 'qibla', 'hijri', 'children_game'],
    threshold: 2,
  },
  {
    gap_type: 'rag_retrieval_improvement',
    title: 'Approved retrieval path needs stronger recall / citation controls',
    signal_types: new Set(['rag_retrieval_failure', 'unanswered_question']),
    screen_hints: ['ask_sheikh', 'library', 'hadith', 'quran'],
    threshold: 2,
  },
  {
    gap_type: 'performance_issue',
    title: 'Slow screen or repeated sync failure',
    signal_types: new Set(['slow_screen', 'offline_sync_failure', 'app_error']),
    screen_hints: ['home', 'sync', 'offline', 'background_jobs'],
    threshold: 2,
  },
  {
    gap_type: 'security_issue',
    title: 'Privacy or security concern detected',
    signal_types: new Set(['api_not_configured', 'app_error', 'offline_sync_failure']),
    screen_hints: ['settings', 'support', 'admin'],
    threshold: 2,
  },
  {
    gap_type: 'accessibility_issue',
    title: 'Accessibility or RTL friction',
    signal_types: new Set(['accessibility_issue', 'app_error']),
    screen_hints: ['home', 'quran', 'settings', 'children_game'],
    threshold: 1,
  },
  {
    gap_type: 'new_feature_idea',
    title: 'Repeated feature request or missing workflow',
    signal_types: new Set(['feature_request', 'children_engagement_drop']),
    screen_hints: ['home', 'children_game', 'settings', 'library'],
    threshold: 2,
  },
];

function countByType(signals) {
  const counts = new Map();
  for (const signal of signals) {
    const type = String(signal?.signal_type || 'feature_request');
    counts.set(type, (counts.get(type) || 0) + (Number(signal?.count) || 1));
  }
  return counts;
}

function inferScreens(signals, rule) {
  const screens = new Set();
  for (const signal of signals) {
    const screen = typeof signal?.screen === 'string' && signal.screen.trim() ? signal.screen.trim() : null;
    if (screen && rule.screen_hints.some((hint) => screen.toLowerCase().includes(hint))) {
      screens.add(screen);
    }
  }
  if (screens.size === 0) {
    for (const hint of rule.screen_hints.slice(0, 3)) screens.add(hint);
  }
  return [...screens];
}

export function FeatureGapDetector(signals = []) {
  const safeSignals = Array.isArray(signals) ? signals : [];
  const counts = countByType(safeSignals);
  const gaps = [];

  for (const rule of GAP_RULES) {
    let score = 0;
    let evidence = [];
    for (const signal of safeSignals) {
      const signalType = String(signal?.signal_type || 'feature_request');
      if (!rule.signal_types.has(signalType)) continue;
      const count = Number(signal?.count) || 1;
      score += count;
      if (typeof signal?.anonymised_evidence === 'string' && signal.anonymised_evidence.trim()) {
        evidence.push(signal.anonymised_evidence.trim());
      }
    }

    if (score < rule.threshold) continue;

    const total = [...rule.signal_types].reduce((acc, t) => acc + (counts.get(t) || 0), 0);
    gaps.push(Object.freeze({
      gap_type: rule.gap_type,
      title: rule.title,
      score: total,
      evidence_summary: evidence.slice(0, 5),
      affected_screens: inferScreens(safeSignals, rule),
      signal_types: [...rule.signal_types],
    }));
  }

  return Object.freeze(gaps);
}
