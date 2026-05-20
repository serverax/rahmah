import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import {
  redactPersonalData,
  SelfImprovementSignalCollector,
  FeatureGapDetector,
  ImprovementPrioritiser,
  FeatureProposalGenerator,
  DevTaskGenerator,
  TestPlanGenerator,
  SafeCodeChangePlanner,
  HumanApprovalGate,
  AuditLogWriter,
  selfImprovementMetadata,
} from '../src/engine/self-improvement/index.js';

test('privacy redactor removes names, phones, emails, and GPS-like coordinates', () => {
  const redacted = redactPersonalData('My name is Ahmad. Call me +44 7700 900123. Email me at a@b.com. GPS 24.7136, 46.6753');
  assert.equal(redacted.redacted, true);
  assert.ok(!redacted.redacted_text.includes('Ahmad'));
  assert.ok(!redacted.redacted_text.includes('+44'));
  assert.ok(!redacted.redacted_text.includes('@'));
  assert.ok(redacted.redacted_text.includes('[REDACTED_PHONE]'));
  assert.ok(redacted.redacted_text.includes('[REDACTED_EMAIL]'));
  assert.ok(redacted.redacted_text.includes('[REDACTED_GPS]'));
});

test('signal collector anonymises evidence before analysis', () => {
  const collected = SelfImprovementSignalCollector({
    source: 'mobile-feedback',
    signals: [{
      signal_type: 'unanswered_question',
      screen: 'ask_sheikh',
      user_text: 'اسمي علي 0501234567 وسؤالي الخاص جدا',
      metadata: { phone: '+966500000000', note: 'private question' },
    }],
  });
  assert.equal(collected.collected_count, 1);
  assert.ok(!collected.signals[0].anonymised_evidence.includes('0501234567'));
  assert.ok(!JSON.stringify(collected).includes('0501234567'));
  assert.ok(!JSON.stringify(collected).includes('علي'));
  assert.ok(!JSON.stringify(collected).includes('private question'));
});

test('feature gap detector classifies unanswered questions as content gaps', () => {
  const gaps = FeatureGapDetector([
    { signal_type: 'unanswered_question', screen: 'quran', count: 2, anonymised_evidence: 'missing local Quran answer' },
    { signal_type: 'failed_search', screen: 'library', count: 2, anonymised_evidence: 'search returned nothing' },
  ]);
  assert.ok(gaps.some((g) => g.gap_type === 'content_gap'));
});

test('prioritiser scores impact and safety deterministically', () => {
  const scores = ImprovementPrioritiser({
    user_impact: 8,
    religious_safety_risk: 9,
    technical_difficulty: 5,
    app_store_risk: 4,
    privacy_risk: 6,
    performance_benefit: 7,
  });
  assert.ok(scores.priority_score >= 0 && scores.priority_score <= 100);
  assert.ok(scores.risk_score >= 0 && scores.risk_score <= 100);
  assert.equal(typeof scores.priority_band, 'string');
  assert.equal(typeof scores.risk_band, 'string');
});

test('proposal generator includes affected screens, tables, apis, tests, and acceptance criteria', () => {
  const proposal = FeatureProposalGenerator({
    gap: {
      gap_type: 'content_gap',
      title: 'Users keep asking for offline adhkar',
      affected_screens: ['home', 'dua'],
      evidence_summary: ['offline content missing'],
      user_impact: 8,
      religious_safety_risk: 5,
      technical_difficulty: 4,
      app_store_risk: 2,
      privacy_risk: 3,
      performance_benefit: 6,
    },
    scores: { priority_score: 81, risk_score: 41, priority_band: 'high' },
    signal_count: 4,
  });
  assert.ok(proposal.title.length > 0);
  assert.ok(Array.isArray(proposal.affected_screens));
  assert.ok(Array.isArray(proposal.affected_database_tables));
  assert.ok(Array.isArray(proposal.affected_apis));
  assert.ok(Array.isArray(proposal.tests_required));
  assert.ok(proposal.acceptance_criteria.PASS.includes('Approved proposal'));
});

test('dev task generator and test plan generator produce planning artifacts only', () => {
  const proposal = FeatureProposalGenerator({
    gap: { gap_type: 'ui_ux_improvement', title: 'RTL spacing' },
    scores: { priority_score: 70, risk_score: 20, priority_band: 'medium' },
  });
  const tasks = DevTaskGenerator(proposal);
  const testPlan = TestPlanGenerator(proposal);
  assert.ok(tasks.length >= 4);
  assert.equal(testPlan.approval_required, true);
  assert.ok(testPlan.manual_checks.length >= 2);
});

test('safe code planner blocks unapproved code generation and main push', () => {
  const blocked = SafeCodeChangePlanner({ proposal: { title: 'Rahma Improvement' }, approval_status: 'drafted' });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.can_push_main, false);
  assert.equal(blocked.can_deploy, false);

  const approved = SafeCodeChangePlanner({ proposal: { title: 'Rahma Improvement' }, approval_status: 'approved_for_code_generation' });
  assert.equal(approved.allowed, true);
  assert.equal(approved.can_push_main, false);
  assert.equal(approved.can_deploy, false);
  assert.ok(approved.feature_branch.startsWith('feature/self-improvement-'));
});

test('human approval gate requires a human reviewer and valid transition', () => {
  const approved = HumanApprovalGate({
    proposal: { id: 'p-1', approval_status: 'drafted' },
    next_status: 'approved_for_planning',
    reviewer_admin_id: 'u-1',
    reviewer_role: 'admin',
    decision_reason: 'clear user impact',
  });
  assert.equal(approved.allowed, true);

  const blocked = HumanApprovalGate({
    proposal: { id: 'p-1', approval_status: 'drafted' },
    next_status: 'released',
    reviewer_admin_id: 'u-1',
    reviewer_role: 'script',
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'human_approval_required');
});

test('audit writer is a safe no-op without a database pool', async () => {
  const audit = await AuditLogWriter({
    pool: null,
    action: 'self_improvement_proposal_reviewed',
    target_type: 'feature_proposal',
    target_id: 'p-1',
    anonymised_evidence: { note: 'private question' },
  });
  assert.equal(audit.recorded, false);
  assert.equal(audit.reason, 'no_pool');
});

test('metadata exposes modules and approval statuses', () => {
  const meta = selfImprovementMetadata();
  assert.equal(meta.implemented, true);
  assert.equal(meta.requires_human_approval, true);
  assert.ok(meta.modules_loaded.includes('FeatureProposalGenerator'));
  assert.ok(meta.approval_statuses.includes('approved_for_code_generation'));
});

test('GET /api/engine/self-improvement/status returns the approval guardrails', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/api/engine/self-improvement/status' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.engine.implemented, true);
    assert.equal(body.human_approval_required, true);
    assert.equal(body.git_push_main_allowed_without_approval, false);
    assert.equal(body.public_release_allowed_without_approval, false);
  } finally {
    await app.close();
  }
});

test('POST /api/engine/self-improvement/analyze redacts PII and returns proposals', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/engine/self-improvement/analyze',
      payload: {
        source: 'support-queue',
        signals: [
          {
            signal_type: 'unanswered_question',
            screen: 'quran',
            user_text: 'My name is Sara, phone 0551234567, question about offline Quran',
            count: 2,
          },
          {
            signal_type: 'failed_search',
            screen: 'library',
            feedback_text: 'search returned nothing',
            count: 2,
          },
        ],
      },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.ok(body.gaps.length >= 1);
    assert.ok(body.proposals.length >= 1);
    const payloadText = JSON.stringify(body);
    assert.ok(!payloadText.includes('Sara'));
    assert.ok(!payloadText.includes('0551234567'));
  } finally {
    await app.close();
  }
});

test('POST /api/engine/self-improvement/proposals/:id/decision blocks invalid transitions', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/engine/self-improvement/proposals/p-1/decision',
      payload: {
        next_status: 'released',
        reviewer_admin_id: 'admin-1',
        reviewer_role: 'admin',
        decision_reason: 'test',
      },
    });
    assert.equal(res.statusCode, 400);
    const body = res.json();
    assert.equal(body.ok, false);
    assert.equal(body.error, 'invalid_transition');
  } finally {
    await app.close();
  }
});
