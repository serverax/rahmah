/**
 * Converts a proposal into developer tasks. The tasks are planning artifacts
 * only and do not imply approval to edit production code.
 */

export function DevTaskGenerator(proposal = {}) {
  const tasks = [];
  const title = String(proposal.title || 'Rahma improvement');

  tasks.push({
    order: 1,
    title: `Review proposal: ${title}`,
    category: 'analysis',
    approval_required: true,
  });
  tasks.push({
    order: 2,
    title: 'Implement safe data model or UI change in a feature branch',
    category: 'implementation',
    approval_required: true,
  });
  tasks.push({
    order: 3,
    title: 'Add or update tests for the proposed change',
    category: 'testing',
    approval_required: true,
  });
  tasks.push({
    order: 4,
    title: 'Run local CI and produce evidence before any merge request',
    category: 'verification',
    approval_required: true,
  });

  if (Array.isArray(proposal.tests_required) && proposal.tests_required.length > 0) {
    for (const [index, testName] of proposal.tests_required.entries()) {
      tasks.push({
        order: 5 + index,
        title: `Validate ${testName}`,
        category: 'testing',
        approval_required: true,
      });
    }
  }

  return Object.freeze(tasks.map((task) => Object.freeze(task)));
}
