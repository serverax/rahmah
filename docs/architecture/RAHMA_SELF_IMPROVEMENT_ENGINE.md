# Rahma Self-Improvement Engine

Rahma may suggest improvements, but it does not self-publish, self-deploy, or self-merge.

## Core flow

`User action/question -> DB/cache search -> RAG retrieval -> deterministic safety checks -> local LLM draft if approved evidence exists -> Sheikh/Admin approval -> cache approved result -> feedback loop -> self-improvement proposal`

The feedback loop never bypasses approval. The engine only prepares proposals and planning artifacts.

## Modules

- `SelfImprovementSignalCollector`
- `PrivacyRedactor`
- `FeatureGapDetector`
- `ImprovementPrioritiser`
- `FeatureProposalGenerator`
- `DevTaskGenerator`
- `TestPlanGenerator`
- `SafeCodeChangePlanner`
- `HumanApprovalGate`
- `AuditLogWriter`

## Approval statuses

`detected`, `drafted`, `needs_review`, `approved_for_planning`, `approved_for_code_generation`, `rejected`, `implemented`, `released`

## Safety rules

- Personal data is redacted before analysis.
- Religious text is never modified by the self-improvement engine.
- No automatic code merge, deploy, or GitHub main push.
- No automatic Islamic ruling or Sheikh answer approval.
- Local LLM use is optional and approval-gated.

## Database tables

- `improvement_signals`
- `feature_gap_reports`
- `feature_proposals`
- `proposal_votes`
- `proposal_approval_status`
- `generated_dev_tasks`
- `generated_test_plans`
- `self_improvement_audit_log`

