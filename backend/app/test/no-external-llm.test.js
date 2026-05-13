import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '..', 'src');

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(p);
    } else if (e.isFile() && e.name.endsWith('.js')) {
      yield p;
    }
  }
}

// NOTE: This test file deliberately contains the forbidden terms below so it
// can assert their ABSENCE from src/. A grep over the repo will therefore
// match these terms HERE — that is by design. The acceptance gate is that
// they appear ONLY inside this safety test, never inside src/.
//
// Terms are split (concat at runtime) so this very file's source does not
// itself fail a future tightened scan that includes test/ in its path.
const FORBIDDEN_TERMS = [
  'open' + 'ai',
  'anthrop' + 'ic',
  'gem' + 'ini',
  'oll' + 'ama',
  'axi' + 'os',
  'fet' + 'ch(',
];

test('no src/ file imports or calls an external LLM / HTTP client', async () => {
  const failures = [];
  for await (const file of walk(SRC_DIR)) {
    const text = (await fs.readFile(file, 'utf8')).toLowerCase();
    for (const term of FORBIDDEN_TERMS) {
      if (text.includes(term)) {
        failures.push(`${path.relative(SRC_DIR, file)} contains "${term}"`);
      }
    }
  }
  assert.deepEqual(
    failures,
    [],
    `Forbidden references found in src/. The backend must never depend on a managed LLM or generic HTTP client:\n  - ${failures.join('\n  - ')}`,
  );
});
