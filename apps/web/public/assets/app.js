/* Rahma/Sakina — frontend boot.
 * No framework. Arabic-RTL is set by the HTML root.
 * This file exposes a tiny API client + status renderer.
 *
 * No external CDN calls. No analytics. No tracking. Arabic-only UI strings.
 */

(function () {
  'use strict';

  const API_BASE = (() => {
    // Allow override via meta tag for staging deploys.
    const m = document.querySelector('meta[name="rahma-api-base"]');
    if (m && typeof m.getAttribute === 'function') {
      const v = m.getAttribute('content');
      if (v && v.length > 0) return v;
    }
    // Default: same origin (when frontend served from the backend host).
    return '';
  })();

  const ARABIC = Object.freeze({
    serviceUnavailable: 'الخدمة غير متاحة حالياً',
    loadingHealth: 'جارٍ التحقق من حالة الخدمة...',
    healthOk: 'الخدمة متصلة',
    engineFoundation: 'محرك التحكم: الأساس فقط',
    engineActive: 'محرك التحكم: مُفعَّل',
    ragFoundation: 'مكتبة المصادر: الأساس فقط',
    ragLive: 'مكتبة المصادر: متصلة',
    paymentDisabled: 'الدفع غير مفعل حالياً',
    networkError: 'تعذّر الاتصال بالخادم',
  });

  async function fetchJson(path) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'GET',
        headers: { 'accept': 'application/json' },
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
    el.innerHTML = `<div class="${cls}">${message}</div>`;
  }

  async function loadBackendStatus(container) {
    if (!container) return;
    container.innerHTML = `<div class="state-loading">${ARABIC.loadingHealth}</div>`;
    const [healthRes, readyRes, engineRes, ragRes] = await Promise.all([
      fetchJson('/health'),
      fetchJson('/ready'),
      fetchJson('/api/engine/status'),
      fetchJson('/api/rag/status'),
    ]);
    if (!healthRes.ok) {
      renderArabicState(container, 'error', ARABIC.serviceUnavailable);
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

  // Expose for inline page scripts.
  window.Rahma = Object.freeze({
    API_BASE,
    ARABIC,
    fetchJson,
    renderArabicState,
    loadBackendStatus,
  });

  // Auto-load status on any element with [data-rahma-status].
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.querySelector('[data-rahma-status]');
    if (el) loadBackendStatus(el).catch(() => {
      renderArabicState(el, 'error', ARABIC.serviceUnavailable);
    });
    // Tag the active bottom-nav link based on the current pathname.
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    document.querySelectorAll('.app-bottom-nav a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const norm = href.replace(/\/+$/, '') || '/';
      if (norm === path || norm + '.html' === path) {
        a.classList.add('active');
      }
    });
  });
})();
