import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from '../src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const APP_DIR = path.resolve(__dirname, '..');

// ---------- /ready DSN leak guard --------------------------------------------
test('/ready does not include DATABASE_URL value when set', async () => {
  const sentinel = 'postgres://leak_user:leak_pass@leak-host:5432/leak_db';
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = sentinel;
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const raw = res.body;
    assert.equal(res.statusCode, 200);
    assert.ok(!raw.includes('leak_user'),  '/ready leaked DATABASE_URL username');
    assert.ok(!raw.includes('leak_pass'),  '/ready leaked DATABASE_URL password');
    assert.ok(!raw.includes('leak-host'),  '/ready leaked DATABASE_URL host');
    assert.ok(!raw.includes('leak_db'),    '/ready leaked DATABASE_URL db name');
    assert.ok(!/postgres(ql)?:\/\//.test(raw), '/ready response contains a DSN substring');
  } finally {
    await app.close();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

test('/ready reports database.configured=true when DATABASE_URL is set; connected stays false', async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://x:y@example:5432/z';
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    assert.equal(body.database.configured, true);
    // Sprint 3 scaffold does not yet probe DB connectivity.
    assert.equal(body.database.connected, false);
  } finally {
    await app.close();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

// ---------- ibadat fail-closed -----------------------------------------------
test('/api/ibadat/ask returns blocked fallback for every in-scope category while source store is empty', async () => {
  const app = buildApp();
  const cases = [
    'كيف يكون الوضوء الصحيح؟',
    'متى يجب قضاء الصلاة؟',
    'ما حكم الصيام للمسافر؟',
    'ما نصاب الزكاة على المال؟',
    'ما واجبات الحج؟',
    'ما الفرق بين العمرة والحج؟',
    'ما الأذكار بعد الصلاة؟',
    'ما آداب تلاوة القرآن؟',
    'كم ركعة في صلاة الوتر؟',
    'متى تبدأ تراويح رمضان؟',
  ];
  try {
    for (const q of cases) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ibadat/ask',
        payload: { question: q, language: 'ar', scope: 'ibadat' },
      });
      const body = res.json();
      assert.equal(body.blocked, true, `expected blocked=true for: ${q}`);
      assert.deepEqual(body.sources, [], `expected zero sources for: ${q}`);
      assert.equal(
        body.answer,
        'لا أملك جواباً موثقاً لهذا السؤال حالياً. يرجى الرجوع إلى عالم موثوق.',
        `unexpected answer wording for: ${q}`,
      );
    }
  } finally {
    await app.close();
  }
});

// ---------- no fabricated religious citations in repo ------------------------
test('no fabricated Quran/Hadith/fiqh/scholar citation strings in backend src/', async () => {
  // The assistant must not ship with any hardcoded Islamic citation text.
  // Source bodies live in the database (Sprint 14/15). Anything in src/
  // that looks like a citation is a regression.
  const fabricated = [
    'صحيح البخاري رقم',
    'صحيح مسلم رقم',
    'سنن أبي داود رقم',
    'سنن الترمذي رقم',
    'سنن النسائي رقم',
    'سنن ابن ماجه رقم',
    'الموطأ رقم',
    'مسند أحمد رقم',
    'فتوى رقم',
    'قال الشيخ',
  ];
  const srcDir = path.join(APP_DIR, 'src');
  async function* walk(dir) {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) yield* walk(p);
      else if (e.name.endsWith('.js')) yield p;
    }
  }
  const failures = [];
  for await (const file of walk(srcDir)) {
    const text = await fs.readFile(file, 'utf8');
    for (const t of fabricated) {
      if (text.includes(t)) failures.push(`${file} contains "${t}"`);
    }
  }
  assert.deepEqual(failures, [], `Fabricated citation strings found in src/:\n  - ${failures.join('\n  - ')}`);
});

// ---------- no real secrets in repo (backend/app, deployment, .github) -------
test('no real secret values in backend/app, deployment, .github (only placeholders)', async () => {
  // We scan three roots for high-entropy or obviously real secret shapes.
  const roots = [
    path.join(REPO_ROOT, 'backend', 'app'),
    path.join(REPO_ROOT, 'deployment'),
    path.join(REPO_ROOT, '.github'),
  ];
  // Patterns that, when found WITHOUT a REPLACE_ME_ prefix and outside the
  // safety test itself, are highly suspicious.
  const realKeyPatterns = [
    /AKIA[0-9A-Z]{16}/,                                  // AWS access key
    /ghp_[0-9A-Za-z]{36}/,                               // GitHub PAT
    /xox[abp]-[0-9A-Za-z-]{10,}/,                        // Slack token
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/,                // private key blob
  ];
  async function* walk(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) yield* walk(p);
      else if (e.isFile()) yield p;
    }
  }
  const failures = [];
  for (const root of roots) {
    for await (const file of walk(root)) {
      const text = await fs.readFile(file, 'utf8');
      for (const re of realKeyPatterns) {
        if (re.test(text)) failures.push(`${file} matches ${re}`);
      }
    }
  }
  assert.deepEqual(failures, [], `Real-secret-shaped strings detected:\n  - ${failures.join('\n  - ')}`);
});
