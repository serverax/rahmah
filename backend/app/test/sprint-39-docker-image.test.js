import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = path.resolve(__dirname, '..');

test('Sprint39 — backend Dockerfile exists', async () => {
  const dockerfile = path.join(APP_ROOT, 'Dockerfile');
  const st = await fs.stat(dockerfile);
  assert.ok(st.isFile());
});

test('Sprint39 — Dockerfile uses non-root USER directive', async () => {
  const dockerfile = path.join(APP_ROOT, 'Dockerfile');
  const raw = await fs.readFile(dockerfile, 'utf8');
  // Must include a USER directive AND that USER must not be "root".
  assert.ok(/^USER\s+/m.test(raw), 'Dockerfile missing USER directive');
  assert.ok(!/^USER\s+root\b/mi.test(raw), 'Dockerfile must not USER root');
});

test('Sprint39 — Dockerfile installs production-only dependencies', async () => {
  const dockerfile = path.join(APP_ROOT, 'Dockerfile');
  const raw = await fs.readFile(dockerfile, 'utf8');
  // We expect one of: --omit=dev, --production, or NODE_ENV=production npm ci.
  const hasOmit = /--omit=dev|--production/.test(raw);
  assert.ok(hasOmit, 'Dockerfile must keep dev deps out of the runtime image');
});

test('Sprint39 — Dockerfile defines a HEALTHCHECK', async () => {
  const dockerfile = path.join(APP_ROOT, 'Dockerfile');
  const raw = await fs.readFile(dockerfile, 'utf8');
  assert.ok(/HEALTHCHECK\b/.test(raw), 'Dockerfile must declare HEALTHCHECK');
});

test('Sprint39 — Dockerfile does NOT COPY .env files', async () => {
  const dockerfile = path.join(APP_ROOT, 'Dockerfile');
  const raw = await fs.readFile(dockerfile, 'utf8');
  // Forbid COPY of any env file or directory.
  assert.ok(!/COPY\b[^\n]*\.env\b/i.test(raw), 'Dockerfile must not COPY .env');
  assert.ok(!/COPY\b[^\n]*\.npmrc\b/i.test(raw), 'Dockerfile must not COPY .npmrc');
});

test('Sprint39 — .dockerignore excludes secrets and dev artefacts', async () => {
  const di = path.join(APP_ROOT, '.dockerignore');
  const raw = await fs.readFile(di, 'utf8');
  // Required exclusions
  for (const required of ['node_modules', '.git', '.env']) {
    assert.ok(raw.includes(required), `.dockerignore missing ${required}`);
  }
});

test('Sprint39 — repo: no obvious hardcoded credential literals in src/', async () => {
  // Spot-check for known dangerous patterns. Not exhaustive — CI scanner has more.
  const banned = [
    /aws[_-]?secret[_-]?access[_-]?key/i,
    /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
  ];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && /\.(js|json|md|yml|yaml|env)$/i.test(e.name)) {
        const raw = await fs.readFile(full, 'utf8');
        for (const pat of banned) {
          assert.ok(!pat.test(raw), `banned credential pattern found in ${full}`);
        }
      }
    }
  }
  await walk(path.join(APP_ROOT, 'src'));
});

test('Sprint39 — no external LLM dependency declared in package.json', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(APP_ROOT, 'package.json'), 'utf8'));
  const all = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
  for (const b of ['openai', '@anthropic-ai/sdk', '@google/generative-ai', 'langchain', 'llamaindex']) {
    assert.ok(!all.includes(b), `package.json must not depend on ${b}`);
  }
});
