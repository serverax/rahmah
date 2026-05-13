/* Islamic library — Arabic-RTL client.
 * Truthful behaviour: if RAG is foundation-only, UI shows "غير متاحة بعد".
 * Never invents items. Never claims approved-only when RAG is empty.
 */

(function () {
  'use strict';
  if (!window.Rahma) return;
  const R = window.Rahma;

  const ARABIC = Object.freeze({
    unavailable: 'المكتبة الموثقة غير متاحة بعد',
    no_results: 'لا توجد نتائج حالياً',
    loading: 'جارٍ التحميل...',
    invalid_query: 'فضلاً أدخلوا كلمة بحث صالحة.',
  });

  async function loadLibraryStatus() {
    const r = await R.fetchJson('/api/library/status');
    if (!r.ok) return { ok: false };
    return { ok: true, body: r.body };
  }

  async function loadCategories(rootEl) {
    if (!rootEl) return;
    const r = await R.fetchJson('/api/library/categories');
    if (!r.ok) {
      rootEl.innerHTML = `<div class="state-error">${ARABIC.unavailable}</div>`;
      return;
    }
    const items = (r.body && Array.isArray(r.body.categories)) ? r.body.categories : [];
    rootEl.innerHTML = items.map((c) => `
      <a class="card" href="/library-category.html?category=${encodeURIComponent(c.id)}">
        <div class="card-title">${escapeHtml(c.title_ar)}</div>
        <div class="card-body">${escapeHtml(c.description_ar || '')}</div>
      </a>
    `).join('') || `<div class="state-empty">${ARABIC.no_results}</div>`;
  }

  async function loadApprovedItems(rootEl, params = {}) {
    if (!rootEl) return;
    rootEl.innerHTML = `<div class="state-loading">${ARABIC.loading}</div>`;
    const qs = new URLSearchParams(params).toString();
    const url = '/api/library/items' + (qs ? `?${qs}` : '');
    const r = await R.fetchJson(url);
    if (!r.ok) {
      rootEl.innerHTML = `<div class="state-error">${ARABIC.unavailable}</div>`;
      return;
    }
    if (r.body && r.body.configured === false) {
      rootEl.innerHTML = `<div class="state-empty">${ARABIC.unavailable}</div>`;
      return;
    }
    const items = (r.body && Array.isArray(r.body.items)) ? r.body.items : [];
    if (items.length === 0) {
      rootEl.innerHTML = `<div class="state-empty">${ARABIC.no_results}</div>`;
      return;
    }
    rootEl.innerHTML = items.map(renderItemCard).join('');
  }

  async function searchLibrary(query, rootEl) {
    if (!rootEl) return;
    const q = (query || '').trim();
    if (q.length === 0) {
      rootEl.innerHTML = `<div class="state-error">${ARABIC.invalid_query}</div>`;
      return;
    }
    rootEl.innerHTML = `<div class="state-loading">${ARABIC.loading}</div>`;
    const r = await R.fetchJson(`/api/library/search?q=${encodeURIComponent(q)}`);
    if (!r.ok || r.body.configured === false) {
      rootEl.innerHTML = `<div class="state-empty">${ARABIC.unavailable}</div>`;
      return;
    }
    const items = (r.body && Array.isArray(r.body.items)) ? r.body.items : [];
    if (items.length === 0) {
      rootEl.innerHTML = `<div class="state-empty">${ARABIC.no_results}</div>`;
      return;
    }
    rootEl.innerHTML = items.map(renderItemCard).join('');
  }

  function renderSourceBadge(item) {
    if (!item || !item.source_reference) return '';
    return `<span class="badge badge-quran">${escapeHtml(item.source_reference)}</span>`;
  }

  function renderReviewStatus(item) {
    if (!item) return '';
    const status = String(item.verification_status || 'unverified');
    if (status === 'approved') return `<span class="chip chip-success">معتمد</span>`;
    if (status === 'pending_review') return `<span class="chip chip-pending">قيد المراجعة</span>`;
    return `<span class="chip chip-blocked">غير معتمد</span>`;
  }

  function renderItemCard(item) {
    // Hard guard: never render a card without source_reference + approved status.
    if (!item || item.verification_status !== 'approved') return '';
    if (!item.source_reference || String(item.source_reference).trim().length === 0) return '';
    return `
      <div class="card">
        <div class="card-title">${escapeHtml(item.title_ar || '')}</div>
        <div class="card-body">
          ${renderSourceBadge(item)} ${renderReviewStatus(item)}
        </div>
      </div>
    `;
  }

  function blockUnapprovedPublicDisplay(items) {
    if (!Array.isArray(items)) return [];
    return items.filter((it) => it && it.verification_status === 'approved'
                              && typeof it.source_reference === 'string'
                              && it.source_reference.trim().length > 0);
  }

  function renderUnavailableMessage(el) {
    if (el) el.innerHTML = `<div class="state-error">${ARABIC.unavailable}</div>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  window.Library = Object.freeze({
    ARABIC,
    loadLibraryStatus,
    loadCategories,
    loadApprovedItems,
    searchLibrary,
    renderSourceBadge,
    renderReviewStatus,
    renderUnavailableMessage,
    blockUnapprovedPublicDisplay,
  });
})();
