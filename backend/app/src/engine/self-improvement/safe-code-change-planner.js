/**
 * Safe code change planner.
 *
 * Returns a branch plan only after a proposal reaches the
 * `approved_for_code_generation` status. It never allows automatic merges,
 * pushes to main, or production deployment.
 */

export function SafeCodeChangePlanner({
  proposal = {},
  approval_status = 'drafted',
  branch_name = null,
} = {}) {
  if (approval_status !== 'approved_for_code_generation') {
    return Object.freeze({
      allowed: false,
      reason: 'approval_required',
      can_push_main: false,
      can_deploy: false,
      feature_branch: null,
    });
  }

  const featureBranch = branch_name || `feature/self-improvement-${slugify(proposal.title || 'rahma')}`;
  return Object.freeze({
    allowed: true,
    reason: 'approved_for_code_generation',
    can_push_main: false,
    can_deploy: false,
    feature_branch: featureBranch,
    planned_files: Object.freeze([
      'backend/app/src/engine/self-improvement/*',
      'backend/app/src/routes/self-improvement.js',
      'backend/db/migrations/017_self_improvement.sql',
      'apps/mobile/lib/screens/improvement_center_screen.dart',
      'apps/mobile/lib/screens/settings_screen.dart',
      'apps/mobile/test/improvement_center_screen_test.dart',
    ]),
  });
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'rahma';
}
