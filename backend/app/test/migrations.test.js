import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'db', 'migrations');

async function read(name) {
  return fs.readFile(path.join(MIGRATIONS_DIR, name), 'utf8');
}

test('migration 002 file exists and is non-empty', async () => {
  const text = await read('002_verified_islamic_sources.sql');
  assert.ok(text.length > 200, 'migration 002 looks suspiciously short');
});

test('migration 002 declares the required tables', async () => {
  const text = await read('002_verified_islamic_sources.sql');
  for (const table of [
    'sakina_verified_sources',
    'sakina_source_documents',
    'sakina_source_chunks',
    'sakina_answer_audit',
  ]) {
    const re = new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}\\b`);
    assert.ok(re.test(text), `missing CREATE TABLE for ${table}`);
  }
});

test('migration 002 declares the required columns', async () => {
  const text = await read('002_verified_islamic_sources.sql');
  const required = {
    sakina_verified_sources: ['id', 'source_type', 'title', 'language', 'authority_level', 'publisher', 'url', 'license_status', 'verification_status', 'created_at', 'updated_at'],
    sakina_source_documents: ['id', 'source_id', 'title', 'document_ref', 'language', 'content_hash', 'verification_status', 'created_at'],
    sakina_source_chunks:    ['id', 'document_id', 'chunk_ref', 'chunk_text', 'language', 'citation_label', 'citation_url', 'verification_status', 'created_at'],
    sakina_answer_audit:     ['id', 'question_hash', 'scope', 'blocked', 'block_reason', 'source_count', 'created_at'],
  };
  for (const [table, cols] of Object.entries(required)) {
    // Capture the CREATE TABLE block until the matching ;
    const tableBlockRe = new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}[\\s\\S]*?\\);`, 'm');
    const m = text.match(tableBlockRe);
    assert.ok(m, `cannot extract CREATE TABLE block for ${table}`);
    for (const col of cols) {
      const colRe = new RegExp(`\\b${col}\\b`);
      assert.ok(colRe.test(m[0]), `${table} block missing column ${col}`);
    }
  }
});

test('migration 002 enforces only-approved retrieval at SQL level', async () => {
  // We can't run SQL here, but we can assert the migration encodes the rule.
  // The migration must include:
  //   - CHECK constraint for verification_status IN ('approved','pending','rejected')
  //   - An index restricted to verification_status = 'approved' on chunks
  const text = await read('002_verified_islamic_sources.sql');
  assert.ok(/CHECK \(verification_status IN \([^)]*'approved'/.test(text), 'verification_status CHECK missing or wrong');
  assert.ok(/WHERE verification_status = 'approved'/.test(text), 'partial-index on approved chunks missing');
});

test('migration 002 does NOT contain secrets, DSNs, or destructive commands', async () => {
  const text = await read('002_verified_islamic_sources.sql');
  // No DSN
  assert.ok(!/postgres(ql)?:\/\//.test(text), 'migration leaked a DSN');
  // No env-var leakage names with real values
  assert.ok(!/REPLACE_ME/.test(text),         'migration mentions REPLACE_ME placeholder');
  // No secret-shaped keys
  assert.ok(!/AKIA[0-9A-Z]{16}/.test(text),   'migration contains AWS key shape');
  assert.ok(!/ghp_[0-9A-Za-z]{36}/.test(text),'migration contains GitHub PAT shape');
  assert.ok(!/-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(text), 'migration contains private key block');
  // No destructive ops
  assert.ok(!/DROP\s+DATABASE/i.test(text),   'migration contains DROP DATABASE');
  assert.ok(!/DROP\s+SCHEMA/i.test(text),     'migration contains DROP SCHEMA');
  assert.ok(!/TRUNCATE\s+/i.test(text),       'migration contains TRUNCATE');
  assert.ok(!/DELETE\s+FROM\s+sakina_/i.test(text), 'migration contains DELETE FROM sakina_*');
});

test('migration 002 does NOT seed copyrighted religious content (no Sahih/Quran/Hadith/fatwa text rows)', async () => {
  const text = await read('002_verified_islamic_sources.sql');
  // The migration may NAME content kinds in CHECK constraints (allowed enums)
  // and MAY reference them in comments. It must NOT have any INSERT into
  // these tables (Sprint 5 is foundation-only).
  assert.ok(!/INSERT\s+INTO\s+sakina_/i.test(text), 'migration must not INSERT into any sakina_* table');
});

test('foundation migration 001 still exists (sanity)', async () => {
  const text = await read('001_sakina_foundation.sql');
  assert.ok(text.length > 200);
});
