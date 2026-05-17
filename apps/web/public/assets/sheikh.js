/* Sheikh Hasan dashboard V4 — Arabic-RTL client helpers.
 * Integrated with the full workflow:
 *   - /api/sheikh/dashboard/questions
 *   - /api/sheikh/dashboard/answers
 *   - /api/admin/ask-sheikh/pending-answers
 */

(function () {
  'use strict';
  if (!window.Rahma) return;
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
    publish_blocked: 'لا يمكن النشر — يلزم وجود مصدر معتمد وموافقة الإدارة.',
    server_unavailable: 'الخدمة غير متاحة حالياً',
    sending: 'جارٍ الإرسال...',
    loading: 'جارٍ التحميل...',
    invalid_citation: 'فضلاً أكملوا حقول المصدر قبل النشر.',
    answer_required: 'فضلاً اكتبوا نص الإجابة قبل المتابعة.',
    approve_ok: 'تم اعتماد الإجابة بنجاح.',
    reject_ok: 'تم رفض الإجابة وإعادتها للشيخ.',
  });

  async function checkSheikhAuthStatus() {
    const r = await R.fetchJson('/ready');
    if (!r.ok || !r.body || typeof r.body.auth !== 'object') {
      return { ok: false, reason: 'server_unavailable' };
    }
    return { ok: true, configured: r.body.auth.configured };
  }

  function renderArabicError(el, key) {
    if (!el) return;
    el.innerHTML = `<div class="state-error">${ARABIC[key] || ARABIC.server_unavailable}</div>`;
  }

  async function loadPendingQuestions(targetEl) {
    if (!targetEl) return;
    targetEl.innerHTML = `<div class="state-loading">${ARABIC.loading}</div>`;
    const r = await R.fetchJson('/api/sheikh/dashboard/questions');
    if (!r.ok) { renderArabicError(targetEl, 'auth_required'); return; }
    const list = (r.body && Array.isArray(r.body.questions)) ? r.body.questions : [];
    if (list.length === 0) { targetEl.innerHTML = `<div class="state-empty">${ARABIC.no_questions}</div>`; return; }
    targetEl.innerHTML = list.map((q) => `
      <div class="card clickable" onclick="location.href='/sheikh-question-detail.html?id=${q.id}'">
        <div class="card-title">سؤال #${escapeHtml(q.id.slice(0,8))}</div>
        <div class="card-body">
          <p>${escapeHtml(q.question_text_ar || q.question_text_en)}</p>
          <span class="chip chip-pending">${escapeHtml(q.status)}</span>
          <span class="chip chip-moderation">${escapeHtml(q.category_ar || 'عام')}</span>
        </div>
      </div>
    `).join('');
  }

  async function submitAnswer(payload, resultEl) {
    if (resultEl) resultEl.innerHTML = `<div class="state-loading">${ARABIC.sending}</div>`;
    const r = await R.fetchJson('/api/sheikh/dashboard/answers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      if (resultEl) resultEl.innerHTML = `<div class="state-empty"><span class="chip chip-success">${ARABIC.draft_saved}</span></div>`;
      return { ok: true };
    }
    if (resultEl) resultEl.innerHTML = `<div class="state-error">${r.body.reason || ARABIC.publish_blocked}</div>`;
    return { ok: false };
  }

  async function loadPendingApprovals(targetEl) {
    if (!targetEl) return;
    targetEl.innerHTML = `<div class="state-loading">${ARABIC.loading}</div>`;
    const r = await R.fetchJson('/api/ask-sheikh/admin/pending-answers');
    if (!r.ok) { renderArabicError(targetEl, 'auth_required'); return; }
    const list = (r.body && Array.isArray(r.body.items)) ? r.body.items : [];
    if (list.length === 0) { targetEl.innerHTML = `<div class="state-empty">${ARABIC.no_review_needed}</div>`; return; }
    targetEl.innerHTML = list.map((a) => `
      <div class="card">
        <div class="card-title">إجابة من الشيخ ${escapeHtml(a.sheikh_name)}</div>
        <div class="card-body">
          <strong>السؤال:</strong> <p>${escapeHtml(a.question_text_ar)}</p>
          <strong>الإجابة:</strong> <p>${escapeHtml(a.answer_text_ar)}</p>
          <div class="mt-8">
            <button class="btn btn-success" onclick="Sheikh.approveAnswer('${a.answer_id}', this.parentElement)">اعتماد ونشر</button>
            <button class="btn btn-danger" onclick="Sheikh.rejectAnswer('${a.answer_id}', this.parentElement)">رفض</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async function approveAnswer(id, el) {
    el.innerHTML = ARABIC.sending;
    const r = await R.fetchJson(`/api/ask-sheikh/admin/answers/${id}/approve`, { method: 'POST' });
    if (r.ok) el.innerHTML = `<span class="chip chip-success">${ARABIC.approve_ok}</span>`;
    else el.innerHTML = `<span class="chip chip-error">فشل الاعتماد</span>`;
  }

  async function rejectAnswer(id, el) {
    const reason = prompt('سبب الرفض:');
    if (!reason) return;
    el.innerHTML = ARABIC.sending;
    const r = await R.fetchJson(`/api/ask-sheikh/admin/answers/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    if (r.ok) el.innerHTML = `<span class="chip chip-success">${ARABIC.reject_ok}</span>`;
    else el.innerHTML = `<span class="chip chip-error">فشل الرفض</span>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  window.Sheikh = Object.freeze({
    ARABIC,
    checkSheikhAuthStatus,
    loadPendingQuestions,
    submitAnswer,
    loadPendingApprovals,
    approveAnswer,
    rejectAnswer,
  });
})();
