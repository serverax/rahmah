/**
 * backend/app/src/services/game-repository.js
 */

export function createGameRepository({ pool } = {}) {
  const hasPool = Boolean(pool);

  async function listApprovedScenarios(ageGroup) {
    if (!hasPool) return [];
    const sql = `
      SELECT id, age_group, category, title_ar, body_ar, options_json
      FROM children_scenarios
      WHERE status = 'approved' AND ($1::text IS NULL OR age_group = $1)
      ORDER BY created_at ASC
    `;
    try {
      const res = await pool.query(sql, [ageGroup]);
      return res.rows || [];
    } catch {
      return [];
    }
  }

  async function saveProgress(user_id, scenario_id, score) {
    if (!hasPool) return { ok: true, persisted: false };
    const sql = `
      INSERT INTO children_progress (user_id, scenario_id, score)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, scenario_id) DO UPDATE SET score = EXCLUDED.score, completed_at = NOW()
    `;
    try {
      await pool.query(sql, [user_id, scenario_id, score]);
      return { ok: true, persisted: true };
    } catch {
      return { ok: false, error: 'persistence_failed' };
    }
  }

  return {
    listApprovedScenarios,
    saveProgress
  };
}

let _repo = null;
export function configureGameRepository({ pool }) { _repo = createGameRepository({ pool }); }
export function getGameRepository() { return _repo; }
export function isGameRepositoryConfigured() { return Boolean(_repo); }

