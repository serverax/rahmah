/**
 * Deterministic proposal generator.
 *
 * Converts a detected gap into a planning proposal that humans can review.
 */

const DEFAULT_ACCEPTANCE = Object.freeze({
  PASS: 'Approved proposal, code/tests prepared, and all approval gates remain in place.',
  PARTIAL: 'Proposal is approved for planning only; no code generation, deploy, or publication yet.',
  FAIL: 'Proposal rejected, or the evidence is too weak / unsafe to proceed.',
});

export function FeatureProposalGenerator({
  gap,
  scores,
  source = 'self_improvement_engine',
  signal_count = 0,
} = {}) {
  const title = buildTitle(gap);
  const problem = buildProblem(gap);
  const suggested_solution = buildSolution(gap);
  const evidence = Array.isArray(gap?.evidence_summary) ? gap.evidence_summary.slice(0, 5) : [];

  return Object.freeze({
    id: proposalId(gap, scores),
    source,
    title,
    problem,
    evidence,
    suggested_solution,
    affected_screens: toArray(gap?.affected_screens, ['home']),
    affected_database_tables: affectedTablesForGap(gap),
    affected_apis: affectedApisForGap(gap),
    safety_rules: safetyRulesForGap(gap),
    tests_required: testsForGap(gap),
    estimated_complexity: estimateComplexity(scores, gap),
    priority_score: scores?.priority_score ?? 50,
    risk_score: scores?.risk_score ?? 0,
    approval_status: 'drafted',
    decision_reason: signal_count > 0 ? 'gap_detected_from_safe_signals' : 'drafted_from_manual_request',
    acceptance_criteria: DEFAULT_ACCEPTANCE,
  });
}

function proposalId(gap, scores) {
  const base = [gap?.gap_type || 'proposal', gap?.title || 'rahma', scores?.priority_score ?? 0, scores?.risk_score ?? 0].join('-');
  let h = 0;
  for (let i = 0; i < base.length; i++) {
    h = ((h << 5) - h) + base.charCodeAt(i);
    h |= 0;
  }
  return `proposal-${Math.abs(h)}`;
}

function buildTitle(gap) {
  const type = String(gap?.gap_type || 'new_feature_idea');
  const labels = {
    content_gap: 'Add missing offline Islamic content',
    ui_ux_improvement: 'Improve Islamic UI and layout',
    algorithm_improvement: 'Refine deterministic Islamic algorithms',
    rag_retrieval_improvement: 'Strengthen approved RAG retrieval',
    performance_issue: 'Improve performance and resilience',
    accessibility_issue: 'Improve accessibility and RTL flow',
    security_issue: 'Harden privacy and security guards',
    new_feature_idea: 'Evaluate new Rahma feature idea',
  };
  return labels[type] || labels.new_feature_idea;
}

function buildProblem(gap) {
  const title = String(gap?.title || 'A recurring gap was detected.');
  return `Safe signals indicate that ${title.toLowerCase()} is affecting user experience or safety.`;
}

function buildSolution(gap) {
  const type = String(gap?.gap_type || 'new_feature_idea');
  switch (type) {
    case 'content_gap':
      return 'Seed approved local content, add cached fallbacks, and keep the backend optional.';
    case 'ui_ux_improvement':
      return 'Rework the screen into a calmer RTL-first layout with visible empty/loading/error states.';
    case 'algorithm_improvement':
      return 'Move the logic into a deterministic local algorithm module with clear input/output tests.';
    case 'rag_retrieval_improvement':
      return 'Tighten source filters, citation checks, and offline cache reuse around approved evidence only.';
    case 'performance_issue':
      return 'Reduce initial work, add lightweight caching, and move heavy processing off the hot path.';
    case 'accessibility_issue':
      return 'Improve contrast, tap targets, semantic labels, and RTL-safe layout measurements.';
    case 'security_issue':
      return 'Strengthen redaction, approval gates, and secret-leak prevention before any release path changes.';
    default:
      return 'Document the feature, draft tasks, and require human approval before code generation.';
  }
}

function affectedTablesForGap(gap) {
  const base = ['improvement_signals', 'feature_gap_reports', 'feature_proposals', 'self_improvement_audit_log'];
  if (String(gap?.gap_type || '').includes('rag')) base.push('approved_content_chunks', 'cached_sheikh_answers');
  if (String(gap?.gap_type || '').includes('algorithm')) base.push('prayer_cache', 'hijri_cache', 'qibla_cache');
  return [...new Set(base)];
}

function affectedApisForGap(gap) {
  const base = ['/api/engine/self-improvement/status', '/api/engine/self-improvement/proposals'];
  if (String(gap?.gap_type || '').includes('rag')) base.push('/api/ask-sheikh', '/api/public/sheikh-hasan');
  if (String(gap?.gap_type || '').includes('content')) base.push('/api/quran', '/api/library', '/api/hadith', '/api/dua');
  return base;
}

function safetyRulesForGap(gap) {
  const rules = [
    'human_approval_required',
    'no_public_release_without_review',
    'no_raw_personal_data_in_proposals',
    'no_llm_autopublish',
  ];
  if (String(gap?.gap_type || '').includes('algorithm')) rules.push('deterministic_algorithms_only');
  if (String(gap?.gap_type || '').includes('rag')) rules.push('approved_sources_only');
  return rules;
}

function testsForGap(gap) {
  const base = [
    'redaction test',
    'approval gate test',
    'audit logging test',
    'no-public-release test',
  ];
  if (String(gap?.gap_type || '').includes('content')) base.push('offline fallback test');
  if (String(gap?.gap_type || '').includes('algorithm')) base.push('deterministic calculation test');
  if (String(gap?.gap_type || '').includes('rag')) base.push('citation gate test');
  return base;
}

function estimateComplexity(scores, gap) {
  const band = scores?.priority_band || 'medium';
  if (band === 'high') return 'medium_to_high';
  if (band === 'low') return 'low';
  if (String(gap?.gap_type || '').includes('algorithm')) return 'medium';
  return 'medium';
}

function toArray(value, fallback) {
  if (Array.isArray(value) && value.length > 0) return value;
  return fallback;
}
