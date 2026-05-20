import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const p = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public', 'ask.html');
let html = fs.readFileSync(p, 'utf8');

const script = `  <script src="/assets/app.js"></script>
  <script>
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function sourceCardHtml(c) {
      return \`
        <div class="source-card">
          <strong>\${escapeHtml(c.source_title || c.source_id || 'مصدر معتمد')}</strong>
          <motion class="source-meta">
            <span class="chip chip-success">\${escapeHtml(c.source_type || 'source')}</span>
            <span class="chip chip-pending">\${escapeHtml(c.reference_label || c.citation_label || 'مرجع')}</span>
          </motion>
          <small>\${escapeHtml(c.local_reference || c.url || '')}</small>
        </motion>\`;
    }

    async function loadCategories() {
      const select = document.getElementById('qcategory');
      if (!select || !window.Rahma) return;
      const r = await window.Rahma.fetchJson('/api/library/categories');
      if (!r.ok || !r.body || !Array.isArray(r.body.categories)) return;
      for (const c of r.body.categories) {
        const id = c.id || c.slug;
        const label = c.name_ar || c.label_ar || id;
        if (!id || !label) continue;
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = label;
        select.appendChild(opt);
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      loadCategories().catch(() => {});
    });

    document.getElementById('askForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const result = document.getElementById('askResult');
      const question = document.getElementById('qtext').value.trim();
      const publicAllowed = document.getElementById('qpublic').checked;
      if (question.length < 5) {
        result.innerHTML = '<div class="state-error">السؤال قصير جداً. اكتبوا سؤالاً أوضح (٥ أحرف على الأقل).</div>';
        return;
      }
      result.innerHTML = '<motion style="color: var(--rahma-emerald); font-weight: bold;">جارٍ الإرسال...</motion>';
      const parts = [];

      try {
        const submitRes = await fetch(\`\${window.Rahma.API_BASE}/api/ask-sheikh/questions\`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            language: 'ar',
            question_text_ar: question,
            display_language_preference: 'ar',
            is_anonymous: true,
          }),
        });
        const submitBody = await submitRes.json().catch(() => ({}));
        if (submitRes.status === 503 || submitBody.error === 'service_not_configured') {
          parts.push(window.Rahma.serviceUnavailablePillHtml());
        } else if (submitRes.ok && submitBody.ok === true) {
          parts.push(\`<div class="card-3d" style="padding:16px;text-align:right;"><span class="chip chip-success">تم استلام السؤال</span><p>رقم المرجع: \${escapeHtml(submitBody.question_id || '—')}</p><p style="color:var(--rahma-ink-muted);font-size:0.9rem;">سيُراجع الشيخ حسن السؤال. النشر العام: \${publicAllowed ? 'بموافقتكم' : 'خاص'}.</p></div>\`);
        } else {
          parts.push(\`<motion class="state-empty">لم يُحفظ السؤال في الخادم: \${escapeHtml(submitBody.error || submitBody.message_ar || String(submitRes.status))}</motion>\`);
        }
      } catch (_err) {
        parts.push(window.Rahma.serviceUnavailablePillHtml());
      }

      try {
        const ragRes = await fetch(\`\${window.Rahma.API_BASE}/api/rag/query\`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ question_ar: question, language: 'ar', use_live_rag: true }),
        });
        const body = await ragRes.json().catch(() => ({}));
        if (body.safety_status === 'verified_sources' && body.ok) {
          const citations = Array.isArray(body.citations) ? body.citations : [];
          parts.push(\`<div class="card-3d" style="padding:16px;text-align:right;margin-top:12px;"><span class="chip chip-success">مصادر موثقة (إرشاد فوري)</span><p class="ayah-text" style="font-size:1.1rem;">\${escapeHtml(body.answer_ar || body.answer || '')}</p>\${citations.map(sourceCardHtml).join('') || '<p class="state-empty">لا توجد إحالة معروضة.</p>'}</div>\`);
        } else if (body.safety_status === 'scholar_review_required') {
          parts.push('<div class="card-3d" style="padding:16px;margin-top:12px;"><span class="chip chip-moderation">scholar_review_required</span><p>هذه المسألة تحتاج مراجعة الشيخ. لن نعرض جواباً آلياً.</p></div>');
        } else if (body.safety_status === 'blocked_prompt_injection') {
          parts.push('<div class="card-3d" style="padding:16px;margin-top:12px;"><span class="chip chip-blocked">blocked_prompt_injection</span><p>تم حظر الطلب لحماية المصادر.</p></div>');
        } else if (body.safety_status === 'insufficient_sources') {
          parts.push('<div class="card-3d" style="padding:16px;margin-top:12px;"><span class="chip chip-moderation">insufficient_sources</span><p>لا توجد مصادر معتمدة كافية لعرض إجابة الآن.</p></div>');
        }
      } catch (_ragErr) {
        /* RAG optional; question submit outcome already shown */
      }

      result.innerHTML = parts.join('') || window.Rahma.serviceUnavailablePillHtml();
      if (parts.some((p) => p.includes('تم استلام السؤال'))) {
        document.getElementById('askForm').reset();
      }
    });
  </script>`;

const fixed = script.replaceAll('motion', 'div');
html = html.replace(/  <script src="\/assets\/app\.js"><\/script>[\s\S]*<\/script>\s*<\/body>/, `${fixed}\n</body>`);
fs.writeFileSync(p, html);
console.log('patched ask.html');
