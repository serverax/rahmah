import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const p = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public', 'answers.html');
let s = fs.readFileSync(p, 'utf8');

const script = `  <script>
    (async function () {
      const listEl = document.getElementById('answersList');
      const statusEl = document.getElementById('answersApiStatus');
      if (!window.Rahma) return;
      const R = window.Rahma;
      const staticSamples = [
        {
          question_text_ar: 'كيف أحافظ على الصلاة في وقتها؟',
          answer_text_ar: 'ابدأ بتثبيت تذكير لكل صلاة، واختر صحبة تعينك، واجعل قضاء الصلاة الفائتة دافعاً لا سبباً لليأس.',
          category_id: 'الصلاة',
        },
        {
          question_text_ar: 'هل يمكنني قراءة الأذكار من الهاتف؟',
          answer_text_ar: 'نعم، قراءة الأذكار من الهاتف جائزة، والمقصود حضور القلب والمحافظة على الذكر.',
          category_id: 'الأذكار',
        },
      ];
      function renderItems(items) {
        listEl.innerHTML = items.map((a) => \`
          <div class="card-3d" style="margin-bottom: 16px;">
            <div style="color: var(--rahma-emerald); font-weight: 600; margin-bottom: 8px;">سؤال:</div>
            <p style="margin-top: 0; font-family: var(--font-heading); font-size: 1.2rem;">\${R.escapeHtml(a.question_text_ar || a.question || '')}</p>
            <hr style="border: 0; border-top: 1px dashed rgba(15,118,110,0.2); margin: 12px 0;">
            <motion style="color: var(--rahma-emerald-dark); font-weight: 600; margin-bottom: 8px;">إجابة الشيخ حسن:</motion>
            <p style="margin-top: 0;">\${R.escapeHtml(a.answer_text_ar || a.answer || '')}</p>
            <div style="margin-top: 12px; font-size: 0.8rem; color: var(--rahma-ink-muted);">
              التصنيف: \${R.escapeHtml(a.category_id || 'عام')}
            </div>
          </div>
        \`).join('');
      }
      try {
        const res = await R.fetchJson('/api/ask-sheikh/public');
        if (!res.ok) {
          R.renderServiceUnavailablePill(statusEl);
          renderItems(staticSamples);
          return;
        }
        const items = Array.isArray(res.body.items) ? res.body.items : [];
        if (items.length === 0) {
          listEl.innerHTML = '<div class="state-empty">لا توجد إجابات منشورة حالياً.</div>';
          return;
        }
        renderItems(items);
      } catch (_err) {
        R.renderServiceUnavailablePill(statusEl);
        renderItems(staticSamples);
      }
    })();
  </script>`;

const fixed = script.replaceAll('motion', 'div');
s = s.replace(/  <script>[\s\S]*?  <\/script>\n<\/body>/, `${fixed}\n</body>`);
fs.writeFileSync(p, s);
console.log('patched answers.html');
