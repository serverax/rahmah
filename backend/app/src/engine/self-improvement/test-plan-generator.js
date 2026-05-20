/**
 * Generate a test plan from a proposal.
 */

export function TestPlanGenerator(proposal = {}) {
  const tests = Array.isArray(proposal.tests_required) ? proposal.tests_required.slice() : [];
  return Object.freeze({
    title: `Test plan for ${String(proposal.title || 'Rahma improvement')}`,
    unit_tests: tests.filter((t) => /redaction|approval|audit|deterministic|citation/i.test(t)),
    widget_tests: tests.filter((t) => /ui|layout|rtl|empty-state|button|screen/i.test(t)),
    integration_tests: tests.filter((t) => /offline|api|cache|rag|content|algorithm/i.test(t)),
    manual_checks: [
      'Inspect Arabic/RTL rendering',
      'Confirm no raw personal data appears in proposals or audit rows',
      'Confirm approval buttons require human action',
    ],
    approval_required: true,
  });
}
