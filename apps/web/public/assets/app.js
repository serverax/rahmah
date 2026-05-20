/* Rahma/Sakina — frontend boot.
 * No framework. Arabic-RTL is set by the HTML root.
 * This file exposes a tiny API client + status renderer.
 *
 * No external CDN calls. No analytics. No tracking. Arabic-only UI strings.
 */

(function () {
  'use strict';

  const API_BASE = (() => {
    const m = document.querySelector('meta[name="rahma-api-base"]');
    if (m && typeof m.getAttribute === 'function') {
      const v = m.getAttribute('content');
      if (v && v.length > 0) return v;
    }
    return '';
  })();

  const ARABIC = Object.freeze({
    serviceUnavailable: 'الخدمة غير متاحة حالياً',
    servicePillTitle: 'غير متاح مؤقتاً',
    servicePillSubtitle: 'سيتم تفعيل الخدمة قريباً بإذن الله',
    loadingHealth: 'جارٍ التحقق من حالة الخدمة...',
    healthOk: 'الخدمة متصلة',
    engineFoundation: 'محرك التحكم: الأساس فقط',
    engineActive: 'محرك التحكم: مُفعَّل',
    ragFoundation: 'مكتبة المصادر: الأساس فقط',
    ragLive: 'مكتبة المصادر: متصلة',
    paymentDisabled: 'الدفع غير مفعل حالياً',
    networkError: 'تعذّر الاتصال بالخادم',
  });

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function serviceUnavailablePillHtml() {
    return `<div class="rahma-service-pill" role="status" aria-live="polite">
      <span class="rahma-service-pill__dot" aria-hidden="true"></span>
      <span class="rahma-service-pill__text">
        <strong>${ARABIC.servicePillTitle}</strong>
        <span>${ARABIC.servicePillSubtitle}</span>
      </span>
    </div>`;
  }

  async function fetchJson(path, options) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: (options && options.method) || 'GET',
        headers: {
          accept: 'application/json',
          ...((options && options.headers) || {}),
        },
        body: options && options.body,
      });
      if (!res.ok) return { ok: false, status: res.status, error: 'http_error' };
      const body = await res.json();
      return { ok: true, body };
    } catch {
      return { ok: false, status: 0, error: 'network_error' };
    }
  }

  function renderArabicState(el, kind, message) {
    if (!el) return;
    const cls = kind === 'error' ? 'state-error' : (kind === 'loading' ? 'state-loading' : 'state-empty');
    el.innerHTML = `<div class="${cls}">${escapeHtml(message)}</div>`;
  }

  function renderServiceUnavailablePill(el) {
    if (!el) return;
    el.innerHTML = serviceUnavailablePillHtml();
  }

  async function loadBackendStatus(container) {
    if (!container) return;
    const isHome = document.body && document.body.dataset && document.body.dataset.rahmaPage === 'home';
    container.innerHTML = `<span class="chip chip-loading">${ARABIC.loadingHealth}</span>`;
    const [healthRes, engineRes, ragRes] = await Promise.all([
      fetchJson('/health'),
      fetchJson('/api/engine/status'),
      fetchJson('/api/rag/status'),
    ]);
    if (!healthRes.ok) {
      if (isHome) {
        container.innerHTML = '';
        return;
      }
      renderServiceUnavailablePill(container);
      return;
    }
    const chips = [];
    chips.push(`<span class="chip chip-success">${ARABIC.healthOk}</span>`);
    if (engineRes.ok && engineRes.body && engineRes.body.engine_implemented === true) {
      chips.push(`<span class="chip chip-success">${ARABIC.engineActive}</span>`);
    } else {
      chips.push(`<span class="chip chip-moderation">${ARABIC.engineFoundation}</span>`);
    }
    if (ragRes.ok && ragRes.body && ragRes.body.safe_to_answer_from_rag === true) {
      chips.push(`<span class="chip chip-success">${ARABIC.ragLive}</span>`);
    } else {
      chips.push(`<span class="chip chip-moderation">${ARABIC.ragFoundation}</span>`);
    }
    container.innerHTML = chips.join(' ');
  }

  window.Rahma = Object.freeze({
    API_BASE,
    ARABIC,
    escapeHtml,
    fetchJson,
    renderArabicState,
    renderServiceUnavailablePill,
    loadBackendStatus,
    serviceUnavailablePillHtml,
  });

  document.addEventListener('DOMContentLoaded', () => {
    const el = document.querySelector('[data-rahma-status]');
    if (el) {
      loadBackendStatus(el).catch(() => {
        const isHome = document.body && document.body.dataset && document.body.dataset.rahmaPage === 'home';
        if (!isHome) renderServiceUnavailablePill(el);
        else el.innerHTML = '';
      });
    }
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const file = path.split('/').pop() || 'index.html';
    document.querySelectorAll('.app-bottom-nav a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const norm = href.replace(/^\//, '').replace(/\/+$/, '') || 'index.html';
      const current = file === '' ? 'index.html' : file;
      if (norm === current || norm === path.replace(/^\//, '')) {
        a.classList.add('active');
      }
    });
  });
})();
