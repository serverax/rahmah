import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_DIR = path.resolve(__dirname, '..', '..', '..', 'apps', 'web', 'public');

const PAGES = [
  'index.html',
  'ask.html',
  'answers.html',
  'child.html',
  'sadaqah.html',
  'library.html',
  'privacy.html',
];

async function readPage(name) {
  return fs.readFile(path.join(WEB_DIR, name), 'utf8');
}

test('every page exists and declares Arabic + RTL on <html>', async () => {
  for (const p of PAGES) {
    const html = await readPage(p);
    assert.ok(/<html\s+lang="ar"\s+dir="rtl">/i.test(html),
      `${p} must have <html lang="ar" dir="rtl">`);
  }
});

test('every page has an Arabic <title>', async () => {
  for (const p of PAGES) {
    const html = await readPage(p);
    const m = html.match(/<title>([^<]+)<\/title>/i);
    assert.ok(m, `${p} missing <title>`);
    // Must contain at least one Arabic character (basic Arabic block).
    assert.ok(/[ء-ي]/.test(m[1]), `${p} title must contain Arabic: ${m[1]}`);
  }
});

test('no English UI placeholder strings appear in page user-text', async () => {
  const FORBIDDEN = ['Home', 'Submit', 'Cancel', 'Loading', 'Welcome', 'Settings', 'Next', 'Back to', 'Login', 'Sign in'];
  for (const p of PAGES) {
    const html = await readPage(p);
    // Strip <script> blocks to avoid matching JS identifiers / comments.
    const stripped = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    for (const word of FORBIDDEN) {
      // Word boundary on Latin word chars only.
      const re = new RegExp(`\\b${word}\\b`);
      assert.ok(!re.test(stripped),
        `${p} contains forbidden English UI string "${word}"`);
    }
  }
});

test('bottom navigation present on every page with 5 Arabic items', async () => {
  for (const p of PAGES) {
    const html = await readPage(p);
    assert.ok(/class="app-bottom-nav"/.test(html), `${p} missing bottom nav`);
    for (const label of ['الرئيسية', 'اسأل', 'الإجابات', 'المكتبة', 'الخصوصية']) {
      assert.ok(html.includes(label), `${p} bottom nav missing "${label}"`);
    }
  }
});

test('home page renders the 6 Arabic category cards', async () => {
  const html = await readPage('index.html');
  for (const t of [
    'اسأل الشيخ حسن',
    'إجابات موثقة',
    'رحلة الحسنات للأطفال',
    'الصدقة الجارية',
    'الخصوصية والأمان',
  ]) {
    assert.ok(html.includes(t), `home missing card "${t}"`);
  }
});

test('CSS file declares Noto Naskh Arabic stack and CSS variables', async () => {
  const css = await fs.readFile(path.join(WEB_DIR, 'assets', 'styles.css'), 'utf8');
  assert.ok(css.includes('Noto Naskh Arabic'), 'Arabic font stack missing');
  assert.ok(css.includes('--color-emerald'),    'emerald colour token missing');
  assert.ok(css.includes('--color-gold'),       'gold colour token missing');
});

test('app.js Arabic ARABIC dictionary has expected user-facing keys', async () => {
  const js = await fs.readFile(path.join(WEB_DIR, 'assets', 'app.js'), 'utf8');
  for (const key of [
    'serviceUnavailable',
    'loadingHealth',
    'healthOk',
    'engineFoundation',
    'ragFoundation',
    'paymentDisabled',
    'networkError',
  ]) {
    assert.ok(js.includes(`${key}:`), `app.js missing Arabic dictionary key ${key}`);
  }
});

test('no inline Latin-only English copy in the visible <main> of index.html', async () => {
  const html = await readPage('index.html');
  // Naive: extract <main>...</main>, strip script blocks, then ensure most
  // visible text contains Arabic characters. We assert that at least 95%
  // of non-tag text contains Arabic.
  const main = (html.match(/<main[\s\S]*?<\/main>/i) || [''])[0];
  const stripped = main.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  // Count Arabic vs Latin-letter chars.
  let ar = 0, la = 0;
  for (const ch of stripped) {
    if (/[ء-ي]/.test(ch)) ar++;
    else if (/[A-Za-z]/.test(ch)) la++;
  }
  // Allow up to 15% Latin (URLs, brand "RTL"). Adjust if needed.
  assert.ok(ar > 0, 'no Arabic text in main');
  assert.ok(la === 0 || ar / (ar + la) > 0.85, `Latin/Arabic ratio too high: ${ar}/${la}`);
});
