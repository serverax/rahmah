/* رحلة الحسنات — children's game logic.
 *
 * Local-only progress (localStorage). No PII. No chat. No public profile.
 * Defense-in-depth: scenarios loaded from JSON are filtered through
 * enforceChildSafety() before display.
 */

(function () {
  'use strict';
  if (!window.Rahma) return;
  const R = window.Rahma;
  const STORAGE_KEY = 'rahma.hasanat.progress.v1';

  const ARABIC = Object.freeze({
    loading: 'جارٍ التحميل...',
    no_more: 'أنهيت كل السيناريوهات لهذا اليوم. بارك الله فيك!',
    correct: 'أحسنت! نلت نجمة حسنة.',
    other: 'حاول مرة أخرى بلطف.',
    error: 'تعذّر تحميل الرحلة.',
    reset: 'تم إعادة بدء الرحلة.',
  });

  const FORBIDDEN_PATTERNS = [
    /رقم الجوال/, /رقم الهاتف/, /العنوان السكني/, /كلمة المرور/,
    /الموقع الجغرافي/, /تاريخ الميلاد/, /البريد الإلكتروني الخاص/,
    /غبي/, /أحمق/, /فاشل/, /سيء جداً/, /حزب سياسي/,
  ];

  function enforceChildSafety(scenario) {
    if (!scenario || typeof scenario !== 'object') return false;
    if (scenario.child_safe !== true) return false;
    const txt = String(scenario.question_ar || '') + '\n' +
                (Array.isArray(scenario.options_ar) ? scenario.options_ar.join('\n') : '');
    for (const re of FORBIDDEN_PATTERNS) {
      if (re.test(txt)) return false;
    }
    return true;
  }

  async function loadScenarios() {
    const r = await fetch('/assets/hasanat-scenarios.json', { cache: 'no-store' });
    if (!r.ok) return [];
    const j = await r.json().catch(() => ({}));
    const arr = Array.isArray(j.scenarios) ? j.scenarios : [];
    return arr.filter(enforceChildSafety);
  }

  function loadLocalProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { stars: 0, completed: [], last_played: null };
      const p = JSON.parse(raw);
      // Defense-in-depth: only allow these fields.
      return {
        stars: Number(p.stars || 0) | 0,
        completed: Array.isArray(p.completed) ? p.completed.filter((x) => typeof x === 'string').slice(0, 1000) : [],
        last_played: typeof p.last_played === 'string' ? p.last_played : null,
      };
    } catch {
      return { stars: 0, completed: [], last_played: null };
    }
  }

  function saveLocalProgress(p) {
    // Refuse to persist any field other than the three expected ones.
    const clean = {
      stars: Number(p.stars || 0) | 0,
      completed: Array.isArray(p.completed) ? p.completed.slice(0, 1000) : [],
      last_played: new Date().toISOString(),
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch { /* ignore */ }
  }

  function resetProgress() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  function pickNext(scenarios, progress) {
    if (!Array.isArray(scenarios) || scenarios.length === 0) return null;
    const done = new Set(progress.completed || []);
    const candidates = scenarios.filter((s) => !done.has(s.id));
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function renderScenario(rootEl, scenario, onAnswer) {
    rootEl.innerHTML = '';
    if (!scenario) {
      rootEl.innerHTML = `<div class="state-empty">${ARABIC.no_more}</div>`;
      return;
    }
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-title">${escapeHtml(scenario.category_ar)}</div>
      <div class="card-body" style="font-size:1.1rem;font-weight:700">${escapeHtml(scenario.question_ar)}</div>
    `;
    const optsWrap = document.createElement('div');
    optsWrap.className = 'mt-16';
    (scenario.options_ar || []).forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.marginTop = '8px';
      btn.textContent = opt;
      btn.addEventListener('click', () => onAnswer(scenario, i));
      optsWrap.appendChild(btn);
    });
    card.appendChild(optsWrap);
    rootEl.appendChild(card);
  }

  function renderGentleFeedback(rootEl, scenario, correct) {
    const card = document.createElement('div');
    card.className = 'card mt-16';
    const headline = correct ? ARABIC.correct : ARABIC.other;
    card.innerHTML = `
      <div class="card-title">${headline}</div>
      <div class="card-body">${escapeHtml(scenario.gentle_feedback_ar || '')}
        <br/><span class="muted">${escapeHtml(scenario.learning_message_ar || '')}</span></div>
    `;
    rootEl.appendChild(card);
  }

  function handleAnswer(progress, scenario, chosenIndex) {
    const correct = (scenario.correct_index === chosenIndex);
    if (correct) {
      progress.stars = (progress.stars | 0) + 1;
    }
    progress.completed = Array.from(new Set([...(progress.completed || []), scenario.id]));
    saveLocalProgress(progress);
    return { correct };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  // Public API for the page scripts.
  window.HasanatGame = Object.freeze({
    ARABIC,
    enforceChildSafety,
    loadScenarios,
    loadLocalProgress,
    saveLocalProgress,
    resetProgress,
    pickNext,
    renderScenario,
    renderGentleFeedback,
    handleAnswer,
  });

  // Suppress unused-warning for R in lint contexts.
  void R;
})();
