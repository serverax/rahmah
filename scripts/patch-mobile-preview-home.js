import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '..', 'apps', 'web', 'public', 'test-ui', 'mobile-preview.html');
let s = fs.readFileSync(filePath, 'utf8');

const tag = 'div';
const replacement = [
  '              <div class="feature-grid" style="padding: 10px;">',
  `                <a href="/ask.html" class="feature-btn feature-nav-card" aria-label="اسأل الشيخ حسن"><${tag} class="icon">💬</${tag}><span>اسأل الشيخ حسن</span></a>`,
  `                <a href="/answers.html" class="feature-btn feature-nav-card" aria-label="إجابات موثقة"><${tag} class="icon">📝</${tag}><span>إجابات موثقة</span></a>`,
  `                <a href="/library.html?category=quran" class="feature-btn feature-nav-card" aria-label="القرآن الكريم"><${tag} class="icon">📖</${tag}><span>القرآن الكريم</span></a>`,
  `                <a href="/sources.html" class="feature-btn feature-nav-card" aria-label="مصادر المحتوى"><${tag} class="icon">🔊</${tag}><span>مصادر المحتوى</span></a>`,
  '              </div>',
  '            </main>',
].join('\n');

const re = /              <div class="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px;">[\s\S]*?            <\/main>/;
if (!re.test(s)) {
  console.error('home grid block not found');
  process.exit(1);
}
s = s.replace(re, replacement);
s = s.replace('<a href="#" class="active">الرئيسية</a>', '<a href="/index.html" class="active">الرئيسية</a>');
s = s.replace('<a href="#">اسأل</a>', '<a href="/ask.html">اسأل</a>');
s = s.replace('<a href="#">المكتبة</a>', '<a href="/library.html">المكتبة</a>');

fs.writeFileSync(filePath, s);
console.log('patched', filePath);
