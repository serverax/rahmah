/**
 * Improvement prioritiser.
 *
 * Scores an improvement gap across user impact, safety, difficulty, app-store
 * risk, privacy, and performance benefit. The output is deterministic and
 * does not require an LLM.
 */

function clamp10(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function overallPriority({ user_impact, religious_safety_risk, technical_difficulty, app_store_risk, privacy_risk, performance_benefit }) {
  const impact = clamp10(user_impact);
  const safety = clamp10(religious_safety_risk);
  const difficulty = clamp10(technical_difficulty);
  const appStore = clamp10(app_store_risk);
  const privacy = clamp10(privacy_risk);
  const perf = clamp10(performance_benefit);

  const raw =
    (impact * 0.30) +
    (safety * 0.25) +
    (appStore * 0.10) +
    (privacy * 0.15) +
    (perf * 0.10) +
    ((10 - difficulty) * 0.10);

  return Math.round(raw * 10);
}

function riskScore({ religious_safety_risk, app_store_risk, privacy_risk }) {
  const safety = clamp10(religious_safety_risk);
  const appStore = clamp10(app_store_risk);
  const privacy = clamp10(privacy_risk);
  return Math.round(((safety * 0.5) + (appStore * 0.25) + (privacy * 0.25)) * 10);
}

export function ImprovementPrioritiser(gap = {}) {
  const scores = {
    user_impact: clamp10(gap.user_impact ?? gap.impact ?? 5),
    religious_safety_risk: clamp10(gap.religious_safety_risk ?? gap.safety_risk ?? 0),
    technical_difficulty: clamp10(gap.technical_difficulty ?? gap.difficulty ?? 5),
    app_store_risk: clamp10(gap.app_store_risk ?? gap.store_risk ?? 0),
    privacy_risk: clamp10(gap.privacy_risk ?? gap.privacy ?? 0),
    performance_benefit: clamp10(gap.performance_benefit ?? gap.performance ?? 0),
  };

  const priority_score = overallPriority(scores);
  const risk_score = riskScore(scores);

  const priority_band = priority_score >= 75 ? 'high' : priority_score >= 50 ? 'medium' : 'low';
  const risk_band = risk_score >= 70 ? 'high' : risk_score >= 40 ? 'medium' : 'low';

  return Object.freeze({
    scores: Object.freeze(scores),
    priority_score,
    priority_band,
    risk_score,
    risk_band,
  });
}
