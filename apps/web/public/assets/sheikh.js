/* Sheikh Hasan dashboard — Arabic-RTL client helpers.
 * Truthful auth behaviour: if backend says auth_not_configured, the UI shows
 * Arabic notice and refuses to fake a login or token.
 *
 * No external CDN. No tracking. No analytics. Same-origin API by default.
 */

(function () {
  'use strict';
  if (!window.Rahma) {
    // Shared app.js is required.
    return;
  }
  const R = window.Rahma;

  const ARABIC = Object.freeze({
    auth_not_configured: 'تسجيل دخول الشيخ غير مفعل بعد',
    auth_required: 'هذه الصفحة تتطلب تسجيل دخول الشيخ.',
    no_questions: 'لا توجد أسئلة في القائمة حالياً.',
    no_drafts: 'لا توجد مسودات بعد.',
    no_published: 'لا توجد إجابات منشورة بعد.',
    no_review_needed: 'لا توجد عناصر بحاجة لمراجعة الآن.',
    citation_required: 'لا يمكن نشر الإجابة بدون مصدر واضح.',
    draft_saved: 'تم حفظ المسودة.',
    publish_blocked: 'لا يمكن النشر — يلزم وجود مصدر معتمد.',
    server_unavailable: 'الخدمة غير متاحة حالياً',
    sending: 'جارٍ الإرسال...',
    loading: 'جارٍ التحميل...',
    invalid_citation: 'فضلاً أكملوا حقول المصدر قبل النشر.',
    answer_required: 'فضلاً اكتبوا نص الإجابة قبل المتابعة.',
  });

  async function checkSheikhAuthStatus() {
    // Hits the audit endpoint via /ready since /api/sheikh-hasan does not
    // expose a dedicated /auth/status route. We infer from /ready.ask_sheikh_hasan.
    const r = await R.fetchJson('/ready');
    if (!r.ok || !r.body || typeof r.body.ask_sheikh_hasan !== 'object') {
      return { ok: false, reason: 'server_unavailable' };
    }
    const ask = r.body.ask_sheikh_hasan;
    if (ask.sheikh_auth_configured === true) {
      return { ok: true, configured: true };
    }
    return { ok: true, configured: false };
  }

  function renderArabicError(el, key) {
    if (!el) return;
    const msg = ARABIC[key] || ARABIC.server_unavailable;
    el.innerHTML = `<div class="state-error">${msg}</div>`;
  }

  function renderArabicEmpty(el, key) {
    if (!el) return;
    const msg = ARABIC[key] || ARABIC.no_questions;
    el.innerHTML = `<div class="state-empty">${msg}</div>`;
  }

  function renderAuthNotConfigured(targetEl) {
    if (!targetEl) return;
    targetEl.innerHTML = `<div class="state-error">${ARABIC.auth_not_configured}</div>`;
  }

  async function loadPendingQuestions(targetEl) {
    if (!targetEl) return;
    targetEl.innerHTML = `<div class="state-loading">${ARABIC.loading}</div>`;
    const auth = await checkSheikhAuthStatus();
    if (!auth.ok) { renderArabicError(targetEl, 'server_unavailable'); return; }
    if (!auth.configured) { renderAuthNotConfigured(targetEl); return; }
    const r = await R.fetchJson('/api/sheikh-hasan/sheikh/questions');
    if (!r.ok) {
      // 503 auth_not_configured even with flag true (no principal) → show same Arabic.
      renderAuthNotConfigured(targetEl);
      return;
    }
    const list = (r.body && Array.isArray(r.body.questions)) ? r.body.questions : [];
    if (list.length === 0) { renderArabicEmpty(targetEl, 'no_questions'); return; }
    targetEl.innerHTML = list.map((q) => `
      <div class="card">
        <div class="card-title">سؤال #${escapeHtml(String(q.id || ''))}</div>
        <div class="card-body">
          <span class="chip chip-pending">قيد المراجعة</span>
          <span class="chip chip-moderation">${escapeHtml(q.category || 'عام')}</span>
          <span class="chip chip-moderation">${escapeHtml(q.language || 'ar')}</span>
        </div>
      </div>
    `).join('');
  }

  function addCitationField(citationsContainer) {
    if (!citationsContainer) return;
    const idx = citationsContainer.querySelectorAll('.citation-row').length;
    const row = document.createElement('div');
    row.className = 'citation-row card';
    row.innerHTML = `
      <div class="form-field">
        <label>نوع المصدر</label>
        <select name="citation_type_${idx}">
          <option value="quran">قرآن</option>
          <option value="hadith">حديث</option>
          <option value="fiqh">مرجع علمي</option>
          <option value="scholar_note">ملاحظة الشيخ</option>
        </select>
      </div>
      <div class="form-field">
        <label>المرجع</label>
        <input type="text" name="citation_label_${idx}" maxlength="200" placeholder="مثال: سورة البقرة 2:183" />
      </div>
      <div class="form-field">
        <label>نص المصدر (اختياري)</label>
        <textarea name="citation_text_${idx}" maxlength="600"></textarea>
      </div>
    `;
    citationsContainer.appendChild(row);
  }

  function collectCitations(citationsContainer) {
    if (!citationsContainer) return [];
    const out = [];
    citationsContainer.querySelectorAll('.citation-row').forEach((row, i) => {
      const t = row.querySelector(`[name="citation_type_${i}"]`);
      const l = row.querySelector(`[name="citation_label_${i}"]`);
      const x = row.querySelector(`[name="citation_text_${i}"]`);
      if (!t || !l) return;
      const label = (l.value || '').trim();
      if (label.length === 0) return;
      const c = { citation_type: t.value, citation_label: label };
      const text = (x && x.value || '').trim();
      if (text.length > 0) c.citation_text = text;
      out.push(c);
    });
    return out;
  }

  function validateCitationBeforePublish({ answer_text, citations }) {
    if (typeof answer_text !== 'string' || answer_text.trim().length === 0) {
      return { ok: false, key: 'answer_required' };
    }
    if (!Array.isArray(citations) || citations.length === 0) {
      return { ok: false, key: 'citation_required' };
    }
    return { ok: true };
  }

  async function publishAnswer({ question_id, answer_text, citations, mode }, resultEl) {
    if (!resultEl) resultEl = document.querySelector('[data-result]');
    const validation = validateCitationBeforePublish({ answer_text, citations });
    if (!validation.ok) {
      if (resultEl) resultEl.innerHTML = `<div class="state-error">${ARABIC[validation.key]}</div>`;
      return { ok: false, reason: validation.key };
    }
    const auth = await checkSheikhAuthStatus();
    if (!auth.ok || !auth.configured) {
      renderAuthNotConfigured(resultEl);
      return { ok: false, reason: 'auth_not_configured' };
    }
    if (resultEl) resultEl.innerHTML = `<div class="state-loading">${ARABIC.sending}</div>`;
    try {
      const url = `/api/sheikh-hasan/sheikh/questions/${encodeURIComponent(question_id)}/answer`;
      const res = await fetch(`${R.API_BASE}${url}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          answer_text,
          citations,
          publication_mode: mode === 'private' ? 'private' : 'public',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        if (resultEl) resultEl.innerHTML = `<div class="state-empty"><span class="chip chip-success">${escapeHtml(body.publication_status || '')}</span></div>`;
        return { ok: true };
      }
      if (resultEl) resultEl.innerHTML = `<div class="state-error">${ARABIC.publish_blocked}</div>`;
      return { ok: false, reason: body.error || 'publish_failed' };
    } catch (_e) {
      if (resultEl) resultEl.innerHTML = `<div class="state-error">${ARABIC.server_unavailable}</div>`;
      return { ok: false, reason: 'network_error' };
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  window.Sheikh = Object.freeze({
    ARABIC,
    checkSheikhAuthStatus,
    loadPendingQuestions,
    renderArabicError,
    renderArabicEmpty,
    renderAuthNotConfigured,
    addCitationField,
    collectCitations,
    validateCitationBeforePublish,
    publishAnswer,
  });
})();
