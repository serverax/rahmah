import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, '..', '..', '..', 'apps', 'web', 'public');

const HOME_CARDS = [
  { label: 'اسأل الشيخ حسن', navCard: 'ask-sheikh', href: 'ask.html', file: 'ask.html' },
  { label: 'إجابات موثقة', navCard: 'verified-answers', href: 'answers.html', file: 'answers.html' },
  { label: 'القرآن الكريم', navCard: 'quran', href: 'library.html?category=quran', file: 'library.html' },
  { label: 'مصادر المحتوى', navCard: 'sources', href: 'sources.html', file: 'sources.html' },
];

function extractHomeCardHref(html, navCard) {
  const re = new RegExp(`href="([^"#]+)"[^>]*data-nav-card="${navCard}"`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

test('home page renders all four primary navigation cards', async () => {
  const html = await fs.readFile(path.join(WEB_DIR, 'index.html'), 'utf8');
  for (const card of HOME_CARDS) {
    assert.ok(html.includes(card.label), `home missing label "${card.label}"`);
    const href = extractHomeCardHref(html, card.navCard);
    assert.ok(href, `home missing link for "${card.label}"`);
    assert.ok(!href.startsWith('#'), `home card "${card.label}" uses dead hash link`);
    assert.equal(href, card.href, `home card "${card.label}" href mismatch`);
  }
});

test('home navigation targets exist and are real pages', async () => {
  for (const card of HOME_CARDS) {
    const target = card.file;
    await fs.access(path.join(WEB_DIR, target));
  }
});

test('home page does not show blocking service-unavailable error on load', async () => {
  const html = await fs.readFile(path.join(WEB_DIR, 'index.html'), 'utf8');
  assert.ok(html.includes('data-rahma-page="home"'), 'home must tag body for status handling');
  assert.ok(!html.includes('data-rahma-status'), 'home must not mount backend error banner');
  assert.ok(!html.includes('الخدمة غير متاحة حالياً'), 'home must not embed unavailable message');
});

test('app.js exposes service pill helpers for feature screens', async () => {
  const js = await fs.readFile(path.join(WEB_DIR, 'assets', 'app.js'), 'utf8');
  assert.ok(js.includes('servicePillTitle'), 'app.js missing servicePillTitle');
  assert.ok(js.includes('renderServiceUnavailablePill'), 'app.js missing renderServiceUnavailablePill');
  assert.ok(js.includes('escapeHtml'), 'app.js missing escapeHtml');
});

test('answers page keeps local samples when API unavailable', async () => {
  const html = await fs.readFile(path.join(WEB_DIR, 'answers.html'), 'utf8');
  assert.ok(html.includes('renderServiceUnavailablePill'), 'answers must use in-screen pill');
  assert.ok(html.includes('staticSamples'), 'answers must ship local fallback content');
});
