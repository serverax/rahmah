export { redactPersonalData, anonymiseEvidence } from './privacy-redactor.js';
export { SelfImprovementSignalCollector } from './signal-collector.js';
export { FeatureGapDetector } from './feature-gap-detector.js';
export { ImprovementPrioritiser } from './improvement-prioritiser.js';
export { FeatureProposalGenerator } from './feature-proposal-generator.js';
export { DevTaskGenerator } from './dev-task-generator.js';
export { TestPlanGenerator } from './test-plan-generator.js';
export { SafeCodeChangePlanner } from './safe-code-change-planner.js';
export { HumanApprovalGate, listAllowedStatuses } from './human-approval-gate.js';
export { AuditLogWriter } from './audit-log-writer.js';

export function selfImprovementMetadata() {
  return Object.freeze({
    implemented: true,
    requires_human_approval: true,
    approval_statuses: Object.freeze([
      'detected',
      'drafted',
      'needs_review',
      'approved_for_planning',
      'approved_for_code_generation',
      'rejected',
      'implemented',
      'released',
    ]),
    modules_loaded: Object.freeze([
      'SelfImprovementSignalCollector',
      'PrivacyRedactor',
      'FeatureGapDetector',
      'ImprovementPrioritiser',
      'FeatureProposalGenerator',
      'DevTaskGenerator',
      'TestPlanGenerator',
      'SafeCodeChangePlanner',
      'HumanApprovalGate',
      'AuditLogWriter',
    ]),
  });
}
