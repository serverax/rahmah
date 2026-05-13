import { createHash } from 'node:crypto';

/**
 * Hash a question before storing it. We use sha256 of the trimmed
 * lowercased Arabic text. The raw question is NEVER inserted.
 */
export function hashQuestion(question) {
  if (typeof question !== 'string') return null;
  const normalized = question.trim();
  if (normalized.length === 0) return null;
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Record a single audit row. Safe no-op if pool is missing. Uses parameterized
 * SQL — values are bound via $1..$n, never concatenated. Errors are swallowed
 * silently because audit must NEVER affect the user-facing response.
 *
 * @param {object} opts
 * @param {object} opts.pool         pg Pool or null/undefined for no-op
 * @param {string} opts.question     raw question (will be hashed; never stored as-is)
 * @param {string} opts.scope        e.g. 'ibadat'
 * @param {boolean} opts.blocked     whether the answer was blocked
 * @param {string|null} opts.blockReason  short coarse code
 * @param {number} opts.sourceCount  number of validated sources
 * @returns {Promise<{recorded: boolean, reason: string|null}>}
 */
export async function recordAnswerAudit({
  pool,
  question,
  scope,
  blocked,
  blockReason,
  sourceCount,
} = {}) {
  if (!pool) {
    return { recorded: false, reason: 'no_pool' };
  }
  const qHash = hashQuestion(question);
  if (!qHash) {
    return { recorded: false, reason: 'empty_question' };
  }
  const sql = `
    INSERT INTO sakina_answer_audit
      (question_hash, scope, blocked, block_reason, source_count)
    VALUES ($1, $2, $3, $4, $5)
  `;
  try {
    await pool.query(sql, [
      qHash,
      typeof scope === 'string' && scope.length ? scope : 'unknown',
      Boolean(blocked),
      typeof blockReason === 'string' && blockReason.length ? blockReason : null,
      Number.isInteger(sourceCount) && sourceCount >= 0 ? sourceCount : 0,
    ]);
    return { recorded: true, reason: null };
  } catch {
    return { recorded: false, reason: 'insert_failed' };
  }
}
