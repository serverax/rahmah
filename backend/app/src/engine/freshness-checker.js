/**
 * Freshness / stale-content detector.
 *
 * Pure function: takes an item, returns an indication of whether it should
 * be queued for refresh. No I/O.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function ageDays(updated_at, now) {
  if (!updated_at) return Infinity;
  const t = typeof updated_at === 'string' ? Date.parse(updated_at) : Number(updated_at);
  if (!Number.isFinite(t)) return Infinity;
  return Math.max(0, (now - t) / DAY_MS);
}

export function freshnessCheck({
  category = 'general',
  source_reference = '',
  verification_status = 'unverified',
  updated_at = null,
  now = Date.now(),
} = {}) {
  const tasks = [];

  if (!source_reference || source_reference.trim().length === 0) {
    tasks.push({ task: 'add_source_reference', priority: 'high' });
  }
  if (verification_status !== 'approved') {
    tasks.push({ task: 'complete_review', priority: 'high' });
  }
  const age = ageDays(updated_at, now);
  if (age > 180) {
    tasks.push({ task: 'periodic_re-review', priority: 'medium' });
  }
  if (category === 'fiqh_note' || category === 'sheikh_answer') {
    if (age > 90) tasks.push({ task: 'scholar_re-review', priority: 'high' });
  }

  const priority = tasks.some((t) => t.priority === 'high')
    ? 'high'
    : tasks.length > 0 ? 'medium' : 'low';

  return Object.freeze({
    fresh: tasks.length === 0,
    refresh_tasks: Object.freeze(tasks.map((t) => Object.freeze(t))),
    priority,
  });
}
