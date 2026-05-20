/**
 * Rahma Self-Improvement Engine routes.
 *
 * Read-only status and deterministic proposal planning. All mutation-style
 * actions remain approval-gated and do not auto-publish or auto-deploy.
 */

import {
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
} from '../engine/self-improvement/index.js';
import { isDatabaseConfigured } from '../db/config.js';

const analyzeSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['signals'],
    properties: {
      source: { type: 'string' },
      signals: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
  },
};

const decisionSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['next_status', 'reviewer_admin_id'],
    properties: {
      next_status: { type: 'string' },
      reviewer_admin_id: { type: 'string' },
      reviewer_role: { type: 'string' },
      decision_reason: { type: 'string' },
    },
  },
};

export default async function selfImprovementRoute(fastify) {
  fastify.get('/status', async (req, reply) => {
    return reply.send({
      ok: true,
      engine: selfImprovementMetadata(),
      database_configured: isDatabaseConfigured(),
      human_approval_required: true,
      deployment_allowed_without_approval: false,
      public_release_allowed_without_approval: false,
      git_push_main_allowed_without_approval: false,
      llm_default_enabled: false,
      safety_notice_ar: 'رحمة يقترح التحسينات ويعدّ المسودات فقط. النشر والموافقة والإصدار العام كلها بشرية.',
    });
  });

  fastify.post('/analyze', { schema: analyzeSchema }, async (req, reply) => {
    const collected = SelfImprovementSignalCollector({
      source: req.body.source || 'manual_review',
      signals: req.body.signals,
    });
    const gaps = FeatureGapDetector(collected.signals);
    const proposals = gaps.map((gap) => {
      const scored = ImprovementPrioritiser({
        user_impact: estimateUserImpact(gap.gap_type),
        religious_safety_risk: estimateSafetyRisk(gap.gap_type),
        technical_difficulty: estimateDifficulty(gap.gap_type),
        app_store_risk: estimateAppStoreRisk(gap.gap_type),
        privacy_risk: estimatePrivacyRisk(gap.gap_type),
        performance_benefit: estimatePerfBenefit(gap.gap_type),
      });
      const proposal = FeatureProposalGenerator({
        gap: {
          ...gap,
          user_impact: estimateUserImpact(gap.gap_type),
          religious_safety_risk: estimateSafetyRisk(gap.gap_type),
          technical_difficulty: estimateDifficulty(gap.gap_type),
          app_store_risk: estimateAppStoreRisk(gap.gap_type),
          privacy_risk: estimatePrivacyRisk(gap.gap_type),
          performance_benefit: estimatePerfBenefit(gap.gap_type),
        },
        scores: scored,
        signal_count: gap.score,
        source: collected.source,
      });
      return {
        gap_type: gap.gap_type,
        priority_score: scored.priority_score,
        risk_score: scored.risk_score,
        proposal,
        dev_tasks: DevTaskGenerator(proposal),
        test_plan: TestPlanGenerator(proposal),
        safe_code_plan: SafeCodeChangePlanner({ proposal, approval_status: proposal.approval_status }),
      };
    });

    return reply.send({
      ok: true,
      source: collected.source,
      collected_count: collected.collected_count,
      gaps,
      proposals,
      human_approval_required: true,
      public_release_allowed: false,
    });
  });

  fastify.post('/proposals/:id/decision', { schema: decisionSchema }, async (req, reply) => {
    const proposed = {
      id: String(req.params.id || ''),
      approval_status: 'drafted',
      title: 'Self-improvement proposal',
    };
    const decision = HumanApprovalGate({
      proposal: proposed,
      next_status: req.body.next_status,
      reviewer_admin_id: req.body.reviewer_admin_id,
      reviewer_role: req.body.reviewer_role || 'admin',
      decision_reason: req.body.decision_reason || '',
    });

    if (!decision.allowed) {
      return reply.code(400).send({
        ok: false,
        error: decision.reason,
        human_approval_required: true,
      });
    }

    const audit = await AuditLogWriter({
      pool: null,
      action: 'self_improvement_proposal_reviewed',
      target_type: 'feature_proposal',
      target_id: String(req.params.id || ''),
      source: 'self_improvement_engine',
      anonymised_evidence: { decision_reason: decision.decision_reason },
      risk_level: 'medium',
      approval_status: decision.approval_status,
      reviewer_admin_id: decision.reviewer_admin_id,
      decision_reason: decision.decision_reason,
    });

    return reply.send({
      ok: true,
      approval_status: decision.approval_status,
      reviewer_admin_id: decision.reviewer_admin_id,
      audit_status: audit.recorded ? 'persisted' : audit.reason,
      public_release_allowed: false,
    });
  });
}

function estimateUserImpact(gapType) {
  switch (gapType) {
    case 'content_gap':
    case 'rag_retrieval_improvement':
      return 8;
    case 'algorithm_improvement':
      return 9;
    case 'performance_issue':
      return 7;
    case 'ui_ux_improvement':
    case 'accessibility_issue':
      return 7;
    case 'security_issue':
      return 8;
    default:
      return 6;
  }
}

function estimateSafetyRisk(gapType) {
  switch (gapType) {
    case 'rag_retrieval_improvement':
    case 'security_issue':
      return 9;
    case 'algorithm_improvement':
      return 8;
    case 'content_gap':
      return 6;
    default:
      return 4;
  }
}

function estimateDifficulty(gapType) {
  switch (gapType) {
    case 'algorithm_improvement':
    case 'rag_retrieval_improvement':
      return 7;
    case 'security_issue':
      return 6;
    case 'performance_issue':
      return 5;
    default:
      return 4;
  }
}

function estimateAppStoreRisk(gapType) {
  return gapType === 'security_issue' ? 8 : gapType === 'accessibility_issue' ? 7 : 4;
}

function estimatePrivacyRisk(gapType) {
  return gapType === 'content_gap' || gapType === 'rag_retrieval_improvement' ? 7 : 3;
}

function estimatePerfBenefit(gapType) {
  return gapType === 'performance_issue' ? 10 : gapType === 'algorithm_improvement' ? 8 : 5;
}
