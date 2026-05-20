import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const filePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public', 'assets', 'library.js');
let s = fs.readFileSync(filePath, 'utf8');
const oldFn = `  function renderUnavailableMessage(el) {
    if (el) el.innerHTML = \`<motion class="state-error">\${ARABIC.unavailable}</motion>\`;
  }`;
const newFn = `  function renderUnavailableMessage(el) {
    if (!el) return;
    if (window.Rahma && typeof window.Rahma.renderServiceUnavailablePill === 'function') {
      window.Rahma.renderServiceUnavailablePill(el);
      return;
    }
    el.innerHTML = '<div class="rahma-service-pill"><strong>غير متاح مؤقتاً</strong><span>سيتم تفعيل الخدمة قريباً بإذن الله</span></div>';
  }`;

const tag = 'div';
const oldFn2 = `  function renderUnavailableMessage(el) {
    if (el) el.innerHTML = \`<${tag} class="state-error">\${ARABIC.unavailable}</${tag}>\`;
  }`;

if (!s.includes('function renderUnavailableMessage')) {
  console.error('renderUnavailableMessage missing');
  process.exit(1);
}

s = s.replace(oldFn2, newFn);
fs.writeFileSync(filePath, s);
console.log('library.js patched');
